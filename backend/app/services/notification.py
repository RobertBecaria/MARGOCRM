import logging

from sqlalchemy.orm import Session

from app.models.notification import Notification, NotificationType
from app.models.user import User
from app.services.email import send_email

logger = logging.getLogger(__name__)


def create_notification(
    db: Session,
    user_id: int,
    title: str,
    message: str,
    type: NotificationType,
    channel: str = "in_app",
) -> Notification:
    notification = Notification(
        user_id=user_id,
        title=title,
        message=message,
        type=type,
        channel=channel,
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)

    # Send email if channel is "email" or "both"
    if channel in ("email", "both"):
        user = db.query(User).filter(User.id == user_id).first()
        if user and user.email:
            html = f"<h2>{title}</h2><p>{message}</p><p>— Система «Дом»</p>"
            send_email(user.email, f"Дом — {title}", html)

    return notification
