import json
import logging
from typing import Dict, Set
from fastapi import WebSocket

logger = logging.getLogger(__name__)

class ConnectionManager:
    """
    Multi-tenant real-time WebSocket connection manager.
    Maintains active connections partitioned by company_id and broadcasts live events.
    """
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, company_id: str):
        await websocket.accept()
        if company_id not in self.active_connections:
            self.active_connections[company_id] = set()
        self.active_connections[company_id].add(websocket)
        logger.info(f"[WebSocket] Connected client for tenant {company_id} (active: {len(self.active_connections[company_id])})")

    def disconnect(self, websocket: WebSocket, company_id: str):
        if company_id in self.active_connections:
            self.active_connections[company_id].discard(websocket)
            if not self.active_connections[company_id]:
                del self.active_connections[company_id]
        logger.info(f"[WebSocket] Disconnected client for tenant {company_id}")

    async def broadcast_to_company(self, company_id: str, event_type: str, data: dict):
        """Broadcasts real-time events to all connected clients in the tenant."""
        if company_id not in self.active_connections:
            return
        payload = json.dumps({"event": event_type, "data": data})
        stale = set()
        for conn in list(self.active_connections[company_id]):
            try:
                await conn.send_text(payload)
            except Exception as e:
                logger.warning(f"[WebSocket] Failed to deliver event to client: {e}")
                stale.add(conn)
        for dead_conn in stale:
            self.disconnect(dead_conn, company_id)

    async def broadcast_all(self, event_type: str, data: dict):
        """Broadcasts real-time events globally across all connected tenants and admin consoles."""
        payload = json.dumps({"event": event_type, "data": data})
        for company_id, connections in list(self.active_connections.items()):
            stale = set()
            for conn in list(connections):
                try:
                    await conn.send_text(payload)
                except Exception as e:
                    logger.warning(f"[WebSocket] Failed to deliver broadcast to {company_id}: {e}")
                    stale.add(conn)
            for dead_conn in stale:
                self.disconnect(dead_conn, company_id)

ws_manager = ConnectionManager()
