# Notes (Заметки) Feature Design

## Summary
Add a personal notepad feature for the owner/manager. Color-coded glass cards displayed in a grid layout, accessed via a new sidebar navigation item placed before Notifications.

## Data Model
New `Note` table:
- `id` (PK, int, auto-increment)
- `user_id` (FK → users)
- `title` (String 200)
- `content` (Text)
- `color` (Enum: yellow, blue, green, pink, purple, orange)
- `created_at` (DateTime, default now)
- `updated_at` (DateTime, default now, on-update now)

## API Endpoints
All require JWT auth, owner/manager roles only.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/notes` | List all notes for current user (newest first) |
| POST | `/api/notes` | Create a note |
| PUT | `/api/notes/{id}` | Update a note |
| DELETE | `/api/notes/{id}` | Delete a note |

## Frontend

### Navigation
- Sidebar: Add `StickyNote` icon (lucide-react) before Notifications in `ownerNav`
- Route: `/notes` → `pages/owner/Notes.tsx`

### Notes Page
- Header with title "Заметки" + "Новая заметка" button
- Responsive card grid: 3 cols desktop, 2 tablet, 1 mobile
- Each card: glass-card with colored top border/glow, title, content preview (2-3 lines), date
- Click card → modal to view/edit
- Create/Edit modal: title input, content textarea, 6 color circles picker, Save/Delete
- Empty state: "Пока нет заметок" message
- Search filter at top

### Color Mapping
| Color | Hex | Theme Variable |
|-------|-----|----------------|
| Yellow | #f59e0b | - |
| Blue | #3b82f6 | --color-neon-blue |
| Green | #10b981 | - |
| Pink | #ec4899 | --color-neon-pink |
| Purple | #8b5cf6 | --color-neon-purple |
| Orange | #f97316 | - |

## Decisions
- General notepad (not linked to entities)
- Card grid layout (not list or kanban)
- Full page (not slide-out panel or modal)
- Owner/Manager access only
