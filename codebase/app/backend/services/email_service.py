import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from app.backend.core.config import settings


async def send_email(to: str, subject: str, html_body: str, text_body: str = "") -> None:
    message = MIMEMultipart("alternative")
    message["From"] = settings.EMAIL_FROM
    message["To"] = to
    message["Subject"] = subject

    part1 = MIMEText(text_body or html_body, "plain")
    part2 = MIMEText(html_body, "html")

    message.attach(part1)
    message.attach(part2)

    await aiosmtplib.send(
        message,
        hostname=settings.SMTP_HOST,
        port=settings.SMTP_PORT,
        username=settings.SMTP_USER,
        password=settings.SMTP_PASSWORD,
        tls=settings.SMTP_PORT == 587,
    )


async def send_verification_email(to: str, token: str, user_name: str) -> None:
    frontend_url = "https://elyra.app"
    verify_link = f"{frontend_url}/auth/verify-email?token={token}"

    html = f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #7C3AED;">Welcome to Elyra</h1>
            <p>Hi {user_name},</p>
            <p>Thank you for joining Elyra. To verify your email address, please click the button below:</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{verify_link}" style="background-color: #7C3AED; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Verify Email</a>
            </div>
            <p style="color: #666; font-size: 14px;">This link will expire in 24 hours.</p>
            <p style="color: #666; font-size: 14px;">If you didn't create an account, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px;">Elyra — A safer way to connect</p>
        </div>
    </body>
    </html>
    """

    await send_email(to, "Verify your Elyra account", html)


async def send_password_reset_email(to: str, token: str) -> None:
    frontend_url = "https://elyra.app"
    reset_link = f"{frontend_url}/auth/reset-password?token={token}"

    html = f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #7C3AED;">Reset Your Password</h1>
            <p>We received a request to reset your Elyra password.</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{reset_link}" style="background-color: #7C3AED; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Reset Password</a>
            </div>
            <p style="color: #666; font-size: 14px;">This link will expire in 1 hour.</p>
            <p style="color: #666; font-size: 14px;">If you didn't request a password reset, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px;">Elyra — A safer way to connect</p>
        </div>
    </body>
    </html>
    """

    await send_email(to, "Reset your Elyra password", html)


async def send_sos_email(to: str, user_name: str, location: str, note: str) -> None:
    html = f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #DC2626;">🚨 Safety Alert</h1>
            <p>An Elyra user has triggered an SOS alert.</p>
            <p><strong>User:</strong> {user_name}</p>
            <p><strong>Location:</strong> {location}</p>
            <p><strong>Note:</strong> {note or "No note provided"}</p>
            <p style="color: #666; font-size: 14px;">Please contact the user and emergency services if needed.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px;">Elyra Safety Team</p>
        </div>
    </body>
    </html>
    """

    await send_email(to, "🚨 Elyra Safety Alert", html)