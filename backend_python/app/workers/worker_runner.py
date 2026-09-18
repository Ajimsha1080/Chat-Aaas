import asyncio
import signal
import logging
from app.workers.document_worker import DocumentWorker
from app.workers.webhook_worker import WebhookWorker

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("worker_runner")

stop_event = asyncio.Event()

def signal_handler(sig, frame):
    logger.info(f"Received termination signal {sig}. Initiating graceful shutdown...")
    DocumentWorker.stop_worker()
    WebhookWorker.stop_worker()
    stop_event.set()

async def main():
    logger.info("Starting Chat-AaaS Unified Background Workers (Document Ingestion, Recrawl Scheduler & Webhooks)...")

    # Register signal handlers where supported
    try:
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)
    except Exception as e:
        logger.warning(f"Could not bind standard OS signals: {e}")

    # Launch concurrent worker loops
    doc_task = asyncio.create_task(DocumentWorker.run_worker_loop())
    recrawl_task = asyncio.create_task(DocumentWorker.run_recrawl_scheduler_loop(poll_interval=300.0))
    webhook_task = asyncio.create_task(WebhookWorker.run_worker_loop())

    logger.info("Workers are active and listening for queued jobs and website recrawls.")
    await stop_event.wait()

    logger.info("Awaiting worker tasks completion...")
    await asyncio.gather(doc_task, recrawl_task, webhook_task, return_exceptions=True)
    logger.info("All background workers have shut down cleanly.")

if __name__ == "__main__":
    asyncio.run(main())
