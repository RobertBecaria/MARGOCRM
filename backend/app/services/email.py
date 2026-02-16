import logging
from typing import Optional

from app.config import settings

logger = logging.getLogger(__name__)


def send_email(to: str, subject: str, html_body: str) -> bool:
    if not settings.resend_api_key:
        logger.warning("Resend API key not configured, skipping email send")
        return False

    try:
        import resend
        resend.api_key = settings.resend_api_key
        resend.Emails.send({
            "from": settings.from_email,
            "to": to,
            "subject": subject,
            "html": html_body,
        })
        return True
    except Exception as e:
        logger.error(f"Failed to send email: {e}")
        return False


def send_schedule_notification(to_email: str, staff_name: str, date: str, shift_start: str, shift_end: str, location: str):
    subject = f"Дом — Новая смена {date}"
    html = f"""
    <h2>Новая смена в расписании</h2>
    <p>Уважаемый(ая) {staff_name},</p>
    <p>Вам назначена смена:</p>
    <ul>
        <li><strong>Дата:</strong> {date}</li>
        <li><strong>Время:</strong> {shift_start} — {shift_end}</li>
        <li><strong>Место:</strong> {location}</li>
    </ul>
    <p>С уважением,<br>Система «Дом»</p>
    """
    send_email(to_email, subject, html)


def send_task_assignment(to_email: str, staff_name: str, task_title: str, priority: str, due_date: Optional[str] = None):
    subject = f"Дом — Новая задача: {task_title}"
    due_line = f"<li><strong>Срок:</strong> {due_date}</li>" if due_date else ""
    html = f"""
    <h2>Новая задача</h2>
    <p>Уважаемый(ая) {staff_name},</p>
    <p>Вам назначена задача:</p>
    <ul>
        <li><strong>Задача:</strong> {task_title}</li>
        <li><strong>Приоритет:</strong> {priority}</li>
        {due_line}
    </ul>
    <p>С уважением,<br>Система «Дом»</p>
    """
    send_email(to_email, subject, html)


def send_payment_confirmation(to_email: str, staff_name: str, period: str, net_amount: float):
    subject = f"Дом — Выплата за {period}"
    html = f"""
    <h2>Подтверждение выплаты</h2>
    <p>Уважаемый(ая) {staff_name},</p>
    <p>Выплата за период <strong>{period}</strong> произведена.</p>
    <p><strong>Сумма:</strong> {net_amount:,.2f} ₽</p>
    <p>С уважением,<br>Система «Дом»</p>
    """
    send_email(to_email, subject, html)
