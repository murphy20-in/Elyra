import asyncio
from twilio.rest import Client

from app.backend.core.config import settings


def _get_client() -> Client:
    return Client(settings.TWILIO_SID, settings.TWILIO_AUTH_TOKEN)


async def send_otp_sms(to_phone: str, otp: str) -> None:
    message = f"Your Elyra OTP is {otp}. Valid for 10 minutes. Do not share."

    def _send():
        client = _get_client()
        client.messages.create(
            body=message,
            from_=settings.TWILIO_FROM_NUMBER,
            to=to_phone,
        )

    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _send)


async def send_sos_sms(
    to_phone: str,
    user_name: str,
    latitude: float | None,
    longitude: float | None,
    note: str | None,
) -> None:
    location_link = ""
    if latitude and longitude:
        location_link = f" Location: https://maps.google.com/?q={latitude},{longitude}"

    message = f"🚨 Elyra SOS Alert: {user_name} needs help.{location_link}"
    if note:
        message += f" Note: {note}"

    def _send():
        client = _get_client()
        client.messages.create(
            body=message,
            from_=settings.TWILIO_FROM_NUMBER,
            to=to_phone,
        )

    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _send)