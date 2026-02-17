import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, CheckSquare, Wallet, Bell, Plus, DollarSign, Receipt } from "lucide-react";
import { formatDistanceToNow, parseISO, format } from "date-fns";
import { ru } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../hooks/useAuth";
import { getSchedules } from "../../api/schedules";
import { getTasks, createTask } from "../../api/tasks";
import { getNotifications } from "../../api/notifications";
import { getFinanceSummary, createIncome, createExpense } from "../../api/finance";
import { getUsers } from "../../api/users";
import { formatMoney } from "../../utils/formatters";
import type { TaskPriority, ExpenseCategory } from "../../types";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Modal from "../../components/ui/Modal";
import LoadingSpinner from "../../components/shared/LoadingSpinner";

export default function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const today = format(new Date(), "yyyy-MM-dd");

  const { data: todaySchedules = [] } = useQuery({
    queryKey: ["schedules-today"],
    queryFn: () => getSchedules({ date_from: today, date_to: today }),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks-pending"],
    queryFn: () => getTasks(),
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => getNotifications(),
  });

  const { data: summary, isLoading } = useQuery({
    queryKey: ["finance-summary"],
    queryFn: () => getFinanceSummary(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => getUsers(),
  });
  const staffList = users.filter((u) => u.role !== "owner");

  const pendingTasks = useMemo(() => tasks.filter((t) => t.status !== "done"), [tasks]);
  const { unreadCount, recentNotifs } = useMemo(() => {
    let count = 0;
    for (const n of notifications) {
      if (!n.is_read) count++;
    }
    return { unreadCount: count, recentNotifs: notifications.slice(0, 10) };
  }, [notifications]);

  // Task creation modal
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: "", description: "", assigned_to: "", priority: "medium" as TaskPriority, due_date: "" });

  const createTaskMut = useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks-pending"] });
      setTaskModalOpen(false);
      setTaskForm({ title: "", description: "", assigned_to: "", priority: "medium", due_date: "" });
    },
  });

  // Expense creation modal
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ category: "other" as ExpenseCategory, description: "", amount: "", date: "" });

  const createExpenseMut = useMutation({
    mutationFn: createExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["finance-summary"] });
      setExpenseModalOpen(false);
      setExpenseForm({ category: "other", description: "", amount: "", date: "" });
    },
  });

  // Income creation modal
  const [incomeModalOpen, setIncomeModalOpen] = useState(false);
  const [incomeForm, setIncomeForm] = useState({ source: "", description: "", amount: "", date: "", category: "" });

  const createIncomeMut = useMutation({
    mutationFn: createIncome,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["income"] });
      queryClient.invalidateQueries({ queryKey: ["finance-summary"] });
      setIncomeModalOpen(false);
      setIncomeForm({ source: "", description: "", amount: "", date: "", category: "" });
    },
  });

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-xl font-semibold text-purple-200">
        {t("dashboard.welcome")}, {user?.full_name}
      </h1>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={Users}
          label={t("dashboard.staffOnShift")}
          value={String(todaySchedules.length)}
          color="blue"
          delay={0}
        />
        <SummaryCard
          icon={CheckSquare}
          label={t("dashboard.pendingTasks")}
          value={String(pendingTasks.length)}
          color="orange"
          delay={1}
        />
        <SummaryCard
          icon={Wallet}
          label={t("dashboard.monthlyExpenses")}
          value={summary ? formatMoney(summary.total_expenses) : "—"}
          color="red"
          delay={2}
        />
        <SummaryCard
          icon={Bell}
          label={t("dashboard.unreadNotifications")}
          value={String(unreadCount)}
          color="purple"
          delay={3}
        />
      </div>

      {/* Finance overview */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SummaryCard
            icon={DollarSign}
            label={t("finance.income")}
            value={formatMoney(summary.total_income)}
            color="green"
            delay={4}
          />
          <SummaryCard
            icon={Receipt}
            label={t("finance.expenses")}
            value={formatMoney(summary.total_expenses + summary.total_payroll)}
            color="red"
            delay={5}
          />
          <SummaryCard
            icon={Wallet}
            label={t("finance.balance")}
            value={formatMoney(summary.balance)}
            color={summary.balance >= 0 ? "green" : "red"}
            delay={6}
          />
        </div>
      )}

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => setTaskModalOpen(true)}>
          <Plus size={16} />
          {t("dashboard.createTask")}
        </Button>
        <Button variant="secondary" onClick={() => setExpenseModalOpen(true)}>
          <Receipt size={16} />
          {t("dashboard.addExpense")}
        </Button>
        <Button variant="secondary" onClick={() => setIncomeModalOpen(true)}>
          <DollarSign size={16} />
          {t("dashboard.addIncome")}
        </Button>
      </div>

      {/* Recent activity */}
      <div className="glass-card rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-300 mb-3">
          {t("dashboard.recentEvents")}
        </h2>
        {recentNotifs.length === 0 ? (
          <div className="text-sm text-gray-500">{t("dashboard.noEvents")}</div>
        ) : (
          <div className="space-y-1">
            {recentNotifs.map((n) => (
              <div
                key={n.id}
                className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/[0.03] transition-colors"
              >
                <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${n.is_read ? "bg-gray-600" : "bg-blue-400 shadow-[0_0_6px_rgba(59,130,246,0.5)]"}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-purple-200">{n.title}</div>
                  <div className="text-xs text-gray-500 truncate">{n.message}</div>
                </div>
                <span className="text-[10px] text-gray-600 whitespace-nowrap">
                  {formatDistanceToNow(parseISO(n.created_at), { addSuffix: true, locale: ru })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Task Modal */}
      <Modal open={taskModalOpen} onClose={() => setTaskModalOpen(false)} title={t("dashboard.createTask")}>
        <div className="space-y-4">
          <Input label={t("tasks.taskName")} value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} />
          <Input label={t("tasks.description")} value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} />
          <Select
            label={t("tasks.assignee")}
            options={[{ value: "", label: t("tasks.selectAssignee") }, ...staffList.map((u) => ({ value: String(u.id), label: u.full_name }))]}
            value={taskForm.assigned_to}
            onChange={(e) => setTaskForm({ ...taskForm, assigned_to: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label={t("tasks.priority")}
              options={[
                { value: "low", label: t("tasks.low") },
                { value: "medium", label: t("tasks.medium") },
                { value: "high", label: t("tasks.high") },
                { value: "urgent", label: t("tasks.urgent") },
              ]}
              value={taskForm.priority}
              onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as TaskPriority })}
            />
            <Input label={t("tasks.dueDate")} type="date" value={taskForm.due_date} onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })} />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" onClick={() => setTaskModalOpen(false)}>{t("common.cancel")}</Button>
            <Button
              onClick={() => createTaskMut.mutate({
                title: taskForm.title,
                description: taskForm.description || undefined,
                assigned_to: Number(taskForm.assigned_to),
                priority: taskForm.priority,
                due_date: taskForm.due_date || undefined,
              })}
              loading={createTaskMut.isPending}
              disabled={!taskForm.title || !taskForm.assigned_to}
            >
              {t("common.save")}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Expense Modal */}
      <Modal open={expenseModalOpen} onClose={() => setExpenseModalOpen(false)} title={t("dashboard.addExpense")}>
        <div className="space-y-4">
          <Select
            label={t("finance.category")}
            options={[
              { value: "household", label: t("finance.catHousehold") },
              { value: "transport", label: t("finance.catTransport") },
              { value: "food", label: t("finance.catFood") },
              { value: "entertainment", label: t("finance.catEntertainment") },
              { value: "other", label: t("finance.catOther") },
            ]}
            value={expenseForm.category}
            onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value as ExpenseCategory })}
          />
          <Input label={t("common.description")} value={expenseForm.description} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} />
          <Input label={t("finance.amount")} type="number" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} />
          <Input label={t("common.date")} type="date" value={expenseForm.date} onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })} />
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" onClick={() => setExpenseModalOpen(false)}>{t("common.cancel")}</Button>
            <Button
              onClick={() => createExpenseMut.mutate({ ...expenseForm, amount: Number(expenseForm.amount) })}
              loading={createExpenseMut.isPending}
              disabled={!expenseForm.description || !expenseForm.amount}
            >
              {t("common.save")}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Income Modal */}
      <Modal open={incomeModalOpen} onClose={() => setIncomeModalOpen(false)} title={t("dashboard.addIncome")}>
        <div className="space-y-4">
          <Input label={t("finance.source")} value={incomeForm.source} onChange={(e) => setIncomeForm({ ...incomeForm, source: e.target.value })} />
          <Input label={t("common.description")} value={incomeForm.description} onChange={(e) => setIncomeForm({ ...incomeForm, description: e.target.value })} />
          <Input label={t("finance.amount")} type="number" value={incomeForm.amount} onChange={(e) => setIncomeForm({ ...incomeForm, amount: e.target.value })} />
          <Input label={t("finance.category")} value={incomeForm.category} onChange={(e) => setIncomeForm({ ...incomeForm, category: e.target.value })} />
          <Input label={t("common.date")} type="date" value={incomeForm.date} onChange={(e) => setIncomeForm({ ...incomeForm, date: e.target.value })} />
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" onClick={() => setIncomeModalOpen(false)}>{t("common.cancel")}</Button>
            <Button
              onClick={() => createIncomeMut.mutate({ ...incomeForm, amount: Number(incomeForm.amount) })}
              loading={createIncomeMut.isPending}
              disabled={!incomeForm.source || !incomeForm.amount}
            >
              {t("common.save")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

const glowColors = {
  blue: "rgba(59, 130, 246, 0.15)",
  orange: "rgba(249, 115, 22, 0.15)",
  red: "rgba(239, 68, 68, 0.15)",
  purple: "rgba(139, 92, 246, 0.15)",
  green: "rgba(34, 197, 94, 0.15)",
};

const iconBg = {
  blue: "bg-blue-500/15 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]",
  orange: "bg-orange-500/15 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.3)]",
  red: "bg-red-500/15 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.3)]",
  purple: "bg-purple-500/15 text-purple-400 shadow-[0_0_15px_rgba(139,92,246,0.3)]",
  green: "bg-green-500/15 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.3)]",
};

function SummaryCard({ icon: Icon, label, value, color, delay }: {
  icon: typeof Users;
  label: string;
  value: string;
  color: "blue" | "orange" | "red" | "purple" | "green";
  delay: number;
}) {
  return (
    <div
      className="glass-card glow-border rounded-xl p-4 animate-slide-up"
      style={{
        animationDelay: `${delay * 0.1}s`,
        animationFillMode: "both",
      }}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-xl ${iconBg[color]}`}>
          <Icon size={20} />
        </div>
        <div>
          <div className="text-2xl font-bold stat-value">{value}</div>
          <div className="text-xs text-gray-500">{label}</div>
        </div>
      </div>
      {/* Bottom glow line */}
      <div
        className="mt-3 h-[2px] rounded-full opacity-60"
        style={{ background: `linear-gradient(90deg, transparent, ${glowColors[color]}, transparent)` }}
      />
    </div>
  );
}
