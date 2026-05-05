import asyncio
import hashlib
from io import BytesIO

import boto3
from botocore.config import Config

from app.backend.core.config import settings


def _get_s3():
    return boto3.client(
        "s3",
        endpoint_url=settings.S3_ENDPOINT,
        aws_access_key_id=settings.S3_ACCESS_KEY,
        aws_secret_access_key=settings.S3_SECRET_KEY,
        region_name=settings.S3_REGION,
        config=Config(signature_version="s3v4"),
    )


async def upload_file(
    file_bytes: bytes,
    key: str,
    content_type: str,
    cache_control: str = "public, max-age=31536000",
) -> str:
    def _upload():
        client = _get_s3()
        client.upload_fileobj(
            BytesIO(file_bytes),
            settings.S3_BUCKET,
            key,
            ExtraArgs={
                "ContentType": content_type,
                "CacheControl": cache_control,
            },
        )

    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _upload)

    return f"{settings.S3_ENDPOINT}/{settings.S3_BUCKET}/{key}"


async def delete_file(key: str) -> None:
    new_key = f"deleted/{key.split('/', 1)[-1] if '/' in key else key}"

    def _move():
        client = _get_s3()
        client.copy_object(
            Bucket=settings.S3_BUCKET,
            CopySource=f"{settings.S3_BUCKET}/{key}",
            Key=new_key,
        )
        client.delete_object(Bucket=settings.S3_BUCKET, Key=key)

    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _move)


async def get_signed_url(key: str, expires_in: int = 3600) -> str:
    def _sign():
        client = _get_s3()
        return client.generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.S3_BUCKET, "Key": key},
            ExpiresIn=expires_in,
        )

    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _sign)


def compute_file_hash(file_bytes: bytes) -> str:
    return hashlib.sha256(file_bytes).hexdigest()