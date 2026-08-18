"""
NotificationService abstraction. MVP ships an in-app notification service
(alerts are simply queryable via the API/UI). An email implementation is
provided as an example of how additional channels would plug in without
coupling AlertService to a specific provider.
"""
from abc import ABC, abstractmethod
import logging

logger = logging.getLogger("business_pulse.notifications")


class NotificationService(ABC):
    @abstractmethod
    def notify(self, alert, is_update: bool = False) -> None:
        ...


class InAppNotificationService(NotificationService):
    """MVP channel: alerts are visible via GET /api/alerts. This class just
    logs the event for the audit trail / activity timeline."""

    def notify(self, alert, is_update: bool = False) -> None:
        action = "updated" if is_update else "created"
        logger.info("Alert %s: [%s] %s (id=%s)", action, alert.severity, alert.title, alert.id)


class EmailNotificationService(NotificationService):
    """Example secondary channel. Not wired up by default - would need
    SMTP/provider credentials via environment variables."""

    def __init__(self, smtp_client=None):
        self.smtp_client = smtp_client

    def notify(self, alert, is_update: bool = False) -> None:
        if not self.smtp_client:
            logger.warning("EmailNotificationService has no SMTP client configured; skipping email for alert %s", alert.id)
            return
        # self.smtp_client.send(...)