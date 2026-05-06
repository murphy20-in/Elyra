import asyncio
import json

import firebase_admin
from firebase_admin import credentials, messaging

from app.backend.core.config import settings

_firebase_app = None


def _init_firebase():
    global _firebase_app
    if _firebase_app is None:
        if settings.FCM_SERVER_KEY:
            try:
                cred_dict = json.loads(settings.FCM_SERVER_KEY)
                cred = credentials.Certificate(cred_dict)
            except json.JSONDecodeError:
                cred = credentials.Certificate(settings.FCM_SERVER_KEY)
            _firebase_app = firebase_admin.initialize_app(cred)
        else:
            return None
    return _firebase_app


async def send_push(
    tokens: list[str],
    title: str,
    body: str,
    data: dict = {},
) -> dict:
    if not tokens:
        return {"success_count": 0, "failure_count": 0, "failed_tokens": []}

    _init_firebase()

    def _send():
        multicast = messaging.MulticastMessage(
            tokens=tokens,
            notification=messaging.Notification(title=title, body=body),
            data=data,
        )
        return messaging.send_multicast(multicast)

    try:
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, _send)

        failed_tokens = []
        if result.failure_count > 0:
            for idx, err in enumerate(result.errors):
                if err.code == "NOT_FOUND":
                    failed_tokens.append(tokens[idx])

        return {
            "success_count": result.success_count,
            "failure_count": result.failure_count,
            "failed_tokens": failed_tokens,
        }
    except Exception as e:
        return {
            "success_count": 0,
            "failure_count": len(tokens),
            "failed_tokens": tokens,
            "error": str(e),
        }


async def send_single_push(
    token: str,
    title: str,
    body: str,
    data: dict = {},
) -> bool:
    _init_firebase()

    def _send():
        message = messaging.Message(
            notification=messaging.Notification(title=title, body=body),
            data=data,
            token=token,
        )
        messaging.send(message)

    try:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, _send)
        return True
    except Exception:
        return False