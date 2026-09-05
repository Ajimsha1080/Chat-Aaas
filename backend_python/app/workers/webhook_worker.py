import asyncio
import time
from typing import Dict, Any, List

class WebhookWorker:
    """
    Asynchronous Worker for Webhook Dispatch with Exponential Backoff Retries
    """
    @staticmethod
    async def dispatch_event(target_url: str, event_type: str, payload: Dict[str, Any], max_retries: int = 3) -> Dict[str, Any]:
        delivery_id = f"del_{int(time.time() * 1000)}"
        
        # Simulation of resilient HTTP post with exponential backoff
        for attempt in range(1, max_retries + 1):
            try:
                # In real network dispatch: await httpx.post(target_url, json={"event": event_type, "data": payload}, timeout=5.0)
                await asyncio.sleep(0.01)
                return {
                    "deliveryId": delivery_id,
                    "targetUrl": target_url,
                    "eventType": event_type,
                    "status": "delivered",
                    "attempts": attempt,
                    "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ")
                }
            except Exception as e:
                if attempt == max_retries:
                    return {
                        "deliveryId": delivery_id,
                        "targetUrl": target_url,
                        "eventType": event_type,
                        "status": "failed",
                        "error": str(e),
                        "attempts": attempt
                    }
                await asyncio.sleep(0.05 * (2 ** attempt))
