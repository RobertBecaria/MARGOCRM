from sqlalchemy.orm import Session

from app.models.notification import Notification, NotificationType


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
    return notification
