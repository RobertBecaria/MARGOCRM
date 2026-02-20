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
