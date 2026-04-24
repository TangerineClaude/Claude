import smtplib
import logging
import os
from abc import ABC, abstractmethod
from dataclasses import dataclass
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

logger = logging.getLogger(__name__)


@dataclass
class DeliveryResult:
    channel: str
    success: bool
    message_id: str | None = None
    error: str | None = None


class BaseChannel(ABC):
    name: str

    @abstractmethod
    def send(self, recipient: str, subject: str, body: str, **kwargs) -> DeliveryResult:
        ...


class APIChannel(BaseChannel):
    """Default in-process channel — just returns the response directly."""
    name = "api"

    def send(self, recipient: str, subject: str, body: str, **kwargs) -> DeliveryResult:
        return DeliveryResult(channel=self.name, success=True, message_id=f"api-{id(body)}")


class EmailChannel(BaseChannel):
    name = "email"

    def __init__(self):
        self.smtp_host = os.getenv("SMTP_HOST", "localhost")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_user = os.getenv("SMTP_USER", "")
        self.smtp_pass = os.getenv("SMTP_PASS", "")
        self.from_addr = os.getenv("EMAIL_FROM", self.smtp_user)

    def send(self, recipient: str, subject: str, body: str, **kwargs) -> DeliveryResult:
        if not self.smtp_user:
            logger.warning("Email channel not configured (no SMTP_USER)")
            return DeliveryResult(channel=self.name, success=False, error="SMTP not configured")

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = self.from_addr
        msg["To"] = recipient
        msg.attach(MIMEText(body, "plain"))

        try:
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.ehlo()
                server.starttls()
                server.login(self.smtp_user, self.smtp_pass)
                server.sendmail(self.from_addr, [recipient], msg.as_string())
            logger.info("Email sent to %s", recipient)
            return DeliveryResult(channel=self.name, success=True)
        except Exception as exc:
            logger.error("Email send failed: %s", exc)
            return DeliveryResult(channel=self.name, success=False, error=str(exc))


class WebhookChannel(BaseChannel):
    name = "webhook"

    def send(self, recipient: str, subject: str, body: str, **kwargs) -> DeliveryResult:
        import urllib.request
        import json as _json

        payload = _json.dumps({"subject": subject, "body": body, **kwargs}).encode()
        req = urllib.request.Request(
            recipient,
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                return DeliveryResult(
                    channel=self.name,
                    success=resp.status < 400,
                    message_id=resp.getheader("X-Request-Id"),
                )
        except Exception as exc:
            logger.error("Webhook delivery failed: %s", exc)
            return DeliveryResult(channel=self.name, success=False, error=str(exc))


class ChannelManager:
    """Registry that dispatches to the right channel."""

    def __init__(self):
        self._channels: dict[str, BaseChannel] = {}
        for ch in [APIChannel(), EmailChannel(), WebhookChannel()]:
            self._channels[ch.name] = ch

    def send(self, channel_name: str, recipient: str, subject: str, body: str, **kwargs) -> DeliveryResult:
        channel = self._channels.get(channel_name, self._channels["api"])
        return channel.send(recipient, subject, body, **kwargs)

    def available(self) -> list[str]:
        return list(self._channels.keys())
