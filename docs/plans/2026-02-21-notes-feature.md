# Notes (Заметки) Feature — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a color-coded personal notepad (Заметки) for owner/manager with a card grid UI, accessible from the sidebar before Notifications.

**Architecture:** New `Note` SQLAlchemy model + Alembic migration, FastAPI CRUD router with RBAC, React page with color-coded glass cards in a responsive grid, create/edit via Modal.

**Tech Stack:** FastAPI, SQLAlchemy, Alembic, React, TypeScript, TanStack React Query, Tailwind CSS, lucide-react

---

### Task 1: Backend — Note model

**Files:**
- Create: `backend/app/models/note.py`
- Modify: `backend/app/models/__init__.py:1-19`

**Step 1: Create the model file**

Create `backend/app/models/note.py`:

```python
from __future__ import annotations

import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class NoteColor(str, enum.Enum):
    yellow = "yellow"
    blue = "blue"
    green = "green"
    pink = "pink"
    purple = "purple"
    orange = "orange"


class Note(Base):
    __tablename__ = "notes"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    title: Mapped[str] = mapped_column(String(200))
    content: Mapped[str] = mapped_column(Text, default="")
    color: Mapped[NoteColor] = mapped_column(Enum(NoteColor), default=NoteColor.yellow)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
```

**Step 2: Register in models `__init__.py`**

Add to `backend/app/models/__init__.py`:

```python
from app.models.note import Note, NoteColor
```

And add `"Note", "NoteColor"` to the `__all__` list.

**Step 3: Commit**

```bash
git add backend/app/models/note.py backend/app/models/__init__.py
git commit -m "feat(notes): add Note SQLAlchemy model"
```

---

### Task 2: Backend — Alembic migration

**Step 1: Generate migration**

Run from `backend/` directory:

```bash
cd /Users/orlandobecaria/household-crm/backend
alembic revision --autogenerate -m "add notes table"
```

**Step 2: Review the generated migration**

Check the file in `backend/alembic/versions/` — it should create a `notes` table with columns: `id`, `user_id`, `title`, `content`, `color`, `created_at`, `updated_at`.

**Step 3: Commit**

```bash
git add backend/alembic/versions/
git commit -m "feat(notes): add migration for notes table"
```

---

### Task 3: Backend — Pydantic schemas

**Files:**
- Create: `backend/app/schemas/note.py`

**Step 1: Create the schema file**

Create `backend/app/schemas/note.py`:

```python
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
```

**Step 2: Commit**

```bash
git add backend/app/schemas/note.py
git commit -m "feat(notes): add Pydantic schemas for notes"
```

---

### Task 4: Backend — Notes API router

**Files:**
- Create: `backend/app/routers/notes.py`
- Modify: `backend/app/main.py:7,27`

**Step 1: Create the router**

Create `backend/app/routers/notes.py`:

```python
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.rbac import require_role
from app.models.note import Note
from app.models.user import RoleEnum, User
from app.schemas.note import NoteCreate, NoteResponse, NoteUpdate

router = APIRouter(prefix="/api/notes", tags=["notes"])


@router.get("", response_model=List[NoteResponse])
def list_notes(
    search: str = Query("", description="Search in title and content"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleEnum.owner, RoleEnum.manager)),
):
    query = db.query(Note).filter(Note.user_id == current_user.id)
    if search:
        like = f"%{search}%"
        query = query.filter((Note.title.ilike(like)) | (Note.content.ilike(like)))
    return query.order_by(Note.updated_at.desc()).all()


@router.post("", response_model=NoteResponse, status_code=status.HTTP_201_CREATED)
def create_note(
    data: NoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleEnum.owner, RoleEnum.manager)),
):
    note = Note(user_id=current_user.id, **data.model_dump())
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


@router.put("/{note_id}", response_model=NoteResponse)
def update_note(
    note_id: int,
    data: NoteUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleEnum.owner, RoleEnum.manager)),
):
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == current_user.id).first()
    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(note, key, value)
    db.commit()
    db.refresh(note)
    return note


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(
    note_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleEnum.owner, RoleEnum.manager)),
):
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == current_user.id).first()
    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
    db.delete(note)
    db.commit()
```

**Step 2: Register router in `main.py`**

In `backend/app/main.py`:
- Add `notes` to the import on line 7:
  ```python
  from app.routers import ai_chat, auth, categories, finance, notes, notifications, schedules, tasks, timecard, uploads, users
  ```
- Add after `app.include_router(notifications.router)` (line 27):
  ```python
  app.include_router(notes.router)
  ```

**Step 3: Commit**

```bash
git add backend/app/routers/notes.py backend/app/main.py
git commit -m "feat(notes): add CRUD API router for notes"
```

---

### Task 5: Frontend — Types and API client

**Files:**
- Modify: `frontend/src/types/index.ts`
- Create: `frontend/src/api/notes.ts`

**Step 1: Add types**

Add to `frontend/src/types/index.ts` (after the `Notification` interface):

```typescript
export type NoteColor = "yellow" | "blue" | "green" | "pink" | "purple" | "orange";

export interface Note {
  id: number;
  user_id: number;
  title: string;
  content: string;
  color: NoteColor;
  created_at: string;
  updated_at: string;
}
```

**Step 2: Create API client**

Create `frontend/src/api/notes.ts`:

```typescript
import client from "./client";
import type { Note } from "../types";

export async function getNotes(search?: string): Promise<Note[]> {
  const response = await client.get<Note[]>("/notes", { params: { search } });
  return response.data;
}

export async function createNote(data: { title: string; content: string; color: string }): Promise<Note> {
  const response = await client.post<Note>("/notes", data);
  return response.data;
}

export async function updateNote(id: number, data: { title?: string; content?: string; color?: string }): Promise<Note> {
  const response = await client.put<Note>(`/notes/${id}`, data);
  return response.data;
}

export async function deleteNote(id: number): Promise<void> {
  await client.delete(`/notes/${id}`);
}
```

**Step 3: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/api/notes.ts
git commit -m "feat(notes): add Note type and API client"
```

---

### Task 6: Frontend — i18n translations

**Files:**
- Modify: `frontend/src/i18n/ru.json`

**Step 1: Add translations**

Add a `"notes"` section to `frontend/src/i18n/ru.json` (after the `"notifications"` section) and add `"notes"` to the `"nav"` section:

In `"nav"` section, add:
```json
"notes": "Заметки"
```

New `"notes"` section:
```json
"notes": {
  "title": "Заметки",
  "newNote": "Новая заметка",
  "editNote": "Редактировать",
  "empty": "Пока нет заметок",
  "emptyHint": "Создайте первую заметку!",
  "titlePlaceholder": "Название заметки",
  "contentPlaceholder": "Текст заметки...",
  "color": "Цвет",
  "confirmDelete": "Удалить эту заметку?",
  "searchPlaceholder": "Поиск заметок..."
}
```

**Step 2: Commit**

```bash
git add frontend/src/i18n/ru.json
git commit -m "feat(notes): add Russian translations for notes"
```

---

### Task 7: Frontend — Notes page component

**Files:**
- Create: `frontend/src/pages/owner/Notes.tsx`

**Step 1: Create the Notes page**

Create `frontend/src/pages/owner/Notes.tsx`:

```tsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Trash2 } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { getNotes, createNote, updateNote, deleteNote } from "../../api/notes";
import type { Note, NoteColor } from "../../types";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import LoadingSpinner from "../../components/shared/LoadingSpinner";

const NOTE_COLORS: { value: NoteColor; hex: string }[] = [
  { value: "yellow", hex: "#f59e0b" },
  { value: "blue", hex: "#3b82f6" },
  { value: "green", hex: "#10b981" },
  { value: "pink", hex: "#ec4899" },
  { value: "purple", hex: "#8b5cf6" },
  { value: "orange", hex: "#f97316" },
];

function colorHex(color: NoteColor): string {
  return NOTE_COLORS.find((c) => c.value === color)?.hex ?? "#3b82f6";
}

export default function Notes() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);
  const [form, setForm] = useState({ title: "", content: "", color: "yellow" as NoteColor });

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["notes", search],
    queryFn: () => getNotes(search || undefined),
  });

  const createMut = useMutation({
    mutationFn: createNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      closeModal();
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, ...data }: { id: number; title: string; content: string; color: string }) =>
      updateNote(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      closeModal();
    },
  });

  const deleteMut = useMutation({
    mutationFn: deleteNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      closeModal();
    },
  });

  function openCreate() {
    setEditing(null);
    setForm({ title: "", content: "", color: "yellow" });
    setModalOpen(true);
  }

  function openEdit(note: Note) {
    setEditing(note);
    setForm({ title: note.title, content: note.content, color: note.color });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  function handleSave() {
    if (!form.title.trim()) return;
    if (editing) {
      updateMut.mutate({ id: editing.id, ...form });
    } else {
      createMut.mutate(form);
    }
  }

  function handleDelete() {
    if (!editing) return;
    if (confirm(t("notes.confirmDelete"))) {
      deleteMut.mutate(editing.id);
    }
  }

  const isSaving = createMut.isPending || updateMut.isPending;

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl font-semibold text-purple-200">{t("notes.title")}</h1>
        <Button variant="primary" onClick={openCreate}>
          <Plus size={16} className="mr-1.5" />
          {t("notes.newNote")}
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("notes.searchPlaceholder")}
          className="glass-input w-full pl-9 pr-3 py-2 text-sm rounded-lg"
        />
      </div>

      {/* Grid or empty */}
      {notes.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 text-lg">{t("notes.empty")}</p>
          <p className="text-gray-600 text-sm mt-1">{t("notes.emptyHint")}</p>
          <Button variant="secondary" className="mt-4" onClick={openCreate}>
            <Plus size={16} className="mr-1.5" />
            {t("notes.newNote")}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {notes.map((note) => {
            const hex = colorHex(note.color);
            return (
              <button
                key={note.id}
                onClick={() => openEdit(note)}
                className="glass-card text-left p-4 rounded-xl transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
                style={{
                  borderTop: `3px solid ${hex}`,
                  boxShadow: `0 0 20px ${hex}15`,
                }}
              >
                <h3 className="text-sm font-semibold text-purple-200 truncate">{note.title}</h3>
                <p className="text-xs text-gray-400 mt-1.5 line-clamp-3 whitespace-pre-wrap">{note.content}</p>
                <p className="text-[10px] text-gray-600 mt-3">
                  {formatDistanceToNow(parseISO(note.updated_at), { addSuffix: true, locale: ru })}
                </p>
              </button>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal open={modalOpen} onClose={closeModal} title={editing ? t("notes.editNote") : t("notes.newNote")}>
        <div className="space-y-4">
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder={t("notes.titlePlaceholder")}
            className="glass-input w-full px-3 py-2 text-sm rounded-lg"
            maxLength={200}
          />
          <textarea
            value={form.content}
            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            placeholder={t("notes.contentPlaceholder")}
            rows={6}
            className="glass-input w-full px-3 py-2 text-sm rounded-lg resize-none"
          />
          {/* Color picker */}
          <div>
            <label className="text-xs text-gray-400 mb-2 block">{t("notes.color")}</label>
            <div className="flex gap-2">
              {NOTE_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, color: c.value }))}
                  className="w-7 h-7 rounded-full transition-all duration-150"
                  style={{
                    backgroundColor: c.hex,
                    boxShadow: form.color === c.value ? `0 0 12px ${c.hex}` : "none",
                    outline: form.color === c.value ? `2px solid ${c.hex}` : "2px solid transparent",
                    outlineOffset: "2px",
                  }}
                />
              ))}
            </div>
          </div>
          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <div>
              {editing && (
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  <Trash2 size={14} />
                  {t("common.delete")}
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={closeModal}>
                {t("common.cancel")}
              </Button>
              <Button variant="primary" onClick={handleSave} loading={isSaving} disabled={!form.title.trim()}>
                {t("common.save")}
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/pages/owner/Notes.tsx
git commit -m "feat(notes): add Notes page with card grid and create/edit modal"
```

---

### Task 8: Frontend — Wire up routing and navigation

**Files:**
- Modify: `frontend/src/App.tsx:16,59`
- Modify: `frontend/src/components/layout/Sidebar.tsx:3,25`

**Step 1: Add route in `App.tsx`**

Add lazy import after line 16 (`Notifications`):
```typescript
const Notes = lazy(() => import("./pages/owner/Notes"));
```

Add route after the `/finance` route (line 59):
```tsx
<Route path="/notes" element={<Notes />} />
```

**Step 2: Add sidebar nav item in `Sidebar.tsx`**

Add `StickyNote` to the lucide imports on line 3:
```typescript
import {
  LayoutDashboard,
  Users,
  Calendar,
  CheckSquare,
  Wallet,
  Bell,
  Settings,
  Sun,
  CalendarDays,
  ListTodo,
  CreditCard,
  X,
  Sparkles,
  StickyNote,
} from "lucide-react";
```

Add the notes nav item in `ownerNav` array, between Finance (line 24) and Staff (line 25):
```typescript
const ownerNav = [
  { to: "/", icon: LayoutDashboard, label: "nav.dashboard" },
  { to: "/schedules", icon: Calendar, label: "nav.schedules" },
  { to: "/tasks", icon: CheckSquare, label: "nav.tasks" },
  { to: "/finance", icon: Wallet, label: "nav.finance" },
  { to: "/staff", icon: Users, label: "nav.staff" },
  { to: "/notes", icon: StickyNote, label: "nav.notes" },
  { to: "/notifications", icon: Bell, label: "nav.notifications" },
  { to: "/settings", icon: Settings, label: "nav.settings" },
];
```

**Step 3: Commit**

```bash
git add frontend/src/App.tsx frontend/src/components/layout/Sidebar.tsx
git commit -m "feat(notes): wire up /notes route and sidebar navigation"
```

---

### Task 9: Deploy and verify

**Step 1: Build frontend locally**

```bash
cd /Users/orlandobecaria/household-crm/frontend
npm run build
```

Verify no TypeScript or build errors.

**Step 2: Deploy to server**

```bash
# Rsync frontend
rsync -avz --delete /Users/orlandobecaria/household-crm/frontend/dist/ root@205.196.83.61:/opt/household-crm/frontend/dist/

# SSH to server and rebuild backend + run migration
ssh root@205.196.83.61 "cd /opt/household-crm && docker compose build --no-cache && docker compose up -d && docker exec household-crm-app-1 alembic upgrade head && docker exec household-crm-nginx-1 nginx -s reload"
```

Note: Adjust container names if needed. The migration command runs `alembic upgrade head` inside the app container to create the `notes` table.

**Step 3: Manual verification**

1. Login as `owner@dom.app` / `admin123`
2. Verify "Заметки" appears in sidebar before "Уведомления"
3. Click it — should show empty state with "Пока нет заметок"
4. Create a note with a title, content, and color
5. Verify card appears with colored border and glow
6. Click the card, verify edit modal opens
7. Update the note and verify changes persist
8. Delete a note and verify it disappears
9. Test search filter

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat(notes): complete notes feature implementation"
```
