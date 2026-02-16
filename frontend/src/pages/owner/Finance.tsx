import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Check } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from "recharts";
import {
  getPayroll, createPayroll, updatePayroll,
  getExpenses, createExpense,
  getIncome, createIncome,
  getFinanceSummary,
} from "../../api/finance";
import { getUsers } from "../../api/users";
import type { ExpenseCategory, PayrollStatus } from "../../types";
import { formatMoney } from "../../utils/formatters";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Modal from "../../components/ui/Modal";
import Badge from "../../components/ui/Badge";
import { Table, Td } from "../../components/ui/Table";
import LoadingSpinner from "../../components/shared/LoadingSpinner";

const tabs = [
  { id: "payroll", label: "finance.payroll" },
  { id: "expenses", label: "finance.expenses" },
  { id: "income", label: "finance.income" },
  { id: "reports", label: "finance.reports" },
] as const;

type TabId = (typeof tabs)[number]["id"];

const categoryLabels: Record<ExpenseCategory, string> = {
  household: "Хозяйство",
  transport: "Транспорт",
  food: "Еда",
  entertainment: "Развлечения",
  other: "Прочее",
};

const categoryColors: Record<ExpenseCategory, string> = {
  household: "#3b82f6",
  transport: "#22c55e",
  food: "#f59e0b",
  entertainment: "#a855f7",
  other: "#6b7280",
};

const PIE_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#a855f7", "#6b7280"];

export default function Finance() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabId>("payroll");

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
        {t("finance.title")}
      </h1>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            {t(tab.label)}
          </button>
        ))}
      </div>

      {activeTab === "payroll" && <PayrollTab t={t} queryClient={queryClient} />}
      {activeTab === "expenses" && <ExpensesTab t={t} queryClient={queryClient} />}
      {activeTab === "income" && <IncomeTab t={t} queryClient={queryClient} />}
      {activeTab === "reports" && <ReportsTab t={t} />}
    </div>
  );
}

function PayrollTab({ t, queryClient }: { t: (k: string) => string; queryClient: ReturnType<typeof useQueryClient> }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ user_id: "", period_start: "", period_end: "", base_salary: "", bonuses: "0", deductions: "0" });

  const { data: records = [], isLoading } = useQuery({ queryKey: ["payroll"], queryFn: () => getPayroll() });
  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: () => getUsers() });
  const staffList = users.filter((u) => u.role !== "owner");

  const createMut = useMutation({
    mutationFn: createPayroll,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["payroll"] }); setModalOpen(false); },
  });

  const markPaidMut = useMutation({
    mutationFn: (id: number) => updatePayroll(id, { status: "paid" as PayrollStatus, paid_date: format(new Date(), "yyyy-MM-dd") }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payroll"] }),
  });

  function handleSubmit() {
    const base = Number(form.base_salary);
    const bon = Number(form.bonuses);
    const ded = Number(form.deductions);
    createMut.mutate({
      user_id: Number(form.user_id),
      period_start: form.period_start,
      period_end: form.period_end,
      base_salary: base,
      bonuses: bon,
      deductions: ded,
      net_amount: base + bon - ded,
    });
  }

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={16} />
          Создать запись
        </Button>
      </div>

      {records.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">Нет данных</div>
      ) : (
        <div className="overflow-x-auto">
          <Table headers={["Сотрудник", t("finance.period"), "Оклад", "Бонусы", "Вычеты", t("finance.total"), t("staff.status"), ""]}>
            {records.map((r) => {
              const user = users.find((u) => u.id === r.user_id);
              return (
                <tr key={r.id}>
                  <Td className="font-medium">{user?.full_name || `ID ${r.user_id}`}</Td>
                  <Td className="text-xs">
                    {format(parseISO(r.period_start), "d MMM", { locale: ru })} — {format(parseISO(r.period_end), "d MMM", { locale: ru })}
                  </Td>
                  <Td>{formatMoney(r.base_salary)}</Td>
                  <Td>{formatMoney(r.bonuses)}</Td>
                  <Td>{formatMoney(r.deductions)}</Td>
                  <Td className="font-medium">{formatMoney(r.net_amount)}</Td>
                  <Td>
                    <Badge color={r.status === "paid" ? "green" : "orange"}>
                      {r.status === "paid" ? t("finance.paid") : t("finance.pendingPayment")}
                    </Badge>
                  </Td>
                  <Td>
                    {r.status === "pending" && (
                      <button
                        onClick={() => markPaidMut.mutate(r.id)}
                        className="p-1.5 rounded-md text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                        title={t("finance.paid")}
                      >
                        <Check size={15} />
                      </button>
                    )}
                  </Td>
                </tr>
              );
            })}
          </Table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Создать запись">
        <div className="space-y-4">
          <Select
            label="Сотрудник"
            options={[{ value: "", label: "Выберите" }, ...staffList.map((u) => ({ value: String(u.id), label: u.full_name }))]}
            value={form.user_id}
            onChange={(e) => setForm({ ...form, user_id: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Начало периода" type="date" value={form.period_start} onChange={(e) => setForm({ ...form, period_start: e.target.value })} />
            <Input label="Конец периода" type="date" value={form.period_end} onChange={(e) => setForm({ ...form, period_end: e.target.value })} />
          </div>
          <Input label="Оклад" type="number" value={form.base_salary} onChange={(e) => setForm({ ...form, base_salary: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Бонусы" type="number" value={form.bonuses} onChange={(e) => setForm({ ...form, bonuses: e.target.value })} />
            <Input label="Вычеты" type="number" value={form.deductions} onChange={(e) => setForm({ ...form, deductions: e.target.value })} />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleSubmit} loading={createMut.isPending}>{t("common.save")}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function ExpensesTab({ t, queryClient }: { t: (k: string) => string; queryClient: ReturnType<typeof useQueryClient> }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ category: "household" as ExpenseCategory, description: "", amount: "", date: "" });

  const { data: expenses = [], isLoading } = useQuery({ queryKey: ["expenses"], queryFn: getExpenses });

  const createMut = useMutation({
    mutationFn: createExpense,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["expenses"] }); setModalOpen(false); },
  });

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={16} />
          Добавить расход
        </Button>
      </div>

      {expenses.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">Нет данных</div>
      ) : (
        <Table headers={["Категория", "Описание", t("finance.amount"), "Дата"]}>
          {expenses.map((e) => (
            <tr key={e.id}>
              <Td><Badge color="blue">{categoryLabels[e.category]}</Badge></Td>
              <Td>{e.description}</Td>
              <Td className="font-medium">{formatMoney(e.amount)}</Td>
              <Td>{format(parseISO(e.date), "d MMM yyyy", { locale: ru })}</Td>
            </tr>
          ))}
        </Table>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Добавить расход">
        <div className="space-y-4">
          <Select
            label="Категория"
            options={Object.entries(categoryLabels).map(([v, l]) => ({ value: v, label: l }))}
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value as ExpenseCategory })}
          />
          <Input label="Описание" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Input label={t("finance.amount")} type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <Input label="Дата" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={() => createMut.mutate({ ...form, amount: Number(form.amount) })} loading={createMut.isPending}>{t("common.save")}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function IncomeTab({ t, queryClient }: { t: (k: string) => string; queryClient: ReturnType<typeof useQueryClient> }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ source: "", description: "", amount: "", date: "", category: "" });

  const { data: incomeList = [], isLoading } = useQuery({ queryKey: ["income"], queryFn: getIncome });

  const createMut = useMutation({
    mutationFn: createIncome,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["income"] }); setModalOpen(false); },
  });

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={16} />
          Добавить доход
        </Button>
      </div>

      {incomeList.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">Нет данных</div>
      ) : (
        <Table headers={["Источник", "Описание", t("finance.amount"), "Дата"]}>
          {incomeList.map((i) => (
            <tr key={i.id}>
              <Td className="font-medium">{i.source}</Td>
              <Td>{i.description}</Td>
              <Td className="font-medium">{formatMoney(i.amount)}</Td>
              <Td>{format(parseISO(i.date), "d MMM yyyy", { locale: ru })}</Td>
            </tr>
          ))}
        </Table>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Добавить доход">
        <div className="space-y-4">
          <Input label="Источник" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
          <Input label="Описание" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Input label={t("finance.amount")} type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <Input label="Категория" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          <Input label="Дата" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={() => createMut.mutate({ ...form, amount: Number(form.amount) })} loading={createMut.isPending}>{t("common.save")}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function ReportsTab({ t }: { t: (k: string) => string }) {
  const { data: summary, isLoading } = useQuery({
    queryKey: ["finance-summary"],
    queryFn: () => getFinanceSummary(),
  });

  if (isLoading) return <LoadingSpinner />;
  if (!summary) return <div className="text-center py-8 text-gray-500 dark:text-gray-400">Нет данных</div>;

  const pieData = summary.expense_by_category.map((item) => ({
    name: categoryLabels[item.category as ExpenseCategory] || item.category,
    value: item.amount,
  }));

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">{t("finance.income")}</div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
            {formatMoney(summary.total_income)}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">{t("finance.expenses")}</div>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
            {formatMoney(summary.total_expenses + summary.total_payroll)}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">Баланс</div>
          <div className={`text-2xl font-bold mt-1 ${summary.balance >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
            {formatMoney(summary.balance)}
          </div>
        </div>
      </div>

      {/* Monthly bar chart */}
      {summary.monthly.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
            Доходы и расходы по месяцам
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={summary.monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: number) => formatMoney(value)} />
              <Legend />
              <Bar dataKey="income" name={t("finance.income")} fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" name={t("finance.expenses")} fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Expense pie chart */}
      {pieData.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
            Расходы по категориям
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {pieData.map((_, idx) => (
                  <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatMoney(value)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
