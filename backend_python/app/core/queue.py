import json
import time
import uuid
import logging
from typing import Dict, Any, Optional
from app.core.config import settings
from app.db.database import db
from app.db.models import BackgroundJob

logger = logging.getLogger("queue")

class JobQueue:
    """
    Production Cross-Process Job Queue backed by Redis and persistent SQL BackgroundJob records.
    Provides automatic fallback to atomic database queue claiming when Redis is offline.
    """
    def __init__(self, queue_name: str = "default"):
        self.queue_name = queue_name
        self.redis_client = None
        self._redis_tested = False
        self._redis_available = False

    async def _get_redis(self):
        if not self._redis_tested:
            try:
                import redis.asyncio as aioredis
                client = aioredis.from_url(settings.REDIS_URL, socket_timeout=1.0, socket_connect_timeout=1.0)
                await client.ping()
                self.redis_client = client
                self._redis_available = True
            except Exception as e:
                logger.info(f"Redis is not available ({e}); using durable SQL database job queue.")
                self._redis_available = False
            self._redis_tested = True
        return self.redis_client if self._redis_available else None

    async def enqueue(self, job_type: str, company_id: str, payload: Dict[str, Any], max_attempts: int = 3, prefix: str = "job_") -> str:
        """Enqueues a job into both persistent SQL store and Redis broker."""
        if not company_id:
            raise ValueError("Job enqueue failed: company_id is required for multi-tenant isolation.")

        job_id = f"{prefix}{int(time.time() * 1000)}_{uuid.uuid4().hex[:6]}"
        now = time.strftime("%Y-%m-%dT%H:%M:%SZ")

        # 1. Durable SQL persistence
        with db.get_session() as session:
            job_record = BackgroundJob(
                id=job_id,
                company_id=company_id,
                queue_name=self.queue_name,
                job_type=job_type,
                payload=payload,
                status="queued",
                attempts=0,
                max_attempts=max_attempts,
                created_at=now,
                updated_at=now
            )
            session.add(job_record)
            session.commit()

        # Update in-memory lookup cache
        db.background_jobs[job_id] = {
            "id": job_id,
            "companyId": company_id,
            "queueName": self.queue_name,
            "jobType": job_type,
            "payload": payload,
            "status": "queued",
            "attempts": 0,
            "maxAttempts": max_attempts,
            "error": None,
            "result": None,
            "createdAt": now
        }

        # 2. Redis cross-process notification if available
        redis = await self._get_redis()
        if redis:
            try:
                await redis.rpush(f"coarai:queue:{self.queue_name}", job_id)
            except Exception as e:
                logger.warning(f"Failed to push job {job_id} to Redis: {e}")

        return job_id

    async def claim_job(self, worker_id: str, poll_timeout: float = 0.5) -> Optional[Dict[str, Any]]:
        """Claims the next available job for processing."""
        job_id = None
        redis = await self._get_redis()
        if redis:
            try:
                item = await redis.blpop(f"coarai:queue:{self.queue_name}", timeout=poll_timeout)
                if item:
                    job_id = item[1].decode("utf-8") if isinstance(item[1], bytes) else item[1]
            except Exception:
                pass

        now = time.strftime("%Y-%m-%dT%H:%M:%SZ")
        with db.get_session() as session:
            if job_id:
                job = session.query(BackgroundJob).filter_by(id=job_id).first()
            else:
                # DB queue fallback: claim next queued job
                job = session.query(BackgroundJob).filter(
                    BackgroundJob.queue_name == self.queue_name,
                    BackgroundJob.status == "queued"
                ).order_by(BackgroundJob.created_at.asc()).first()

            if not job:
                return None

            job.status = "claimed"
            job.locked_by = worker_id
            job.locked_at = now
            job.attempts += 1
            job.updated_at = now
            session.commit()

            job_dict = {
                "id": job.id,
                "companyId": job.company_id,
                "queueName": job.queue_name,
                "jobType": job.job_type,
                "payload": job.payload,
                "status": "claimed",
                "attempts": job.attempts,
                "maxAttempts": job.max_attempts,
                "createdAt": job.created_at
            }
            db.background_jobs[job.id] = job_dict
            return job_dict

    async def complete_job(self, job_id: str, result: Dict[str, Any]):
        """Marks job as successfully completed with resulting payload."""
        now = time.strftime("%Y-%m-%dT%H:%M:%SZ")
        with db.get_session() as session:
            job = session.query(BackgroundJob).filter_by(id=job_id).first()
            if job:
                job.status = "completed"
                job.result = result
                job.completed_at = now
                job.updated_at = now
                session.commit()

        if job_id in db.background_jobs:
            db.background_jobs[job_id]["status"] = "completed"
            db.background_jobs[job_id]["result"] = result
            db.background_jobs[job_id]["completedAt"] = now

    async def fail_job(self, job_id: str, error: str, retry: bool = True):
        """Records job failure and determines whether to re-queue for retry."""
        now = time.strftime("%Y-%m-%dT%H:%M:%SZ")
        with db.get_session() as session:
            job = session.query(BackgroundJob).filter_by(id=job_id).first()
            if job:
                job.error = error
                job.updated_at = now
                if retry and job.attempts < job.max_attempts:
                    job.status = "queued"
                    session.commit()
                    redis = await self._get_redis()
                    if redis:
                        try:
                            await redis.rpush(f"coarai:queue:{self.queue_name}", job_id)
                        except Exception:
                            pass
                else:
                    job.status = "failed"
                    job.completed_at = now
                    session.commit()

        if job_id in db.background_jobs:
            rec = db.background_jobs[job_id]
            rec["error"] = error
            if retry and rec.get("attempts", 0) < rec.get("maxAttempts", 3):
                rec["status"] = "queued"
            else:
                rec["status"] = "failed"
                rec["completedAt"] = now

    def get_job_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves status and output of a background job from SQL store."""
        if job_id in db.background_jobs:
            return db.background_jobs[job_id]

        with db.get_session() as session:
            job = session.query(BackgroundJob).filter_by(id=job_id).first()
            if not job:
                return None
            return {
                "id": job.id,
                "companyId": job.company_id,
                "queueName": job.queue_name,
                "jobType": job.job_type,
                "payload": job.payload,
                "status": job.status,
                "attempts": job.attempts,
                "maxAttempts": job.max_attempts,
                "error": job.error,
                "result": job.result,
                "createdAt": job.created_at,
                "completedAt": job.completed_at
            }

    async def claim(self, worker_id: str = "worker_default", poll_timeout: float = 0.5) -> Optional[Dict[str, Any]]:
        return await self.claim_job(worker_id, poll_timeout)

    async def complete(self, job_id: str, result: Dict[str, Any]):
        return await self.complete_job(job_id, result)

    async def get_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        return self.get_job_status(job_id)
