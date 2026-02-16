import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, UserX, Search } from "lucide-react";
import { getUsers, createUser, updateUser, deactivateUser } from "../../api/users";
import type { Role, User } from "../../types";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Modal from "../../components/ui/Modal";
import Badge from "../../components/ui/Badge";
import { Table, Td } from "../../components/ui/Table";
import LoadingSpinner from "../../components/shared/LoadingSpinner";

const roleBadgeColor: Record<Role, "blue" | "orange" | "purple" | "green" | "red" | "cyan"> = {
  driver: "blue",
  chef: "orange",
  assistant: "purple",
  cleaner: "green",
  manager: "red",
  owner: "cyan",
};

// Role options are built dynamically in the component using i18n

const ROLE_VALUES = ["manager", "driver", "chef", "assistant", "cleaner"] as const;

interface StaffFormData {
  email: string;
  password: string;
  full_name: string;
  role: Role;
  phone: string;
}

const emptyForm: StaffFormData = {
  email: "",
  password: "",
  full_name: "",
  role: "assistant",
  phone: "",
};

export default function Staff() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState<StaffFormData>(emptyForm);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => getUsers(),
  });

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<User> }) => updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      closeModal();
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: deactivateUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setConfirmId(null);
    },
  });

  function openCreate() {
    setEditingUser(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(user: User) {
    setEditingUser(user);
    setForm({
      email: user.email,
      password: "",
      full_name: user.full_name,
      role: user.role,
      phone: user.phone || "",
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingUser(null);
    setForm(emptyForm);
  }

  function handleSubmit() {
    if (editingUser) {
      updateMutation.mutate({
        id: editingUser.id,
        data: { full_name: form.full_name, role: form.role, phone: form.phone || null },
      });
    } else {
      createMutation.mutate(form);
    }
  }

  const filtered = users.filter((u) => {
    const matchesSearch = u.full_name.toLowerCase().includes(search.toLowerCase());
    const matchesRole = !roleFilter || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
          {t("staff.title")}
        </h1>
        <Button onClick={openCreate}>
          <Plus size={16} />
          {t("staff.addStaff")}
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={t("common.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <Select
          options={[
            { value: "", label: t("staff.allStaff") },
            ...ROLE_VALUES.map((r) => ({ value: r, label: t(`roles.${r}`) })),
          ]}
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="sm:w-48"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          {t("staff.noStaff")}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <Table headers={[t("staff.name"), t("staff.role"), t("staff.phone"), t("staff.email"), t("staff.status"), ""]}>
              {filtered.map((user) => (
                <tr key={user.id}>
                  <Td className="font-medium">{user.full_name}</Td>
                  <Td>
                    <Badge color={roleBadgeColor[user.role]}>
                      {t(`roles.${user.role}`)}
                    </Badge>
                  </Td>
                  <Td>{user.phone || "—"}</Td>
                  <Td>{user.email}</Td>
                  <Td>
                    <Badge color={user.is_active ? "green" : "gray"}>
                      {user.is_active ? t("staff.active") : t("staff.inactive")}
                    </Badge>
                  </Td>
                  <Td>
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEdit(user)}
                        className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                        title={t("common.edit")}
                      >
                        <Pencil size={15} />
                      </button>
                      {user.is_active && (
                        <button
                          onClick={() => setConfirmId(user.id)}
                          className="p-1.5 rounded-md text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                          title={t("common.delete")}
                        >
                          <UserX size={15} />
                        </button>
                      )}
                    </div>
                  </Td>
                </tr>
              ))}
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((user) => (
              <div
                key={user.id}
                className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {user.full_name}
                  </span>
                  <Badge color={roleBadgeColor[user.role]}>
                    {t(`roles.${user.role}`)}
                  </Badge>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
                  <div>{user.email}</div>
                  {user.phone && <div>{user.phone}</div>}
                </div>
                <div className="flex items-center justify-between pt-1">
                  <Badge color={user.is_active ? "green" : "gray"}>
                    {user.is_active ? t("staff.active") : t("staff.inactive")}
                  </Badge>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEdit(user)}
                      className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <Pencil size={15} />
                    </button>
                    {user.is_active && (
                      <button
                        onClick={() => setConfirmId(user.id)}
                        className="p-1.5 rounded-md text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                      >
                        <UserX size={15} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Create/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingUser ? t("common.edit") : t("staff.addStaff")}
      >
        <div className="space-y-4">
          <Input
            label={t("staff.name")}
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            required
          />
          <Input
            label={t("staff.email")}
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            disabled={!!editingUser}
            required
          />
          {!editingUser && (
            <Input
              label={t("auth.password")}
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          )}
          <Select
            label={t("staff.role")}
            options={ROLE_VALUES.map((r) => ({ value: r, label: t(`roles.${r}`) }))}
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
          />
          <Input
            label={t("staff.phone")}
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" onClick={closeModal}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSubmit} loading={isSaving}>
              {t("common.save")}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Deactivate Confirmation */}
      <Modal
        open={confirmId !== null}
        onClose={() => setConfirmId(null)}
        title={t("common.confirm")}
      >
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {t("staff.confirmDeactivate")}
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setConfirmId(null)}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="danger"
            loading={deactivateMutation.isPending}
            onClick={() => confirmId && deactivateMutation.mutate(confirmId)}
          >
            {t("common.delete")}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
