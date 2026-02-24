import datetime as dt
from typing import Optional

from pydantic import BaseModel, Field

from app.models.note import NoteColor


class NoteCreate(BaseModel):
    title: str = Field(max_length=200)
    content: str = ""
    color: NoteColor = NoteColor.yellow


class NoteUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=200)
    content: Optional[str] = None
    color: Optional[NoteColor] = None


class NoteResponse(BaseModel):
    id: int
    user_id: int
    title: str
    content: str
    color: NoteColor
    created_at: dt.datetime
    updated_at: dt.datetime

    class Config:
        from_attributes = True
