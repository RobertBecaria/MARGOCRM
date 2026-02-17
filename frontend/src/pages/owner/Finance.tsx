import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Check, Pencil, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from "recharts";
import {
  getPayroll, createPayroll, updatePayroll,
  getExpenses, createExpense, updateExpense, deleteExpense,
  getIncome, createIncome, updateIncome, deleteIncome,
  getFinanceSummary,
} from "../../api/finance";
import { getUsers } from "../../api/users";
import type { ExpenseCategory, PayrollStatus } from "../../types";
import { EXPENSE_CATEGORY_KEYS } from "../../utils/constants";
import { formatMoney } from "../../utils/formatters";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Modal from "../../components/ui/Modal";
import Badge from "../../components/ui/Badge";
import { Table, Td } from "../../components/ui/Table";
import LoadingSpinner from "../../components/shared/LoadingSpinner";

const tabs = [
  { id: "reports", label: "finance.reports" },
  { id: "income", label: "finance.income" },
  { id: "expenses", label: "finance.expenses" },
  { id: "payroll", label: "finance.payroll" },
] as const;

type TabId = (typeof tabs)[number]["id"];

const PIE_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#a855f7", "#6b7280"];

export default function Finance() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabId>("reports");

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-purple-200">
        {t("finance.title")}
      </h1>

      {/* Tabs */}
      <div className="flex border-b border-white/[0.06] overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-blue-400 text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-300"
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
  const userById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);

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
          {t("finance.createRecord")}
        </Button>
      </div>

      {records.length === 0 ? (
        <div className="text-center py-8 text-gray-500">{t("finance.noData")}</div>
      ) : (
        <div className="overflow-x-auto">
          <Table headers={[t("staff.employee"), t("finance.period"), t("finance.baseSalary"), t("finance.bonuses"), t("finance.deductions"), t("finance.total"), t("staff.status"), ""]}>
            {records.map((r) => {
              const user = userById.get(r.user_id);
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
                        className="p-1.5 rounded-md text-gray-400 hover:text-green-400 hover:bg-white/10"
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={t("finance.createRecord")}>
        <div className="space-y-4">
          <Select
            label={t("staff.employee")}
            options={[{ value: "", label: t("finance.select") }, ...staffList.map((u) => ({ value: String(u.id), label: u.full_name }))]}
            value={form.user_id}
            onChange={(e) => setForm({ ...form, user_id: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input label={t("finance.periodStart")} type="date" value={form.period_start} onChange={(e) => setForm({ ...form, period_start: e.target.value })} />
            <Input label={t("finance.periodEnd")} type="date" value={form.period_end} onChange={(e) => setForm({ ...form, period_end: e.target.value })} />
          </div>
          <Input label={t("finance.baseSalary")} type="number" value={form.base_salary} onChange={(e) => setForm({ ...form, base_salary: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label={t("finance.bonuses")} type="number" value={form.bonuses} onChange={(e) => setForm({ ...form, bonuses: e.target.value })} />
            <Input label={t("finance.deductions")} type="number" value={form.deductions} onChange={(e) => setForm({ ...form, deductions: e.target.value })} />
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
  const [editing, setEditing] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({ category: "household" as ExpenseCategory, description: "", amount: "", date: "" });

  const { data: expenses = [], isLoading } = useQuery({ queryKey: ["expenses"], queryFn: getExpenses });

  const createMut = useMutation({
    mutationFn: createExpense,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["expenses"] }); queryClient.invalidateQueries({ queryKey: ["finance-summary"] }); closeModal(); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateExpense>[1] }) => updateExpense(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["expenses"] }); queryClient.invalidateQueries({ queryKey: ["finance-summary"] }); closeModal(); },
  });

  const deleteMut = useMutation({
    mutationFn: deleteExpense,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["expenses"] }); queryClient.invalidateQueries({ queryKey: ["finance-summary"] }); setConfirmDeleteId(null); },
  });

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setForm({ category: "household", description: "", amount: "", date: "" });
  }

  function openEdit(e: typeof expenses[0]) {
    setEditing(e.id);
    setForm({ category: e.category, description: e.description, amount: String(e.amount), date: e.date });
    setModalOpen(true);
  }

  function handleSubmit() {
    const payload = { ...form, amount: Number(form.amount) };
    if (editing) {
      updateMut.mutate({ id: editing, data: payload });
    } else {
      createMut.mutate(payload);
    }
  }

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { closeModal(); setModalOpen(true); }}>
          <Plus size={16} />
          {t("finance.addExpense")}
        </Button>
      </div>

      {expenses.length === 0 ? (
        <div className="text-center py-8 text-gray-500">{t("finance.noData")}</div>
      ) : (
        <Table headers={[t("finance.category"), t("common.description"), t("finance.amount"), t("common.date"), ""]}>
          {expenses.map((e) => (
            <tr key={e.id}>
              <Td><Badge color="blue">{t(EXPENSE_CATEGORY_KEYS[e.category])}</Badge></Td>
              <Td>{e.description}</Td>
              <Td className="font-medium">{formatMoney(e.amount)}</Td>
              <Td>{format(parseISO(e.date), "d MMM yyyy", { locale: ru })}</Td>
              <Td>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(e)} className="p-1.5 rounded-md text-gray-400 hover:text-blue-400 hover:bg-white/10" title={t("common.edit")}>
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => setConfirmDeleteId(e.id)} className="p-1.5 rounded-md text-gray-400 hover:text-red-400 hover:bg-white/10" title={t("common.delete")}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </Td>
            </tr>
          ))}
        </Table>
      )}

      <Modal open={modalOpen} onClose={closeModal} title={editing ? t("finance.editExpense") : t("finance.addExpense")}>
        <div className="space-y-4">
          <Select
            label={t("finance.category")}
            options={Object.entries(EXPENSE_CATEGORY_KEYS).map(([v, key]) => ({ value: v, label: t(key) }))}
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value as ExpenseCategory })}
          />
          <Input label={t("common.description")} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Input label={t("finance.amount")} type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <Input label={t("common.date")} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" onClick={closeModal}>{t("common.cancel")}</Button>
            <Button onClick={handleSubmit} loading={createMut.isPending || updateMut.isPending}>{t("common.save")}</Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <Modal open={confirmDeleteId !== null} onClose={() => setConfirmDeleteId(null)} title={t("finance.confirmDelete")}>
        <div className="space-y-4">
          <p className="text-sm text-gray-400">{t("finance.confirmDelete")}</p>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setConfirmDeleteId(null)}>{t("common.cancel")}</Button>
            <Button onClick={() => confirmDeleteId && deleteMut.mutate(confirmDeleteId)} loading={deleteMut.isPending}>
              {t("common.delete")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function IncomeTab({ t, queryClient }: { t: (k: string) => string; queryClient: ReturnType<typeof useQueryClient> }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({ source: "", description: "", amount: "", date: "", category: "" });

  const { data: incomeList = [], isLoading } = useQuery({ queryKey: ["income"], queryFn: getIncome });

  const createMut = useMutation({
    mutationFn: createIncome,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["income"] }); queryClient.invalidateQueries({ queryKey: ["finance-summary"] }); closeModal(); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateIncome>[1] }) => updateIncome(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["income"] }); queryClient.invalidateQueries({ queryKey: ["finance-summary"] }); closeModal(); },
  });

  const deleteMut = useMutation({
    mutationFn: deleteIncome,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["income"] }); queryClient.invalidateQueries({ queryKey: ["finance-summary"] }); setConfirmDeleteId(null); },
  });

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setForm({ source: "", description: "", amount: "", date: "", category: "" });
  }

  function openEdit(i: typeof incomeList[0]) {
    setEditing(i.id);
    setForm({ source: i.source, description: i.description, amount: String(i.amount), date: i.date, category: i.category });
    setModalOpen(true);
  }

  function handleSubmit() {
    const payload = { ...form, amount: Number(form.amount) };
    if (editing) {
      updateMut.mutate({ id: editing, data: payload });
    } else {
      createMut.mutate(payload);
    }
  }

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { closeModal(); setModalOpen(true); }}>
          <Plus size={16} />
          {t("finance.addIncome")}
        </Button>
      </div>

      {incomeList.length === 0 ? (
        <div className="text-center py-8 text-gray-500">{t("finance.noData")}</div>
      ) : (
        <Table headers={[t("finance.source"), t("common.description"), t("finance.amount"), t("common.date"), ""]}>
          {incomeList.map((i) => (
            <tr key={i.id}>
              <Td className="font-medium">{i.source}</Td>
              <Td>{i.description}</Td>
              <Td className="font-medium">{formatMoney(i.amount)}</Td>
              <Td>{format(parseISO(i.date), "d MMM yyyy", { locale: ru })}</Td>
              <Td>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(i)} className="p-1.5 rounded-md text-gray-400 hover:text-blue-400 hover:bg-white/10" title={t("common.edit")}>
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => setConfirmDeleteId(i.id)} className="p-1.5 rounded-md text-gray-400 hover:text-red-400 hover:bg-white/10" title={t("common.delete")}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </Td>
            </tr>
          ))}
        </Table>
      )}

      <Modal open={modalOpen} onClose={closeModal} title={editing ? t("finance.editIncome") : t("finance.addIncome")}>
        <div className="space-y-4">
          <Input label={t("finance.source")} value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
          <Input label={t("common.description")} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Input label={t("finance.amount")} type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <Input label={t("finance.category")} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          <Input label={t("common.date")} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" onClick={closeModal}>{t("common.cancel")}</Button>
            <Button onClick={handleSubmit} loading={createMut.isPending || updateMut.isPending}>{t("common.save")}</Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <Modal open={confirmDeleteId !== null} onClose={() => setConfirmDeleteId(null)} title={t("finance.confirmDelete")}>
        <div className="space-y-4">
          <p className="text-sm text-gray-400">{t("finance.confirmDelete")}</p>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setConfirmDeleteId(null)}>{t("common.cancel")}</Button>
            <Button onClick={() => confirmDeleteId && deleteMut.mutate(confirmDeleteId)} loading={deleteMut.isPending}>
              {t("common.delete")}
            </Button>
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
  if (!summary) return <div className="text-center py-8 text-gray-500">{t("finance.noData")}</div>;

  const pieData = (summary.expense_by_category || []).map((item) => ({
    name: EXPENSE_CATEGORY_KEYS[item.category as ExpenseCategory] ? t(EXPENSE_CATEGORY_KEYS[item.category as ExpenseCategory]) : item.category,
    value: item.amount,
  }));

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card rounded-xl p-4">
          <div className="text-sm text-gray-500">{t("finance.income")}</div>
          <div className="text-2xl font-bold text-green-400 mt-1">
            {formatMoney(summary.total_income)}
          </div>
        </div>
        <div className="glass-card rounded-xl p-4">
          <div className="text-sm text-gray-500">{t("finance.expenses")}</div>
          <div className="text-2xl font-bold text-red-400 mt-1">
            {formatMoney(summary.total_expenses + summary.total_payroll)}
          </div>
        </div>
        <div className="glass-card rounded-xl p-4">
          <div className="text-sm text-gray-500">{t("finance.balance")}</div>
          <div className={`text-2xl font-bold mt-1 ${summary.balance >= 0 ? "text-green-400" : "text-red-400"}`}>
            {formatMoney(summary.balance)}
          </div>
        </div>
      </div>

      {/* Monthly bar chart */}
      {(summary.monthly || []).length > 0 && (
        <div className="glass-card rounded-xl p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-4">
            {t("finance.monthlyChart")}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={summary.monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => formatMoney(Number(value))} />
              <Legend />
              <Bar dataKey="income" name={t("finance.income")} fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" name={t("finance.expenses")} fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Expense pie chart */}
      {pieData.length > 0 && (
        <div className="glass-card rounded-xl p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-4">
            {t("finance.expensesByCategory")}
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
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
              >
                {pieData.map((_, idx) => (
                  <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatMoney(Number(value))} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
