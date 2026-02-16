import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, finance, notifications, schedules, tasks, users

logger = logging.getLogger(__name__)

app = FastAPI(title="Dom — Household CRM", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(schedules.router)
app.include_router(tasks.router)
app.include_router(finance.router)
app.include_router(notifications.router)


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
                email="owner@dom.app",
                password_hash=hash_password("owner123"),
                full_name="Владелец",
                role=RoleEnum.owner,
            )
            db.add(owner)
            db.commit()
            logger.info("Seeded owner account: owner@dom.app")
    except Exception as e:
        logger.warning(f"Could not seed owner account: {e}")
        db.rollback()
    finally:
        db.close()


@app.get("/api/health")
def health():
    return {"status": "ok"}
