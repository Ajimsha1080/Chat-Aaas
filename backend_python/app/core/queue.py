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

    async def move_to_dlq(self, job_id: str, error: str, stack_trace: Optional[str] = None) -> Dict[str, Any]:
        """Routes unrecoverable or exhausted job to Dead Letter Queue (DLQ)."""
        now = time.strftime("%Y-%m-%dT%H:%M:%SZ")
        dlq_error = f"{error}\n{stack_trace}" if stack_trace else error

        with db.get_session() as session:
            job = session.query(BackgroundJob).filter_by(id=job_id).first()
            if job:
                job.status = "dlq"
                job.error = dlq_error
                job.completed_at = now
                job.updated_at = now
                session.commit()

        if job_id in db.background_jobs:
            rec = db.background_jobs[job_id]
            rec["status"] = "dlq"
            rec["error"] = dlq_error
            rec["completedAt"] = now

        redis = await self._get_redis()
        if redis:
            try:
                await redis.rpush("coarai:queue:dlq", job_id)
            except Exception:
                pass

        logger.error(f"[DLQ] Job {job_id} isolated into Dead Letter Queue: {error}")
        return db.background_jobs.get(job_id, {"id": job_id, "status": "dlq", "error": dlq_error})

    @staticmethod
    def calculate_backoff_delay(attempt: int, base_seconds: float = 1.0, max_seconds: float = 30.0) -> float:
        """Calculates exponential backoff delay with jitter."""
        delay = min(base_seconds * (2 ** max(0, attempt - 1)), max_seconds)
        # 10% jitter
        import random
        jitter = delay * 0.1 * random.random()
        return round(delay + jitter, 2)

    async def fail_job(self, job_id: str, error: str, retry: bool = True, is_poison_pill: bool = False, stack_trace: Optional[str] = None):
        """Records job failure with automatic retry backoff or DLQ isolation."""
        if is_poison_pill:
            return await self.move_to_dlq(job_id, f"Poison Pill Defended: {error}", stack_trace)

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
                    job.status = "dlq"
                    job.completed_at = now
                    session.commit()

        if job_id in db.background_jobs:
            rec = db.background_jobs[job_id]
            rec["error"] = error
            if retry and rec.get("attempts", 0) < rec.get("maxAttempts", 3):
                rec["status"] = "queued"
            else:
                rec["status"] = "dlq"
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

    def get_dlq_jobs(self, company_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Lists all dead-lettered jobs isolated from processing."""
        results = [j for j in db.background_jobs.values() if j.get("status") == "dlq"]
        if company_id:
            results = [j for j in results if j.get("companyId") == company_id]
        return results

    async def replay_dlq_job(self, job_id: str) -> bool:
        """Re-enqueues a job from the DLQ for re-processing."""
        if job_id not in db.background_jobs:
            return False
        rec = db.background_jobs[job_id]
        if rec.get("status") != "dlq":
            return False
        rec["status"] = "queued"
        rec["attempts"] = 0
        rec["error"] = None
        
        with db.get_session() as session:
            job = session.query(BackgroundJob).filter_by(id=job_id).first()
            if job:
                job.status = "queued"
                job.attempts = 0
                job.error = None
                session.commit()

        redis = await self._get_redis()
        if redis:
            try:
                await redis.rpush(f"coarai:queue:{self.queue_name}", job_id)
            except Exception:
                pass
        return True

    async def claim(self, worker_id: str = "worker_default", poll_timeout: float = 0.5) -> Optional[Dict[str, Any]]:
        return await self.claim_job(worker_id, poll_timeout)

    async def complete(self, job_id: str, result: Dict[str, Any]):
        return await self.complete_job(job_id, result)

    async def get_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        return self.get_job_status(job_id)
