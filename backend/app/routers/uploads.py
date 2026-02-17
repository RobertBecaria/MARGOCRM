import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, UploadFile
from fastapi.responses import FileResponse

from app.models.user import User
from app.services.auth import get_current_user

router = APIRouter(prefix="/api/uploads", tags=["uploads"])

UPLOAD_DIR = Path("/app/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf"}
MAX_SIZE = 10 * 1024 * 1024  # 10MB


@router.post("")
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        return {"error": f"File type {ext} not allowed"}

    content = await file.read()
    if len(content) > MAX_SIZE:
        return {"error": "File too large (max 10MB)"}

    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = UPLOAD_DIR / filename
    filepath.write_bytes(content)

    return {"url": f"/api/uploads/{filename}", "filename": filename}


@router.get("/{filename}")
async def get_file(filename: str):
    filepath = UPLOAD_DIR / filename
    if not filepath.exists():
        return {"error": "File not found"}
    return FileResponse(filepath)
