import { useState, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Check, Pencil, Trash2, X, Camera, Loader2, Banknote, Building2, CreditCard, RefreshCw } from "lucide-react";
import { format, parseISO, addDays, differenceInDays, startOfMonth, endOfMonth, addMonths } from "date-fns";
import { ru } from "date-fns/locale";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from "recharts";
import {
  getPayroll, createPayroll, updatePayroll, deletePayroll, autoGeneratePayroll,
  getExpenses, createExpense, updateExpense, deleteExpense, approveExpense,
  getIncome, createIncome, updateIncome, deleteIncome,
  getFinanceSummary,
  getCashAdvances, createCashAdvance, deleteCashAdvance, getCashAdvanceBalances,
} from "../../api/finance";
import { uploadFile } from "../../api/uploads";
import { getUsers } from "../../api/users";
import type { PayrollStatus } from "../../types";
import { getCategories } from "../../api/categories";
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
  { id: "advances", label: "finance.advances" },
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
      {activeTab === "advances" && <AdvancesTab t={t} queryClient={queryClient} />}
      {activeTab === "reports" && <ReportsTab t={t} />}
    </div>
  );
}

function PayrollTab({ t, queryClient }: { t: (k: string) => string; queryClient: ReturnType<typeof useQueryClient> }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({ user_id: "", period_start: "", period_end: "", base_salary: "", bonuses: "0", deductions: "0", payment_source: "cash" });
  const [autoModalOpen, setAutoModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [useGlobalDates, setUseGlobalDates] = useState(false);
  const [globalStart, setGlobalStart] = useState("");
  const [globalEnd, setGlobalEnd] = useState("");
  const [periodFilter, setPeriodFilter] = useState("all");

  const { data: records = [], isLoading } = useQuery({ queryKey: ["payroll"], queryFn: () => getPayroll() });
  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: () => getUsers() });
  const staffList = users.filter((u) => u.role !== "owner");
  const userById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);

  const createMut = useMutation({
    mutationFn: createPayroll,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["payroll"] }); closeModal(); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updatePayroll>[1] }) => updatePayroll(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["payroll"] }); closeModal(); },
  });

  const togglePaidMut = useMutation({
    mutationFn: ({ id, paid }: { id: number; paid: boolean }) =>
      updatePayroll(id, paid
        ? { status: "paid" as PayrollStatus, paid_date: format(new Date(), "yyyy-MM-dd") }
        : { status: "pending" as PayrollStatus, paid_date: undefined }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payroll"] }),
  });

  const deleteMut = useMutation({
    mutationFn: deletePayroll,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["payroll"] }); setConfirmDeleteId(null); },
  });

  const autoMut = useMutation({
    mutationFn: autoGeneratePayroll,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["payroll"] }); setAutoModalOpen(false); },
  });

  const autoRows = useMemo(() => {
    const latestByUser = new Map<number, (typeof records)[0]>();
    for (const r of records) {
      const existing = latestByUser.get(r.user_id);
      if (!existing || r.period_end > existing.period_end) {
        latestByUser.set(r.user_id, r);
      }
    }
    return staffList.map((user) => {
      const last = latestByUser.get(user.id);
      let newStart: string;
      let newEnd: string;
      if (last) {
        const ls = parseISO(last.period_start);
        const le = parseISO(last.period_end);
        const dur = differenceInDays(le, ls);
        const ns = addDays(le, 1);
        const ne = addDays(ns, dur);
        newStart = format(ns, "yyyy-MM-dd");
        newEnd = format(ne, "yyyy-MM-dd");
      } else {
        const nm = addMonths(new Date(), 1);
        newStart = format(startOfMonth(nm), "yyyy-MM-dd");
        newEnd = format(endOfMonth(nm), "yyyy-MM-dd");
      }
      return {
        userId: user.id,
        name: user.full_name,
        hasHistory: !!last,
        lastEnd: last ? format(parseISO(last.period_end), "d MMM", { locale: ru }) : null,
        newStart,
        newEnd,
        baseSalary: last?.base_salary || 0,
        bonuses: last?.bonuses || 0,
        deductions: last?.deductions || 0,
        netAmount: last?.net_amount || 0,
        paymentSource: last?.payment_source || "cash",
      };
    });
  }, [records, staffList]);

  function openAutoModal() {
    const withHistory = autoRows.filter((r) => r.hasHistory).map((r) => r.userId);
    setSelectedIds(new Set(withHistory));
    setUseGlobalDates(false);
    setGlobalStart("");
    setGlobalEnd("");
    setAutoModalOpen(true);
  }

  function toggleUser(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selectedIds.size === staffList.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(staffList.map((u) => u.id)));
  }

  function handleAutoGenerate() {
    const entries = autoRows
      .filter((r) => selectedIds.has(r.userId))
      .map((r) => ({
        user_id: r.userId,
        period_start: useGlobalDates && globalStart ? globalStart : r.newStart,
        period_end: useGlobalDates && globalEnd ? globalEnd : r.newEnd,
        base_salary: r.baseSalary,
        bonuses: r.bonuses,
        deductions: r.deductions,
        net_amount: r.baseSalary + r.bonuses - r.deductions,
        payment_source: r.paymentSource,
      }));
    autoMut.mutate(entries);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setForm({ user_id: "", period_start: "", period_end: "", base_salary: "", bonuses: "0", deductions: "0", payment_source: "cash" });
  }

  function openEdit(r: typeof records[0]) {
    setEditing(r.id);
    setForm({
      user_id: String(r.user_id),
      period_start: r.period_start,
      period_end: r.period_end,
      base_salary: String(r.base_salary),
      bonuses: String(r.bonuses),
      deductions: String(r.deductions),
      payment_source: r.payment_source || "cash",
    });
    setModalOpen(true);
  }

  function handleSubmit() {
    const base = Number(form.base_salary);
    const bon = Number(form.bonuses);
    const ded = Number(form.deductions);
    const payload = {
      user_id: Number(form.user_id),
      period_start: form.period_start,
      period_end: form.period_end,
      base_salary: base,
      bonuses: bon,
      deductions: ded,
      net_amount: base + bon - ded,
      payment_source: form.payment_source,
    };
    if (editing) {
      updateMut.mutate({ id: editing, data: payload });
    } else {
      createMut.mutate(payload);
    }
  }

  if (isLoading) return <LoadingSpinner />;

  const sourceLabel = (src: string | null) => {
    if (src === "ip") return t("finance.sourceIP");
    if (src === "card") return t("finance.sourceCard");
    return t("finance.sourceCash");
  };

  // Unique periods for filter
  const periods = useMemo(() => {
    const set = new Map<string, { start: string; end: string; label: string }>();
    for (const r of records) {
      const key = `${r.period_start}|${r.period_end}`;
      if (!set.has(key)) {
        set.set(key, {
          start: r.period_start,
          end: r.period_end,
          label: `${format(parseISO(r.period_start), "d MMM", { locale: ru })} — ${format(parseISO(r.period_end), "d MMM", { locale: ru })}`,
        });
      }
    }
    return [...set.entries()].sort((a, b) => b[1].start.localeCompare(a[1].start));
  }, [records]);

  const filtered = periodFilter === "all" ? records : records.filter((r) => `${r.period_start}|${r.period_end}` === periodFilter);

  const cashTotal = filtered.filter((r) => !r.payment_source || r.payment_source === "cash").reduce((s, r) => s + r.net_amount, 0);
  const ipTotal = filtered.filter((r) => r.payment_source === "ip").reduce((s, r) => s + r.net_amount, 0);
  const cardTotal = filtered.filter((r) => r.payment_source === "card").reduce((s, r) => s + r.net_amount, 0);

  return (
    <div className="space-y-4">
      {/* Period filter */}
      {periods.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setPeriodFilter("all")}
            className={`text-xs px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              periodFilter === "all"
                ? "bg-blue-500/15 text-blue-400 font-medium"
                : "text-gray-500 hover:bg-white/10"
            }`}
          >
            {t("notifications.all")}
          </button>
          {periods.map(([key, p]) => (
            <button
              key={key}
              onClick={() => setPeriodFilter(key)}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                periodFilter === key
                  ? "bg-blue-500/15 text-blue-400 font-medium"
                  : "text-gray-500 hover:bg-white/10"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* Source stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-500/10"><Banknote size={20} className="text-green-400" /></div>
          <div>
            <div className="text-xs text-gray-500">{t("finance.sourceCash")}</div>
            <div className="text-lg font-bold text-green-400">{formatMoney(cashTotal)}</div>
          </div>
        </div>
        <div className="glass-card rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10"><Building2 size={20} className="text-blue-400" /></div>
          <div>
            <div className="text-xs text-gray-500">{t("finance.sourceIP")}</div>
            <div className="text-lg font-bold text-blue-400">{formatMoney(ipTotal)}</div>
          </div>
        </div>
        <div className="glass-card rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/10"><CreditCard size={20} className="text-purple-400" /></div>
          <div>
            <div className="text-xs text-gray-500">{t("finance.sourceCard")}</div>
            <div className="text-lg font-bold text-purple-400">{formatMoney(cardTotal)}</div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={openAutoModal}>
          <RefreshCw size={16} />
          {t("finance.autoPayroll")}
        </Button>
        <Button onClick={() => { closeModal(); setModalOpen(true); }}>
          <Plus size={16} />
          {t("finance.createRecord")}
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-8 text-gray-500">{t("finance.noData")}</div>
      ) : (
        <div className="overflow-x-auto">
          <Table headers={[t("staff.employee"), t("finance.period"), t("finance.baseSalary"), t("finance.bonuses"), t("finance.deductions"), t("finance.total"), t("finance.paymentSource"), t("staff.status"), ""]}>
            {filtered.map((r) => {
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
                  <Td className="text-xs">{sourceLabel(r.payment_source)}</Td>
                  <Td>
                    <button
                      onClick={() => togglePaidMut.mutate({ id: r.id, paid: r.status !== "paid" })}
                      className="cursor-pointer"
                    >
                      <Badge color={r.status === "paid" ? "green" : "orange"}>
                        {r.status === "paid" ? t("finance.paid") : t("finance.pendingPayment")}
                      </Badge>
                    </button>
                  </Td>
                  <Td>
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEdit(r)}
                        className="p-1.5 rounded-md text-gray-400 hover:text-blue-400 hover:bg-white/10"
                        title={t("common.edit")}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(r.id)}
                        className="p-1.5 rounded-md text-gray-400 hover:text-red-400 hover:bg-white/10"
                        title={t("common.delete")}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </Td>
                </tr>
              );
            })}
          </Table>
        </div>
      )}

      <Modal open={modalOpen} onClose={closeModal} title={editing ? t("finance.editPayroll") : t("finance.createRecord")}>
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
          <Select
            label={t("finance.paymentSource")}
            options={[
              { value: "cash", label: t("finance.sourceCash") },
              { value: "card", label: t("finance.sourceCard") },
              { value: "ip", label: t("finance.sourceIP") },
            ]}
            value={form.payment_source}
            onChange={(e) => setForm({ ...form, payment_source: e.target.value })}
          />
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

      {/* Auto payroll modal */}
      <Modal open={autoModalOpen} onClose={() => setAutoModalOpen(false)} title={t("finance.autoPayroll")}>
        <div className="space-y-4">
          {/* Global dates override */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={useGlobalDates}
              onChange={() => setUseGlobalDates(!useGlobalDates)}
              className="rounded border-white/20 bg-white/5 accent-blue-500"
            />
            <span className="text-sm text-gray-300">{t("finance.globalDates")}</span>
          </label>
          {useGlobalDates && (
            <div className="grid grid-cols-2 gap-3">
              <Input label={t("finance.periodStart")} type="date" value={globalStart} onChange={(e) => setGlobalStart(e.target.value)} />
              <Input label={t("finance.periodEnd")} type="date" value={globalEnd} onChange={(e) => setGlobalEnd(e.target.value)} />
            </div>
          )}

          {/* Select all */}
          <label className="flex items-center gap-2 cursor-pointer border-b border-white/[0.06] pb-3">
            <input
              type="checkbox"
              checked={selectedIds.size === staffList.length && staffList.length > 0}
              onChange={toggleAll}
              className="rounded border-white/20 bg-white/5 accent-blue-500"
            />
            <span className="text-sm font-medium text-gray-300">
              {t("finance.selectAll")} ({selectedIds.size}/{staffList.length})
            </span>
          </label>

          {/* Employee list */}
          <div className="max-h-[400px] overflow-y-auto space-y-1">
            {autoRows.map((row) => (
              <label
                key={row.userId}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedIds.has(row.userId) ? "bg-white/[0.06]" : "hover:bg-white/[0.03]"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(row.userId)}
                  onChange={() => toggleUser(row.userId)}
                  className="rounded border-white/20 bg-white/5 accent-blue-500"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-purple-200">{row.name}</div>
                  {row.hasHistory ? (
                    <div className="text-xs text-gray-500 mt-0.5">
                      {t("finance.lastPeriod")}: ...{row.lastEnd} &middot; {formatMoney(row.netAmount)}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-600 mt-0.5">{t("finance.noHistory")}</div>
                  )}
                  {!useGlobalDates && (
                    <div className="text-xs text-blue-400/70 mt-0.5">
                      &rarr; {format(parseISO(row.newStart), "d MMM", { locale: ru })} &mdash; {format(parseISO(row.newEnd), "d MMM", { locale: ru })}
                    </div>
                  )}
                </div>
                <div className="text-sm font-medium text-gray-400 whitespace-nowrap">
                  {formatMoney(row.netAmount)}
                </div>
              </label>
            ))}
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" onClick={() => setAutoModalOpen(false)}>{t("common.cancel")}</Button>
            <Button
              onClick={handleAutoGenerate}
              loading={autoMut.isPending}
              disabled={selectedIds.size === 0}
            >
              {t("finance.generatePayroll")} ({selectedIds.size})
            </Button>
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
  const [statusFilter, setStatusFilter] = useState("");
  const [form, setForm] = useState({ category: "", description: "", amount: "", date: "", receipt_url: "", payment_source: "cash" });
  const [receiptUploading, setReceiptUploading] = useState(false);
  const receiptInputRef = useRef<HTMLInputElement>(null);

  const { data: expenses = [], isLoading } = useQuery({ queryKey: ["expenses", statusFilter], queryFn: () => getExpenses(statusFilter || undefined) });
  const { data: categories = [] } = useQuery({ queryKey: ["categories", "expense"], queryFn: () => getCategories("expense") });

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

  const approveMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: "approved" | "rejected" }) => approveExpense(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["finance-summary"] });
    },
  });

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setForm({ category: "", description: "", amount: "", date: "", receipt_url: "", payment_source: "cash" });
  }

  function openEdit(e: typeof expenses[0]) {
    setEditing(e.id);
    setForm({ category: e.category, description: e.description, amount: String(e.amount), date: e.date, receipt_url: e.receipt_url || "", payment_source: e.payment_source || "cash" });
    setModalOpen(true);
  }

  function handleSubmit() {
    const payload = { ...form, amount: Number(form.amount), receipt_url: form.receipt_url || undefined };
    if (editing) {
      updateMut.mutate({ id: editing, data: payload });
    } else {
      createMut.mutate(payload);
    }
  }

  async function handleReceiptUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptUploading(true);
    try {
      const result = await uploadFile(file);
      setForm((prev) => ({ ...prev, receipt_url: result.url }));
    } catch {
      // silently fail
    } finally {
      setReceiptUploading(false);
      if (receiptInputRef.current) receiptInputRef.current.value = "";
    }
  }

  if (isLoading) return <LoadingSpinner />;

  const expCashTotal = expenses.filter((e) => !e.payment_source || e.payment_source === "cash").reduce((s, e) => s + e.amount, 0);
  const expIpTotal = expenses.filter((e) => e.payment_source === "ip").reduce((s, e) => s + e.amount, 0);
  const expCardTotal = expenses.filter((e) => e.payment_source === "card").reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-4">
      {/* Source stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-500/10"><Banknote size={20} className="text-green-400" /></div>
          <div>
            <div className="text-xs text-gray-500">{t("finance.sourceCash")}</div>
            <div className="text-lg font-bold text-green-400">{formatMoney(expCashTotal)}</div>
          </div>
        </div>
        <div className="glass-card rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10"><Building2 size={20} className="text-blue-400" /></div>
          <div>
            <div className="text-xs text-gray-500">{t("finance.sourceIP")}</div>
            <div className="text-lg font-bold text-blue-400">{formatMoney(expIpTotal)}</div>
          </div>
        </div>
        <div className="glass-card rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/10"><CreditCard size={20} className="text-purple-400" /></div>
          <div>
            <div className="text-xs text-gray-500">{t("finance.sourceCard")}</div>
            <div className="text-lg font-bold text-purple-400">{formatMoney(expCardTotal)}</div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {["", "pending", "approved", "rejected"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                statusFilter === s
                  ? "bg-blue-500/15 text-blue-400 font-medium"
                  : "text-gray-500 hover:bg-white/10"
              }`}
            >
              {s === "" ? t("notifications.all") : t(`expenses.${s}`)}
            </button>
          ))}
        </div>
        <Button onClick={() => { closeModal(); setModalOpen(true); }}>
          <Plus size={16} />
          {t("finance.addExpense")}
        </Button>
      </div>

      {expenses.length === 0 ? (
        <div className="text-center py-8 text-gray-500">{t("finance.noData")}</div>
      ) : (
        <Table headers={[t("finance.category"), t("common.description"), t("finance.amount"), t("common.date"), t("staff.status"), ""]}>
          {expenses.map((e) => (
            <tr key={e.id}>
              <Td><Badge color="blue">{e.category}</Badge></Td>
              <Td>
                <div>
                  {e.description}
                  {e.receipt_url && (
                    <a href={e.receipt_url} target="_blank" rel="noreferrer" className="text-xs text-blue-400 ml-2">
                      {t("expenses.viewReceipt")}
                    </a>
                  )}
                </div>
              </Td>
              <Td className="font-medium">{formatMoney(e.amount)}</Td>
              <Td>{format(parseISO(e.date), "d MMM yyyy", { locale: ru })}</Td>
              <Td>
                <Badge color={e.status === "approved" ? "green" : e.status === "rejected" ? "red" : "orange"}>
                  {t(`expenses.${e.status}`)}
                </Badge>
              </Td>
              <Td>
                <div className="flex gap-1">
                  {e.status === "pending" && (
                    <>
                      <button
                        onClick={() => approveMut.mutate({ id: e.id, status: "approved" })}
                        className="p-1.5 rounded-md text-gray-400 hover:text-green-400 hover:bg-white/10"
                        title={t("expenses.approve")}
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={() => approveMut.mutate({ id: e.id, status: "rejected" })}
                        className="p-1.5 rounded-md text-gray-400 hover:text-red-400 hover:bg-white/10"
                        title={t("expenses.reject")}
                      >
                        <X size={14} />
                      </button>
                    </>
                  )}
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
            options={categories.map((c) => ({ value: c.name, label: c.name }))}
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          />
          <Input label={t("common.description")} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Input label={t("finance.amount")} type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <Input label={t("common.date")} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <Select
            label={t("finance.paymentSource")}
            options={[
              { value: "cash", label: t("finance.sourceCash") },
              { value: "card", label: t("finance.sourceCard") },
              { value: "ip", label: t("finance.sourceIP") },
            ]}
            value={form.payment_source}
            onChange={(e) => setForm({ ...form, payment_source: e.target.value })}
          />

          {/* Receipt upload */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">{t("expenses.receipt")}</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => receiptInputRef.current?.click()}
                disabled={receiptUploading}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm glass-input text-gray-400 hover:text-purple-200 transition-colors disabled:opacity-50"
              >
                {receiptUploading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                {t("expenses.uploadReceipt")}
              </button>
              {form.receipt_url && (
                <span className="text-xs text-green-400">{t("expenses.receiptUploaded")}</span>
              )}
            </div>
            <input ref={receiptInputRef} type="file" accept="image/*" className="hidden" onChange={handleReceiptUpload} />
          </div>

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
  const [form, setForm] = useState({ source: "", description: "", amount: "", date: "", category: "", receipt_url: "" });
  const [receiptUploading, setReceiptUploading] = useState(false);
  const receiptInputRef = useRef<HTMLInputElement>(null);

  const { data: incomeList = [], isLoading } = useQuery({ queryKey: ["income"], queryFn: getIncome });
  const { data: categories = [] } = useQuery({ queryKey: ["categories", "income"], queryFn: () => getCategories("income") });

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
    setForm({ source: "", description: "", amount: "", date: "", category: "", receipt_url: "" });
  }

  function openEdit(i: typeof incomeList[0]) {
    setEditing(i.id);
    setForm({ source: i.source, description: i.description, amount: String(i.amount), date: i.date, category: i.category, receipt_url: i.receipt_url || "" });
    setModalOpen(true);
  }

  function handleSubmit() {
    const payload = { ...form, amount: Number(form.amount), receipt_url: form.receipt_url || undefined };
    if (editing) {
      updateMut.mutate({ id: editing, data: payload });
    } else {
      createMut.mutate(payload);
    }
  }

  async function handleReceiptUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptUploading(true);
    try {
      const result = await uploadFile(file);
      setForm((prev) => ({ ...prev, receipt_url: result.url }));
    } catch {
      // silently fail
    } finally {
      setReceiptUploading(false);
      if (receiptInputRef.current) receiptInputRef.current.value = "";
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
              <Td>
                <div>
                  {i.description}
                  {i.receipt_url && (
                    <a href={i.receipt_url} target="_blank" rel="noreferrer" className="text-xs text-blue-400 ml-2">
                      {t("expenses.viewReceipt")}
                    </a>
                  )}
                </div>
              </Td>
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
          <Select
            label={t("finance.category")}
            options={categories.map((c) => ({ value: c.name, label: c.name }))}
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          />
          <Input label={t("common.date")} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />

          {/* Receipt upload */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">{t("expenses.receipt")}</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => receiptInputRef.current?.click()}
                disabled={receiptUploading}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm glass-input text-gray-400 hover:text-purple-200 transition-colors disabled:opacity-50"
              >
                {receiptUploading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                {t("expenses.uploadReceipt")}
              </button>
              {form.receipt_url && (
                <span className="text-xs text-green-400">{t("expenses.receiptUploaded")}</span>
              )}
            </div>
            <input ref={receiptInputRef} type="file" accept="image/*" className="hidden" onChange={handleReceiptUpload} />
          </div>

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
    name: item.category,
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
              <Bar dataKey="payroll" name={t("finance.payroll")} fill="#a855f7" radius={[4, 4, 0, 0]} />
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

function AdvancesTab({ t, queryClient }: { t: (k: string) => string; queryClient: ReturnType<typeof useQueryClient> }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({ user_id: "", amount: "", note: "", date: format(new Date(), "yyyy-MM-dd") });

  const { data: advances = [], isLoading } = useQuery({ queryKey: ["cash-advances"], queryFn: getCashAdvances });
  const { data: balances = [] } = useQuery({ queryKey: ["cash-advance-balances"], queryFn: getCashAdvanceBalances });
  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: () => getUsers() });
  const staffList = users.filter((u) => u.role !== "owner");
  const userById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);

  const createMut = useMutation({
    mutationFn: createCashAdvance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cash-advances"] });
      queryClient.invalidateQueries({ queryKey: ["cash-advance-balances"] });
      setModalOpen(false);
      setForm({ user_id: "", amount: "", note: "", date: format(new Date(), "yyyy-MM-dd") });
    },
  });

  const deleteMut = useMutation({
    mutationFn: deleteCashAdvance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cash-advances"] });
      queryClient.invalidateQueries({ queryKey: ["cash-advance-balances"] });
      setConfirmDeleteId(null);
    },
  });

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Balance cards */}
      {balances.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {balances.map((b) => (
            <div key={b.user_id} className="glass-card rounded-xl p-4">
              <div className="text-sm font-medium text-purple-200 mb-3">{b.full_name}</div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">{t("finance.advanced")}</span>
                  <span className="text-blue-400">{formatMoney(b.total_advanced)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">{t("finance.spent")}</span>
                  <span className="text-green-400">{formatMoney(b.total_spent)}</span>
                </div>
                <div className="border-t border-white/[0.06] pt-1.5 flex justify-between text-sm">
                  <span className="text-gray-400 font-medium">{t("finance.remaining")}</span>
                  <span className={`font-bold ${b.remaining > 0 ? "text-orange-400" : "text-green-400"}`}>
                    {formatMoney(b.remaining)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Advance records */}
      <div className="flex justify-end">
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={16} />
          {t("finance.addAdvance")}
        </Button>
      </div>

      {advances.length === 0 ? (
        <div className="text-center py-8 text-gray-500">{t("finance.noAdvances")}</div>
      ) : (
        <Table headers={[t("staff.employee"), t("finance.amount"), t("finance.advanceNote"), t("common.date"), ""]}>
          {advances.map((a) => {
            const user = userById.get(a.user_id);
            return (
              <tr key={a.id}>
                <Td className="font-medium">{user?.full_name || `ID ${a.user_id}`}</Td>
                <Td className="font-medium text-blue-400">{formatMoney(a.amount)}</Td>
                <Td className="text-sm text-gray-400">{a.note || "—"}</Td>
                <Td>{format(parseISO(a.date), "d MMM yyyy", { locale: ru })}</Td>
                <Td>
                  <button
                    onClick={() => setConfirmDeleteId(a.id)}
                    className="p-1.5 rounded-md text-gray-400 hover:text-red-400 hover:bg-white/10"
                    title={t("common.delete")}
                  >
                    <Trash2 size={15} />
                  </button>
                </Td>
              </tr>
            );
          })}
        </Table>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={t("finance.addAdvance")}>
        <div className="space-y-4">
          <Select
            label={t("staff.employee")}
            options={[{ value: "", label: t("finance.select") }, ...staffList.map((u) => ({ value: String(u.id), label: u.full_name }))]}
            value={form.user_id}
            onChange={(e) => setForm({ ...form, user_id: e.target.value })}
          />
          <Input label={t("finance.amount")} type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <Input label={t("finance.advanceNote")} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          <Input label={t("common.date")} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>{t("common.cancel")}</Button>
            <Button
              onClick={() => createMut.mutate({ user_id: Number(form.user_id), amount: Number(form.amount), note: form.note || undefined, date: form.date })}
              loading={createMut.isPending}
              disabled={!form.user_id || !form.amount}
            >
              {t("common.save")}
            </Button>
          </div>
        </div>
      </Modal>

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
