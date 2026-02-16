import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Calendar, Trash2 } from "lucide-react";
import { format, parseISO, isPast } from "date-fns";
import { ru } from "date-fns/locale";
import { getTasks, createTask, updateTask, deleteTask } from "../../api/tasks";
import { getUsers } from "../../api/users";
import type { Task, TaskStatus, TaskPriority } from "../../types";
import { PRIORITY_COLOR } from "../../utils/constants";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Modal from "../../components/ui/Modal";
import Badge from "../../components/ui/Badge";
import LoadingSpinner from "../../components/shared/LoadingSpinner";

const columns: { status: TaskStatus; label: string }[] = [
  { status: "pending", label: "tasks.pending" },
  { status: "in_progress", label: "tasks.inProgress" },
  { status: "done", label: "tasks.done" },
];

interface TaskForm {
  title: string;
  description: string;
  assigned_to: string;
  priority: TaskPriority;
  due_date: string;
}

const emptyForm: TaskForm = {
  title: "",
  description: "",
  assigned_to: "",
  priority: "medium",
  due_date: "",
};

export default function Tasks() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [form, setForm] = useState<TaskForm>(emptyForm);
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => getTasks(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => getUsers(),
  });

  const staffList = users.filter((u) => u.role !== "owner");
  const userById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);

  const createMut = useMutation({
    mutationFn: createTask,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tasks"] }); closeModal(); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateTask>[1] }) =>
      updateTask(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tasks"] }); closeModal(); },
  });

  const deleteMut = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tasks"] }); closeModal(); },
  });

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(task: Task) {
    setEditing(task);
    setForm({
      title: task.title,
      description: task.description || "",
      assigned_to: String(task.assigned_to),
      priority: task.priority,
      due_date: task.due_date || "",
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  function handleSubmit() {
    if (editing) {
      updateMut.mutate({
        id: editing.id,
        data: {
          title: form.title,
          description: form.description || undefined,
          assigned_to: Number(form.assigned_to),
          priority: form.priority,
          due_date: form.due_date || undefined,
        },
      });
    } else {
      createMut.mutate({
        title: form.title,
        description: form.description || undefined,
        assigned_to: Number(form.assigned_to),
        priority: form.priority,
        due_date: form.due_date || undefined,
      });
    }
  }

  function changeStatus(task: Task, status: TaskStatus) {
    updateMut.mutate({ id: task.id, data: { status } });
  }

  const filtered = tasks.filter((task) => {
    if (assigneeFilter && task.assigned_to !== Number(assigneeFilter)) return false;
    if (priorityFilter && task.priority !== priorityFilter) return false;
    return true;
  });

  function getColumnTasks(status: TaskStatus) {
    return filtered.filter((t) => t.status === status);
  }

  const isSaving = createMut.isPending || updateMut.isPending;

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
          {t("tasks.title")}
        </h1>
        <Button onClick={openCreate}>
          <Plus size={16} />
          {t("tasks.addTask")}
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Select
          options={[
            { value: "", label: t("staff.allStaff") },
            ...staffList.map((u) => ({ value: String(u.id), label: u.full_name })),
          ]}
          value={assigneeFilter}
          onChange={(e) => setAssigneeFilter(e.target.value)}
          className="sm:w-48"
        />
        <Select
          options={[
            { value: "", label: t("tasks.allPriorities") },
            { value: "low", label: t("tasks.low") },
            { value: "medium", label: t("tasks.medium") },
            { value: "high", label: t("tasks.high") },
            { value: "urgent", label: t("tasks.urgent") },
          ]}
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="sm:w-48"
        />
      </div>

      {/* Desktop: Kanban columns */}
      <div className="hidden md:grid grid-cols-3 gap-4">
        {columns.map((col) => {
          const colTasks = getColumnTasks(col.status);
          return (
            <div key={col.status} className="space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {t(col.label)}
                </h2>
                <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-full px-2 py-0.5">
                  {colTasks.length}
                </span>
              </div>
              <div className="space-y-2 min-h-[100px]">
                {colTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    userById={userById}
                    onClick={() => openEdit(task)}
                    onStatusChange={changeStatus}
                    t={t}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile: simple list */}
      <div className="md:hidden space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">{t("tasks.noTasks")}</div>
        ) : (
          filtered.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              userById={userById}
              onClick={() => openEdit(task)}
              onStatusChange={changeStatus}
              t={t}
            />
          ))
        )}
      </div>

      {/* Create/Edit modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? t("common.edit") : t("tasks.addTask")}
      >
        <div className="space-y-4">
          <Input
            label={t("tasks.taskName")}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
          <Input
            label={t("tasks.description")}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <Select
            label={t("tasks.assignee")}
            options={[
              { value: "", label: t("tasks.selectAssignee") },
              ...staffList.map((u) => ({ value: String(u.id), label: u.full_name })),
            ]}
            value={form.assigned_to}
            onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
          />
          <Select
            label={t("tasks.priority")}
            options={[
              { value: "low", label: t("tasks.low") },
              { value: "medium", label: t("tasks.medium") },
              { value: "high", label: t("tasks.high") },
              { value: "urgent", label: t("tasks.urgent") },
            ]}
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })}
          />
          <Input
            label={t("tasks.dueDate")}
            type="date"
            value={form.due_date}
            onChange={(e) => setForm({ ...form, due_date: e.target.value })}
          />
          <div className="flex gap-3 justify-end pt-2">
            {editing && (
              <Button
                variant="danger"
                loading={deleteMut.isPending}
                onClick={() => deleteMut.mutate(editing.id)}
              >
                <Trash2 size={14} />
                {t("common.delete")}
              </Button>
            )}
            <Button variant="secondary" onClick={closeModal}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSubmit} loading={isSaving}>
              {t("common.save")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function TaskCard({
  task,
  userById,
  onClick,
  onStatusChange,
  t,
}: {
  task: Task;
  userById: Map<number, { id: number; full_name: string }>;
  onClick: () => void;
  onStatusChange: (task: Task, status: TaskStatus) => void;
  t: (key: string) => string;
}) {
  const assignee = userById.get(task.assigned_to);
  const isOverdue = task.due_date && task.status !== "done" && isPast(parseISO(task.due_date));

  const nextStatus: Record<TaskStatus, TaskStatus | null> = {
    pending: "in_progress",
    in_progress: "done",
    done: null,
  };
  const next = nextStatus[task.status];

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-gray-900 rounded-lg border p-3 cursor-pointer hover:shadow-sm transition-shadow ${
        isOverdue
          ? "border-red-300 dark:border-red-800"
          : "border-gray-200 dark:border-gray-800"
      }`}
    >
      <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
        {task.title}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <Badge color={PRIORITY_COLOR[task.priority]}>
          {t(`tasks.${task.priority}`)}
        </Badge>
        {assignee && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {assignee.full_name}
          </span>
        )}
        {task.due_date && (
          <span className={`text-xs flex items-center gap-0.5 ${isOverdue ? "text-red-600 dark:text-red-400" : "text-gray-400"}`}>
            <Calendar size={12} />
            {format(parseISO(task.due_date), "d MMM", { locale: ru })}
          </span>
        )}
      </div>
      {next && (
        <button
          onClick={(e) => { e.stopPropagation(); onStatusChange(task, next); }}
          className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          &rarr; {t(`tasks.${next === "in_progress" ? "inProgress" : next}`)}
        </button>
      )}
    </div>
  );
}
