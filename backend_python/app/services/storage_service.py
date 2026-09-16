"""
Enterprise Object Storage Service for CoarAI.
Supports AWS S3, Cloudflare R2, and local filesystem fallback.
Provides tenant-isolated keys: {tenant_id}/{document_id}/{filename}
Generates short-lived presigned download/upload URLs.
"""

import os
import time
import uuid
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

class StorageService:
    @classmethod
    def get_object_key(cls, company_id: str, document_id: str, filename: str) -> str:
        """Constructs tenant-isolated object key path."""
        safe_name = "".join(c for c in filename if c.isalnum() or c in "._-")
        return f"{company_id}/{document_id}/{safe_name}"

    @classmethod
    def upload_bytes(
        cls,
        company_id: str,
        document_id: str,
        filename: str,
        data: bytes,
        content_type: str = "application/octet-stream"
    ) -> Dict[str, Any]:
        """
        Stores binary payload in object storage (or local storage in development).
        Returns object metadata and presigned access URL.
        """
        key = cls.get_object_key(company_id, document_id, filename)
        provider = os.getenv("STORAGE_PROVIDER", "local").lower()
        bucket = os.getenv("S3_BUCKET_NAME", "coarai-documents-prod")

        if provider == "s3" and os.getenv("S3_ACCESS_KEY_ID"):
            try:
                import boto3
                s3_client = boto3.client(
                    "s3",
                    region_name=os.getenv("S3_REGION", "ap-south-1"),
                    aws_access_key_id=os.getenv("S3_ACCESS_KEY_ID"),
                    aws_secret_access_key=os.getenv("S3_SECRET_ACCESS_KEY"),
                    endpoint_url=os.getenv("S3_ENDPOINT_URL") or None
                )
                s3_client.put_object(
                    Bucket=bucket,
                    Key=key,
                    Body=data,
                    ContentType=content_type,
                    ServerSideEncryption="AES256"
                )
                presigned_url = s3_client.generate_presigned_url(
                    "get_object",
                    Params={"Bucket": bucket, "Key": key},
                    ExpiresIn=3600
                )
                return {
                    "storage_provider": "s3",
                    "bucket": bucket,
                    "key": key,
                    "size_bytes": len(data),
                    "content_type": content_type,
                    "presigned_url": presigned_url
                }
            except Exception as e:
                logger.error(f"S3 upload failed for {key}: {e}. Falling back to local storage.")

        # Local storage fallback (Dev/Test)
        local_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../data/uploads", company_id, document_id))
        os.makedirs(local_dir, exist_ok=True)
        local_path = os.path.join(local_dir, "".join(c for c in filename if c.isalnum() or c in "._-"))
        with open(local_path, "wb") as f:
            f.write(data)

        return {
            "storage_provider": "local",
            "bucket": "local",
            "key": key,
            "local_path": local_path,
            "size_bytes": len(data),
            "content_type": content_type,
            "presigned_url": f"/api/v1/knowledge/files/download?key={key}"
        }

    @classmethod
    def generate_presigned_url(cls, company_id: str, key: str, expires_in: int = 3600) -> Optional[str]:
        """Generates a secure, temporary download URL."""
        if not key.startswith(f"{company_id}/"):
            # Multi-tenant isolation boundary guard
            logger.warning(f"Tenant {company_id} attempted to access cross-tenant key {key}")
            return None

        provider = os.getenv("STORAGE_PROVIDER", "local").lower()
        if provider == "s3" and os.getenv("S3_ACCESS_KEY_ID"):
            try:
                import boto3
                s3_client = boto3.client(
                    "s3",
                    region_name=os.getenv("S3_REGION", "ap-south-1"),
                    aws_access_key_id=os.getenv("S3_ACCESS_KEY_ID"),
                    aws_secret_access_key=os.getenv("S3_SECRET_ACCESS_KEY"),
                    endpoint_url=os.getenv("S3_ENDPOINT_URL") or None
                )
                return s3_client.generate_presigned_url(
                    "get_object",
                    Params={"Bucket": os.getenv("S3_BUCKET_NAME", "coarai-documents-prod"), "Key": key},
                    ExpiresIn=expires_in
                )
            except Exception as e:
                logger.error(f"Presigned URL generation failed: {e}")
                return None

        return f"/api/v1/knowledge/files/download?key={key}"
