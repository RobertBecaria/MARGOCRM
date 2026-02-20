import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { updateUser } from "../../api/users";
import { changePassword } from "../../api/auth";
import { getCategories, createCategory, updateCategory, deleteCategory } from "../../api/categories";
import type { FinanceCategory } from "../../types";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";

export default function Settings() {
  const { t } = useTranslation();
  const { user, loadUser } = useAuth();
  const queryClient = useQueryClient();

  const [name, setName] = useState(user?.full_name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [saved, setSaved] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [pwdMsg, setPwdMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const saveMut = useMutation({
    mutationFn: () =>
      updateUser(user!.id, { full_name: name, phone: phone || null }),
    onSuccess: async () => {
      await loadUser();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const pwdMut = useMutation({
    mutationFn: () => changePassword(currentPassword, newPassword),
    onSuccess: () => {
      setPwdMsg({ type: "success", text: t("settings.passwordChanged") });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setTimeout(() => setPwdMsg(null), 3000);
    },
    onError: () => {
      setPwdMsg({ type: "error", text: t("settings.wrongPassword") });
    },
  });

  function handleChangePassword() {
    setPwdMsg(null);
    if (newPassword !== confirmNewPassword) {
      setPwdMsg({ type: "error", text: t("auth.passwordMismatch") });
      return;
    }
    pwdMut.mutate();
  }

  return (
    <div className="space-y-6 max-w-2xl animate-fade-in">
      <h1 className="text-xl font-semibold text-purple-200">
        {t("nav.settings")}
      </h1>

      {/* Profile */}
      <div className="glass-card rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-300">
          {t("settings.profile")}
        </h2>
        <Input
          label={t("staff.name")}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          label={t("staff.phone")}
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <div className="flex items-center gap-3">
          <Button onClick={() => saveMut.mutate()} loading={saveMut.isPending}>
            {t("common.save")}
          </Button>
          {saved && (
            <span className="text-sm text-green-400">
              {t("common.success")}
            </span>
          )}
        </div>
      </div>

      {/* Change Password */}
      <div className="glass-card rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-300">
          {t("settings.changePassword")}
        </h2>
        <Input
          label={t("settings.currentPassword")}
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
        <Input
          label={t("settings.newPassword")}
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <Input
          label={t("settings.confirmNewPassword")}
          type="password"
          value={confirmNewPassword}
          onChange={(e) => setConfirmNewPassword(e.target.value)}
        />
        <div className="flex items-center gap-3">
          <Button
            onClick={handleChangePassword}
            loading={pwdMut.isPending}
            disabled={!currentPassword || !newPassword || !confirmNewPassword}
          >
            {t("settings.changePassword")}
          </Button>
          {pwdMsg && (
            <span className={`text-sm ${pwdMsg.type === "success" ? "text-green-400" : "text-red-400"}`}>
              {pwdMsg.text}
            </span>
          )}
        </div>
      </div>

      {/* Finance Categories */}
      <div className="glass-card rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-300">
          {t("settings.financeCategories")}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <CategoryList type="expense" label={t("finance.expenses")} queryClient={queryClient} />
          <CategoryList type="income" label={t("finance.income")} queryClient={queryClient} />
        </div>
      </div>

    </div>
  );
}

function CategoryList({
  type,
  label,
  queryClient,
}: {
  type: "expense" | "income";
  label: string;
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const { t } = useTranslation();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");

  const { data: categories = [] } = useQuery({
    queryKey: ["categories", type],
    queryFn: () => getCategories(type),
  });

  const createMut = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setNewName("");
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => updateCategory(id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setEditingId(null);
      setEditName("");
    },
  });

  const deleteMut = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  function handleAdd() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    createMut.mutate({ name: trimmed, type });
  }

  function startEdit(cat: FinanceCategory) {
    setEditingId(cat.id);
    setEditName(cat.name);
  }

  function handleSaveEdit(id: number) {
    const trimmed = editName.trim();
    if (!trimmed) return;
    updateMut.mutate({ id, name: trimmed });
  }

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide">
        {label}
      </h3>
      <div className="space-y-1">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="flex items-center gap-2 group rounded-lg px-2 py-1.5 hover:bg-white/[0.04] transition-colors"
          >
            {editingId === cat.id ? (
              <input
                className="flex-1 bg-white/10 border border-white/10 rounded px-2 py-1 text-sm text-gray-200 outline-none focus:border-blue-500"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveEdit(cat.id);
                  if (e.key === "Escape") setEditingId(null);
                }}
                onBlur={() => handleSaveEdit(cat.id)}
                autoFocus
              />
            ) : (
              <span className="flex-1 text-sm text-gray-300">{cat.name}</span>
            )}
            {editingId !== cat.id && (
              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => startEdit(cat)}
                  className="p-1 rounded text-gray-500 hover:text-blue-400 hover:bg-white/10"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => deleteMut.mutate(cat.id)}
                  className="p-1 rounded text-gray-500 hover:text-red-400 hover:bg-white/10"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      {/* Add new category */}
      <div className="flex items-center gap-2 pt-1">
        <input
          className="flex-1 bg-white/10 border border-white/10 rounded px-2 py-1.5 text-sm text-gray-200 placeholder-gray-600 outline-none focus:border-blue-500"
          placeholder={t("settings.categoryName")}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAdd();
          }}
        />
        <button
          onClick={handleAdd}
          disabled={!newName.trim()}
          className="p-1.5 rounded-lg text-gray-400 hover:text-green-400 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <Plus size={15} />
        </button>
      </div>
    </div>
  );
}
