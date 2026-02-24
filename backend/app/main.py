import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import ai_chat, auth, categories, finance, notes, notifications, schedules, tasks, timecard, uploads, users

logger = logging.getLogger(__name__)

app = FastAPI(title="MARGO CRM", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(auth.router)
app.include_router(categories.router)
app.include_router(users.router)
app.include_router(schedules.router)
app.include_router(tasks.router)
app.include_router(finance.router)
app.include_router(notifications.router)
app.include_router(notes.router)
app.include_router(timecard.router)
app.include_router(uploads.router)
app.include_router(ai_chat.router)


@app.on_event("startup")
def seed_owner():
    from app.database import SessionLocal
    from app.models.user import RoleEnum, User
    from app.utils.security import hash_password

    db = SessionLocal()
    try:
        owner = db.query(User).filter(User.role == RoleEnum.owner).first()
        if not owner:
            owner = User(
                email="margo@margocrm.ru",
                password_hash=hash_password("X17resto1"),
                full_name="Margo",
                role=RoleEnum.owner,
            )
            db.add(owner)
            db.commit()
            logger.info("Seeded owner account: margo@margocrm.ru")
    except Exception as e:
        logger.warning(f"Could not seed owner account: {e}")
        db.rollback()
    finally:
        db.close()


@app.on_event("startup")
def seed_categories():
    from app.database import SessionLocal
    from app.models.category import FinanceCategory

    defaults = [
        ("Хозяйство", "expense"),
        ("Транспорт", "expense"),
        ("Еда", "expense"),
        ("Развлечения", "expense"),
        ("Прочее", "expense"),
    ]
    db = SessionLocal()
    try:
        for name, cat_type in defaults:
            exists = db.query(FinanceCategory).filter(
                FinanceCategory.name == name, FinanceCategory.type == cat_type
            ).first()
            if not exists:
                db.add(FinanceCategory(name=name, type=cat_type, is_default=True))
        db.commit()
        logger.info("Seeded default finance categories")
    except Exception as e:
        logger.warning(f"Could not seed categories: {e}")
        db.rollback()
    finally:
        db.close()


@app.get("/api/health")
def health():
    return {"status": "ok"}
