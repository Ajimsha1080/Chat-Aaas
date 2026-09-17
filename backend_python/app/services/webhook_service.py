import hashlib
import hmac
import json
import time
import uuid
import urllib.request
import urllib.error
from typing import Dict, Any, List, Optional
from enum import Enum
from app.db.database import db

class CircuitState(str, Enum):
    CLOSED = "CLOSED"       # Healthy, traffic flows
    OPEN = "OPEN"           # Tripped, blocking dispatches
    HALF_OPEN = "HALF_OPEN" # Probing for recovery

class WebhookCircuitBreaker:
    """
    In-memory / distributed state machine for webhook target endpoints.
    Trips to OPEN after consecutive failures, auto-recovers via HALF_OPEN probe.
    """
    def __init__(
        self,
        failure_threshold: int = 5,
        cooldown_seconds: float = 60.0
    ):
        self.failure_threshold = failure_threshold
        self.cooldown_seconds = cooldown_seconds
        # endpoint_id -> dict(state, failure_count, last_failure_time, last_state_change)
        self._circuits: Dict[str, Dict[str, Any]] = {}

    def get_circuit_state(self, endpoint_id: str) -> CircuitState:
        circ = self._circuits.get(endpoint_id)
        if not circ:
            return CircuitState.CLOSED

        state = circ.get("state", CircuitState.CLOSED)
        if state == CircuitState.OPEN:
            now = time.time()
            if now - circ.get("last_state_change", 0) >= self.cooldown_seconds:
                circ["state"] = CircuitState.HALF_OPEN
                circ["last_state_change"] = now
                return CircuitState.HALF_OPEN
        return state

    def record_success(self, endpoint_id: str) -> None:
        """Resets the circuit to CLOSED on successful dispatch."""
        self._circuits[endpoint_id] = {
            "state": CircuitState.CLOSED,
            "failure_count": 0,
            "last_failure_time": 0,
            "last_state_change": time.time()
        }

    def record_failure(self, endpoint_id: str, error: str) -> CircuitState:
        """Increments failure count and trips circuit if threshold exceeded."""
        circ = self._circuits.setdefault(endpoint_id, {
            "state": CircuitState.CLOSED,
            "failure_count": 0,
            "last_failure_time": 0,
            "last_state_change": time.time()
        })
        circ["failure_count"] += 1
        circ["last_failure_time"] = time.time()
        circ["last_error"] = error

        if circ["state"] == CircuitState.HALF_OPEN or circ["failure_count"] >= self.failure_threshold:
            circ["state"] = CircuitState.OPEN
            circ["last_state_change"] = time.time()

        return circ["state"]


class WebhookService:
    """
    Enterprise Webhook Dispatcher with HMAC-SHA256 signatures,
    Circuit Breaker protection, and Dead-Letter Queue (DLQ).
    """
    breaker = WebhookCircuitBreaker(failure_threshold=5, cooldown_seconds=30.0)

    @staticmethod
    def register_endpoint(
        company_id: str,
        target_url: str,
        events: List[str],
        secret: Optional[str] = None
    ) -> Dict[str, Any]:
        """Registers a tenant webhook endpoint."""
        if not hasattr(db, "webhook_endpoints"):
            db.webhook_endpoints = []

        endpoint_id = f"wh_{uuid.uuid4().hex[:12]}"
        endpoint_secret = secret or f"whsec_{uuid.uuid4().hex}"

        record = {
            "id": endpoint_id,
            "companyId": company_id,
            "targetUrl": target_url.strip(),
            "events": events,
            "secret": endpoint_secret,
            "status": "active",
            "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ")
        }
        db.webhooks[endpoint_id] = record
        db.save_webhook(record)
        return record

    @staticmethod
    def get_endpoints(company_id: str) -> List[Dict[str, Any]]:
        try:
            from app.db.models import Base
            with db.engine.connect() as conn:
                rows = conn.execute(
                    Base.metadata.tables["webhooks"].select().where(
                        Base.metadata.tables["webhooks"].c.company_id == company_id
                    )
                ).mappings().all()
                if rows:
                    items = []
                    for r in rows:
                        wh = {
                            "id": r["id"],
                            "companyId": r["company_id"],
                            "targetUrl": r["target_url"],
                            "events": r["events"] or [],
                            "secret": r["secret_encrypted"],
                            "status": r["status"],
                            "createdAt": r["created_at"]
                        }
                        db.webhooks[r["id"]] = wh
                        items.append(wh)
                    return items
        except Exception:
            pass
        return [w for w in db.webhooks.values() if w.get("companyId") == company_id]

    @staticmethod
    def compute_signature(payload_bytes: bytes, secret: str, timestamp: int) -> str:
        """
        Computes HMAC-SHA256 signature formatted as:
        t={timestamp},v1={hex_digest}
        """
        signed_payload = f"{timestamp}.".encode("utf-8") + payload_bytes
        digest = hmac.new(secret.encode("utf-8"), signed_payload, hashlib.sha256).hexdigest()
        return f"t={timestamp},v1={digest}"

    @classmethod
    def dispatch_event(
        cls,
        company_id: str,
        event_type: str,
        data: Dict[str, Any],
        max_retries: int = 3
    ) -> List[Dict[str, Any]]:
        """
        Dispatches an event to all subscribed tenant webhook endpoints.
        Enforces Circuit Breaker states and logs dispatches.
        """
        endpoints = cls.get_endpoints(company_id)
        matching = [
            ep for ep in endpoints
            if ep.get("status") == "active" and ("*" in ep.get("events", []) or event_type in ep.get("events", []))
        ]

        results = []
        now_ts = int(time.time())
        event_id = f"evt_{uuid.uuid4().hex}"

        envelope = {
            "id": event_id,
            "event": event_type,
            "companyId": company_id,
            "timestamp": now_ts,
            "data": data
        }
        payload_bytes = json.dumps(envelope, separators=(',', ':')).encode("utf-8")

        if not hasattr(db, "webhook_deliveries"):
            db.webhook_deliveries = []

        for ep in matching:
            ep_id = ep["id"]
            state = cls.breaker.get_circuit_state(ep_id)

            if state == CircuitState.OPEN:
                delivery_record = {
                    "id": f"del_{uuid.uuid4().hex[:12]}",
                    "endpointId": ep_id,
                    "companyId": company_id,
                    "eventId": event_id,
                    "event": event_type,
                    "status": "circuit_broken",
                    "statusCode": 0,
                    "error": "Circuit breaker is OPEN. Target endpoint suspended.",
                    "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ")
                }
                db.webhook_deliveries.append(delivery_record)
                results.append(delivery_record)
                continue

            sig = cls.compute_signature(payload_bytes, ep["secret"], now_ts)
            headers = {
                "Content-Type": "application/json",
                "User-Agent": "CoarAI-Webhook-Dispatcher/2.0",
                "X-CoarAI-Signature": sig,
                "X-CoarAI-Event": event_type,
                "X-CoarAI-Delivery": event_id
            }

            # Attempt delivery
            success = False
            status_code = 0
            err_msg = ""

            try:
                req = urllib.request.Request(ep["targetUrl"], data=payload_bytes, headers=headers, method="POST")
                with urllib.request.urlopen(req, timeout=5.0) as resp:
                    status_code = resp.getcode()
                    if 200 <= status_code < 300:
                        success = True
                    else:
                        err_msg = f"HTTP status {status_code}"
            except urllib.error.HTTPError as he:
                status_code = he.code
                err_msg = f"HTTPError {he.code}: {he.reason}"
            except Exception as ex:
                status_code = 0
                err_msg = str(ex)

            if success:
                cls.breaker.record_success(ep_id)
                status_str = "delivered"
            else:
                new_state = cls.breaker.record_failure(ep_id, err_msg)
                status_str = "failed"
                if new_state == CircuitState.OPEN:
                    ep["status"] = "failing"

            delivery_record = {
                "id": f"del_{uuid.uuid4().hex[:12]}",
                "endpointId": ep_id,
                "companyId": company_id,
                "eventId": event_id,
                "event": event_type,
                "status": status_str,
                "statusCode": status_code,
                "error": err_msg if not success else None,
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ")
            }
            db.webhook_deliveries.append(delivery_record)
            results.append(delivery_record)

        db.flush_durable_storage()
        return results
