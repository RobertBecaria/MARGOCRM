import { useState, useMemo, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Check, Pencil, Trash2, X, Camera, Loader2, Banknote, Building2, CreditCard, RefreshCw, TrendingUp, TrendingDown, Wallet, HandCoins, CalendarDays, ChevronLeft, ChevronRight, DollarSign, Receipt } from "lucide-react";
import { format, parseISO, addDays, differenceInDays, startOfMonth, endOfMonth, addMonths } from "date-fns";
import { ru } from "date-fns/locale";
import {
  getPayroll, createPayroll, updatePayroll, deletePayroll, autoGeneratePayroll,
  getExpenses, createExpense, updateExpense, deleteExpense, approveExpense,
  getIncome, createIncome, updateIncome, deleteIncome, autoGenerateIncome,
  getCashAdvances, createCashAdvance, deleteCashAdvance, getCashAdvanceBalances,
  getFinanceBalance,
} from "../../api/finance";
import type { BalanceResponse } from "../../api/finance";
import { getUsers } from "../../api/users";
import type { PayrollStatus, User } from "../../types";
import { getCategories } from "../../api/categories";
import { formatMoney } from "../../utils/formatters";
import { PAYMENT_SOURCE_OPTIONS } from "../../utils/constants";
import { toast } from "../../components/ui/Toast";
import { useReceiptUpload } from "../../hooks/useReceiptUpload";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Modal from "../../components/ui/Modal";
import Badge from "../../components/ui/Badge";
import { Table, Td } from "../../components/ui/Table";
import LoadingSpinner from "../../components/shared/LoadingSpinner";

/* ── Shared: SourceStats ─────────────────────────────────────────── */

function SourceStats({ items, amountKey = "amount" }: {
  items: Array<{ payment_source?: string | null; [key: string]: any }>;
  amountKey?: string;
}) {
  const { t } = useTranslation();
  let cashTotal = 0, ipTotal = 0, cardTotal = 0;
  for (const item of items) {
    const amt = Number(item[amountKey]) || 0;
    const src = item.payment_source;
    if (src === "ip") ipTotal += amt;
    else if (src === "card") cardTotal += amt;
    else cashTotal += amt;
  }
  const total = cashTotal + ipTotal + cardTotal;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="glass-card rounded-xl p-4 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-white/5"><span className="text-lg font-bold text-gray-300">&Sigma;</span></div>
        <div>
          <div className="text-xs text-gray-500">{t("finance.total")}</div>
          <div className="text-lg font-bold text-white">{formatMoney(total)}</div>
        </div>
      </div>
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
  );
}

/* ── Shared: DeleteConfirmModal ──────────────────────────────────── */

function DeleteConfirmModal({ open, onClose, onConfirm, isPending }: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
}) {
  const { t } = useTranslation();
  return (
    <Modal open={open} onClose={onClose} title={t("finance.confirmDelete")}>
      <div className="space-y-4">
        <p className="text-sm text-gray-400">{t("finance.confirmDelete")}</p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onClose}>{t("common.cancel")}</Button>
          <Button onClick={onConfirm} loading={isPending}>{t("common.delete")}</Button>
        </div>
      </div>
    </Modal>
  );
}

/* ── Tabs config ─────────────────────────────────────────────────── */

const tabs = [
  { id: "balance", label: "finance.balanceTab" },
  { id: "income", label: "finance.income" },
  { id: "expenses", label: "finance.expenses" },
  { id: "payroll", label: "finance.payroll" },
  { id: "advances", label: "finance.advances" },
] as const;

type TabId = (typeof tabs)[number]["id"];

/* ── Finance (parent) ────────────────────────────────────────────── */

export default function Finance() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabId>("balance");

  // Shared users query – passed down to PayrollTab & AdvancesTab
  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: () => getUsers() });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-purple-200">
          {t("finance.title")}
        </h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setActiveTab("income")}>
            <DollarSign size={16} />
            {t("finance.addIncome")}
          </Button>
          <Button variant="secondary" onClick={() => setActiveTab("expenses")}>
            <Receipt size={16} />
            {t("finance.addExpense")}
          </Button>
        </div>
      </div>

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

      {activeTab === "payroll" && <PayrollTab users={users} />}
      {activeTab === "expenses" && <ExpensesTab />}
      {activeTab === "income" && <IncomeTab />}
      {activeTab === "advances" && <AdvancesTab users={users} />}
      {activeTab === "balance" && <BalanceTab />}
    </div>
  );
}

/* ── PayrollTab ──────────────────────────────────────────────────── */

function PayrollTab({ users }: { users: User[] }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
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
  const staffList = useMemo(() => users.filter((u) => u.role !== "owner"), [users]);
  const userById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);

  const createMut = useMutation({
    mutationFn: createPayroll,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["payroll"] }); closeModal(); },
    onError: (err: any) => { toast.error(err?.response?.data?.detail || err?.message || t("common.error")); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updatePayroll>[1] }) => updatePayroll(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["payroll"] }); closeModal(); },
    onError: (err: any) => { toast.error(err?.response?.data?.detail || err?.message || t("common.error")); },
  });

  const togglePaidMut = useMutation({
    mutationFn: ({ id, paid }: { id: number; paid: boolean }) =>
      updatePayroll(id, paid
        ? { status: "paid" as PayrollStatus, paid_date: format(new Date(), "yyyy-MM-dd") }
        : { status: "pending" as PayrollStatus, paid_date: undefined }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payroll"] }),
    onError: (err: any) => { toast.error(err?.response?.data?.detail || err?.message || t("common.error")); },
  });

  const deleteMut = useMutation({
    mutationFn: deletePayroll,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["payroll"] }); setConfirmDeleteId(null); },
    onError: (err: any) => { toast.error(err?.response?.data?.detail || err?.message || t("common.error")); },
  });

  const autoMut = useMutation({
    mutationFn: autoGeneratePayroll,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["payroll"] }); setAutoModalOpen(false); },
    onError: (err: any) => { toast.error(err?.response?.data?.detail || err?.message || t("common.error")); },
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
    if (!form.user_id || !form.period_start || !form.period_end || !form.base_salary) {
      toast.error(t("finance.fillRequired"));
      return;
    }
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

  // Unique periods for filter (must be before early return - hooks order)
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

  if (isLoading) return <LoadingSpinner />;

  const sourceLabel = (src: string | null) => {
    if (src === "ip") return t("finance.sourceIP");
    if (src === "card") return t("finance.sourceCard");
    return t("finance.sourceCash");
  };

  const filtered = periodFilter === "all" ? records : records.filter((r) => `${r.period_start}|${r.period_end}` === periodFilter);

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
      <SourceStats items={filtered} amountKey="net_amount" />

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
                      disabled={togglePaidMut.isPending && togglePaidMut.variables?.id === r.id}
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
            options={PAYMENT_SOURCE_OPTIONS.map(o => ({ value: o.value, label: t(o.labelKey) }))}
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
      <DeleteConfirmModal
        open={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={() => confirmDeleteId && deleteMut.mutate(confirmDeleteId)}
        isPending={deleteMut.isPending}
      />

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

/* ── ExpensesTab ─────────────────────────────────────────────────── */

function ExpensesTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [form, setForm] = useState({ category: "", description: "", amount: "", date: "", receipt_url: "", payment_source: "cash" });
  const receipt = useReceiptUpload();

  const { data: expenses = [], isLoading } = useQuery({ queryKey: ["expenses", statusFilter], queryFn: () => getExpenses(statusFilter || undefined) });
  const { data: categories = [] } = useQuery({ queryKey: ["categories", "expense"], queryFn: () => getCategories("expense") });

  const createMut = useMutation({
    mutationFn: createExpense,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["expenses"] }); queryClient.invalidateQueries({ queryKey: ["finance-summary"] }); closeModal(); },
    onError: (err: any) => { toast.error(err?.response?.data?.detail || err?.message || t("common.error")); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateExpense>[1] }) => updateExpense(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["expenses"] }); queryClient.invalidateQueries({ queryKey: ["finance-summary"] }); closeModal(); },
    onError: (err: any) => { toast.error(err?.response?.data?.detail || err?.message || t("common.error")); },
  });

  const deleteMut = useMutation({
    mutationFn: deleteExpense,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["expenses"] }); queryClient.invalidateQueries({ queryKey: ["finance-summary"] }); setConfirmDeleteId(null); },
    onError: (err: any) => { toast.error(err?.response?.data?.detail || err?.message || t("common.error")); },
  });

  const approveMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: "approved" | "rejected" }) => approveExpense(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["finance-summary"] });
    },
    onError: (err: any) => { toast.error(err?.response?.data?.detail || err?.message || t("common.error")); },
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
    if (!form.category || !form.description || !form.amount || !form.date) {
      toast.error(t("finance.fillRequired"));
      return;
    }
    const payload = { ...form, amount: Number(form.amount), receipt_url: form.receipt_url || undefined };
    if (editing) {
      updateMut.mutate({ id: editing, data: payload });
    } else {
      createMut.mutate(payload);
    }
  }

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      {/* Source stats */}
      <SourceStats items={expenses} />

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
            options={PAYMENT_SOURCE_OPTIONS.map(o => ({ value: o.value, label: t(o.labelKey) }))}
            value={form.payment_source}
            onChange={(e) => setForm({ ...form, payment_source: e.target.value })}
          />

          {/* Receipt upload */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">{t("expenses.receipt")}</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => receipt.inputRef.current?.click()}
                disabled={receipt.uploading}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm glass-input text-gray-400 hover:text-purple-200 transition-colors disabled:opacity-50"
              >
                {receipt.uploading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                {t("expenses.uploadReceipt")}
              </button>
              {form.receipt_url && (
                <span className="text-xs text-green-400">{t("expenses.receiptUploaded")}</span>
              )}
            </div>
            <input ref={receipt.inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => receipt.handleUpload(e, (url) => setForm((prev) => ({ ...prev, receipt_url: url })))} />
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" onClick={closeModal}>{t("common.cancel")}</Button>
            <Button onClick={handleSubmit} loading={createMut.isPending || updateMut.isPending}>{t("common.save")}</Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <DeleteConfirmModal
        open={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={() => confirmDeleteId && deleteMut.mutate(confirmDeleteId)}
        isPending={deleteMut.isPending}
      />
    </div>
  );
}

/* ── IncomeTab ───────────────────────────────────────────────────── */

function IncomeTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({ source: "", description: "", amount: "", date: "", category: "", receipt_url: "", payment_source: "cash", is_recurring: false });
  const receipt = useReceiptUpload();
  const [autoModalOpen, setAutoModalOpen] = useState(false);
  const [selectedSources, setSelectedSources] = useState<Set<string>>(new Set());

  const { data: incomeList = [], isLoading } = useQuery({ queryKey: ["income"], queryFn: getIncome });
  const { data: categories = [] } = useQuery({ queryKey: ["categories", "income"], queryFn: () => getCategories("income") });

  const createMut = useMutation({
    mutationFn: createIncome,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["income"] }); queryClient.invalidateQueries({ queryKey: ["finance-summary"] }); closeModal(); },
    onError: (err: any) => { toast.error(err?.response?.data?.detail || err?.message || t("common.error")); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateIncome>[1] }) => updateIncome(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["income"] }); queryClient.invalidateQueries({ queryKey: ["finance-summary"] }); closeModal(); },
    onError: (err: any) => { toast.error(err?.response?.data?.detail || err?.message || t("common.error")); },
  });

  const deleteMut = useMutation({
    mutationFn: deleteIncome,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["income"] }); queryClient.invalidateQueries({ queryKey: ["finance-summary"] }); setConfirmDeleteId(null); },
    onError: (err: any) => { toast.error(err?.response?.data?.detail || err?.message || t("common.error")); },
  });

  const autoMut = useMutation({
    mutationFn: autoGenerateIncome,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["income"] }); setAutoModalOpen(false); },
    onError: (err: any) => { toast.error(err?.response?.data?.detail || err?.message || t("common.error")); },
  });

  const recurringRows = useMemo(() => {
    const latestBySource = new Map<string, (typeof incomeList)[0]>();
    for (const inc of incomeList) {
      if (!inc.is_recurring) continue;
      const existing = latestBySource.get(inc.source);
      if (!existing || inc.date > existing.date) {
        latestBySource.set(inc.source, inc);
      }
    }
    return [...latestBySource.values()].map((inc) => {
      const lastDate = parseISO(inc.date);
      const nextDate = addMonths(lastDate, 1);
      return {
        source: inc.source,
        description: inc.description,
        amount: inc.amount,
        category: inc.category,
        payment_source: inc.payment_source || "cash",
        lastDate: format(lastDate, "d MMM", { locale: ru }),
        nextDate: format(nextDate, "yyyy-MM-dd"),
        nextDateLabel: format(nextDate, "d MMM", { locale: ru }),
      };
    });
  }, [incomeList]);

  function openAutoModal() {
    setSelectedSources(new Set(recurringRows.map((r) => r.source)));
    setAutoModalOpen(true);
  }

  function toggleSource(source: string) {
    setSelectedSources((prev) => {
      const next = new Set(prev);
      if (next.has(source)) next.delete(source);
      else next.add(source);
      return next;
    });
  }

  function handleAutoGenerate() {
    const entries = recurringRows
      .filter((r) => selectedSources.has(r.source))
      .map((r) => ({
        source: r.source,
        description: r.description,
        amount: r.amount,
        date: r.nextDate,
        category: r.category,
        payment_source: r.payment_source,
        is_recurring: true,
      }));
    autoMut.mutate(entries);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setForm({ source: "", description: "", amount: "", date: "", category: "", receipt_url: "", payment_source: "cash", is_recurring: false });
  }

  function openEdit(i: typeof incomeList[0]) {
    setEditing(i.id);
    setForm({ source: i.source, description: i.description, amount: String(i.amount), date: i.date, category: i.category, receipt_url: i.receipt_url || "", payment_source: i.payment_source || "cash", is_recurring: i.is_recurring });
    setModalOpen(true);
  }

  function handleSubmit() {
    if (!form.source || !form.description || !form.amount || !form.date || !form.category) {
      toast.error(t("finance.fillRequired"));
      return;
    }
    const payload = { ...form, amount: Number(form.amount), receipt_url: form.receipt_url || undefined, is_recurring: form.is_recurring };
    if (editing) {
      updateMut.mutate({ id: editing, data: payload });
    } else {
      createMut.mutate(payload);
    }
  }

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      {/* Source stats */}
      <SourceStats items={incomeList} />

      <div className="flex justify-end gap-2">
        {recurringRows.length > 0 && (
          <Button variant="secondary" onClick={openAutoModal}>
            <RefreshCw size={16} />
            {t("finance.generateRecurring")}
          </Button>
        )}
        <Button onClick={() => { closeModal(); setModalOpen(true); }}>
          <Plus size={16} />
          {t("finance.addIncome")}
        </Button>
      </div>

      {incomeList.length === 0 ? (
        <div className="text-center py-8 text-gray-500">{t("finance.noData")}</div>
      ) : (
        <Table headers={[t("finance.source"), t("common.description"), t("finance.amount"), t("finance.paymentSource"), t("common.date"), ""]}>
          {incomeList.map((i) => (
            <tr key={i.id}>
              <Td className="font-medium">
                <div className="flex items-center gap-1.5">
                  {i.source}
                  {i.is_recurring && <RefreshCw size={13} className="text-blue-400" />}
                </div>
              </Td>
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
              <Td className="text-xs">
                {i.payment_source === "ip" ? t("finance.sourceIP") : i.payment_source === "card" ? t("finance.sourceCard") : t("finance.sourceCash")}
              </Td>
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
          <Select
            label={t("finance.paymentSource")}
            options={PAYMENT_SOURCE_OPTIONS.map(o => ({ value: o.value, label: t(o.labelKey) }))}
            value={form.payment_source}
            onChange={(e) => setForm({ ...form, payment_source: e.target.value })}
          />

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_recurring}
              onChange={() => setForm((prev) => ({ ...prev, is_recurring: !prev.is_recurring }))}
              className="rounded border-white/20 bg-white/5 accent-blue-500"
            />
            <span className="text-sm text-gray-300">{t("finance.recurring")}</span>
          </label>

          {/* Receipt upload */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">{t("expenses.receipt")}</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => receipt.inputRef.current?.click()}
                disabled={receipt.uploading}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm glass-input text-gray-400 hover:text-purple-200 transition-colors disabled:opacity-50"
              >
                {receipt.uploading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                {t("expenses.uploadReceipt")}
              </button>
              {form.receipt_url && (
                <span className="text-xs text-green-400">{t("expenses.receiptUploaded")}</span>
              )}
            </div>
            <input ref={receipt.inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => receipt.handleUpload(e, (url) => setForm((prev) => ({ ...prev, receipt_url: url })))} />
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" onClick={closeModal}>{t("common.cancel")}</Button>
            <Button onClick={handleSubmit} loading={createMut.isPending || updateMut.isPending}>{t("common.save")}</Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <DeleteConfirmModal
        open={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={() => confirmDeleteId && deleteMut.mutate(confirmDeleteId)}
        isPending={deleteMut.isPending}
      />

      {/* Auto-generate recurring income modal */}
      <Modal open={autoModalOpen} onClose={() => setAutoModalOpen(false)} title={t("finance.generateRecurring")}>
        <div className="space-y-4">
          <p className="text-sm text-gray-400">{t("finance.recurringDescription")}</p>

          <div className="space-y-1">
            {recurringRows.map((row) => (
              <label
                key={row.source}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedSources.has(row.source) ? "bg-white/[0.06]" : "hover:bg-white/[0.03]"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedSources.has(row.source)}
                  onChange={() => toggleSource(row.source)}
                  className="rounded border-white/20 bg-white/5 accent-blue-500"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-purple-200">{row.source}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {row.description} &middot; {row.category}
                  </div>
                  <div className="text-xs text-blue-400/70 mt-0.5">
                    &rarr; {row.nextDateLabel}
                  </div>
                </div>
                <div className="text-sm font-medium text-gray-400 whitespace-nowrap">
                  {formatMoney(row.amount)}
                </div>
              </label>
            ))}
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" onClick={() => setAutoModalOpen(false)}>{t("common.cancel")}</Button>
            <Button
              onClick={handleAutoGenerate}
              loading={autoMut.isPending}
              disabled={selectedSources.size === 0}
            >
              {t("finance.generateRecurring")} ({selectedSources.size})
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ── AdvancesTab ─────────────────────────────────────────────────── */

function AdvancesTab({ users }: { users: User[] }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState(() => ({ user_id: "", amount: "", note: "", date: format(new Date(), "yyyy-MM-dd"), payment_source: "cash", receipt_url: "" }));
  const receipt = useReceiptUpload();

  const { data: advances = [], isLoading } = useQuery({ queryKey: ["cash-advances"], queryFn: getCashAdvances });
  const { data: balances = [] } = useQuery({ queryKey: ["cash-advance-balances"], queryFn: getCashAdvanceBalances });
  const staffList = useMemo(() => users.filter((u) => u.role !== "owner"), [users]);
  const userById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);

  const createMut = useMutation({
    mutationFn: createCashAdvance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cash-advances"] });
      queryClient.invalidateQueries({ queryKey: ["cash-advance-balances"] });
      setModalOpen(false);
      setForm({ user_id: "", amount: "", note: "", date: format(new Date(), "yyyy-MM-dd"), payment_source: "cash", receipt_url: "" });
    },
    onError: (err: any) => { toast.error(err?.response?.data?.detail || err?.message || t("common.error")); },
  });

  const deleteMut = useMutation({
    mutationFn: deleteCashAdvance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cash-advances"] });
      queryClient.invalidateQueries({ queryKey: ["cash-advance-balances"] });
      setConfirmDeleteId(null);
    },
    onError: (err: any) => { toast.error(err?.response?.data?.detail || err?.message || t("common.error")); },
  });

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Source stats */}
      <SourceStats items={advances} />

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
        <Table headers={[t("staff.employee"), t("finance.amount"), t("finance.paymentSource"), t("finance.advanceNote"), t("common.date"), ""]}>
          {advances.map((a) => {
            const user = userById.get(a.user_id);
            return (
              <tr key={a.id}>
                <Td className="font-medium">{user?.full_name || `ID ${a.user_id}`}</Td>
                <Td className="font-medium text-blue-400">{formatMoney(a.amount)}</Td>
                <Td className="text-xs">
                  {a.payment_source === "ip" ? t("finance.sourceIP") : a.payment_source === "card" ? t("finance.sourceCard") : t("finance.sourceCash")}
                </Td>
                <Td className="text-sm text-gray-400">
                  <div>
                    {a.note || "\u2014"}
                    {a.receipt_url && (
                      <a href={a.receipt_url} target="_blank" rel="noreferrer" className="text-xs text-blue-400 ml-2">
                        {t("expenses.viewReceipt")}
                      </a>
                    )}
                  </div>
                </Td>
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
          <Select
            label={t("finance.paymentSource")}
            options={PAYMENT_SOURCE_OPTIONS.map(o => ({ value: o.value, label: t(o.labelKey) }))}
            value={form.payment_source}
            onChange={(e) => setForm({ ...form, payment_source: e.target.value })}
          />
          {/* Receipt upload */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">{t("expenses.receipt")}</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => receipt.inputRef.current?.click()}
                disabled={receipt.uploading}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm glass-input text-gray-400 hover:text-purple-200 transition-colors disabled:opacity-50"
              >
                {receipt.uploading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                {t("expenses.uploadReceipt")}
              </button>
              {form.receipt_url && (
                <span className="text-xs text-green-400">{t("expenses.receiptUploaded")}</span>
              )}
            </div>
            <input ref={receipt.inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => receipt.handleUpload(e, (url) => setForm((prev) => ({ ...prev, receipt_url: url })))} />
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>{t("common.cancel")}</Button>
            <Button
              onClick={() => createMut.mutate({ user_id: Number(form.user_id), amount: Number(form.amount), note: form.note || undefined, date: form.date, payment_source: form.payment_source, receipt_url: form.receipt_url || undefined })}
              loading={createMut.isPending}
              disabled={!form.user_id || !form.amount}
            >
              {t("common.save")}
            </Button>
          </div>
        </div>
      </Modal>

      <DeleteConfirmModal
        open={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={() => confirmDeleteId && deleteMut.mutate(confirmDeleteId)}
        isPending={deleteMut.isPending}
      />
    </div>
  );
}

/* ── BalanceTab ──────────────────────────────────────────────────── */

const PERIODS = [
  { id: "day", label: "finance.periodDay" },
  { id: "week", label: "finance.periodWeek" },
  { id: "month", label: "finance.periodMonth" },
  { id: "year", label: "finance.periodYear" },
  { id: "all", label: "finance.periodAll" },
] as const;

const SOURCE_CONFIG: Record<string, { icon: typeof Banknote; color: string; bgColor: string }> = {
  cash: { icon: Banknote, color: "text-green-400", bgColor: "bg-green-500/10" },
  ip: { icon: Building2, color: "text-blue-400", bgColor: "bg-blue-500/10" },
  card: { icon: CreditCard, color: "text-purple-400", bgColor: "bg-purple-500/10" },
};

const SOURCE_LABELS: Record<string, string> = {
  cash: "finance.sourceCash",
  ip: "finance.sourceIP",
  card: "finance.sourceCard",
};

const MONTH_NAMES = Array.from({ length: 12 }, (_, i) =>
  format(new Date(2024, i, 1), "LLLL", { locale: ru })
);

function BalanceTab() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState("month");
  const [customMonth, setCustomMonth] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());
  const pickerRef = useRef<HTMLDivElement>(null);

  // Compute start/end for custom month
  const customStart = customMonth ? `${customMonth}-01` : undefined;
  const customEnd = customMonth
    ? format(endOfMonth(parseISO(`${customMonth}-01`)), "yyyy-MM-dd")
    : undefined;

  const { data, isLoading } = useQuery<BalanceResponse>({
    queryKey: ["finance-balance", period, customStart, customEnd],
    queryFn: () => getFinanceBalance(period, customStart, customEnd),
  });

  function handleMonthSelect(monthIndex: number) {
    const value = `${pickerYear}-${String(monthIndex + 1).padStart(2, "0")}`;
    setCustomMonth(value);
    setPeriod("custom");
    setPickerOpen(false);
  }

  function handlePeriodClick(id: string) {
    setPeriod(id);
    setCustomMonth("");
    setPickerOpen(false);
  }

  // Close picker on outside click
  useEffect(() => {
    if (!pickerOpen) return;
    function onClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [pickerOpen]);

  if (isLoading) return <LoadingSpinner />;
  if (!data) return <div className="text-center py-8 text-gray-500">{t("finance.noData")}</div>;

  return (
    <div className="space-y-6">
      {/* Period filter pills + calendar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            onClick={() => handlePeriodClick(p.id)}
            className={`text-xs px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              period === p.id
                ? "bg-blue-500/15 text-blue-400 font-medium"
                : "text-gray-500 hover:bg-white/10"
            }`}
          >
            {t(p.label)}
          </button>
        ))}
        <div className="relative" ref={pickerRef}>
          <button
            onClick={() => { setPickerOpen(!pickerOpen); setPickerYear(customMonth ? parseInt(customMonth.split("-")[0]) : new Date().getFullYear()); }}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              period === "custom"
                ? "bg-blue-500/15 text-blue-400 font-medium"
                : "text-gray-500 hover:bg-white/10"
            }`}
          >
            <CalendarDays size={14} />
            {customMonth
              ? format(parseISO(`${customMonth}-01`), "LLLL yyyy", { locale: ru })
              : t("finance.pickMonth")}
          </button>
          {pickerOpen && (
            <div className="absolute top-full left-0 mt-2 z-50 glass-card rounded-xl p-3 shadow-xl border border-white/10 w-64">
              <div className="flex items-center justify-between mb-3">
                <button onClick={() => setPickerYear(y => y - 1)} className="p-1 rounded hover:bg-white/10 text-gray-400">
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm font-medium text-white">{pickerYear}</span>
                <button onClick={() => setPickerYear(y => y + 1)} className="p-1 rounded hover:bg-white/10 text-gray-400">
                  <ChevronRight size={16} />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {MONTH_NAMES.map((name, i) => {
                  const val = `${pickerYear}-${String(i + 1).padStart(2, "0")}`;
                  const isSelected = customMonth === val;
                  return (
                    <button
                      key={i}
                      onClick={() => handleMonthSelect(i)}
                      className={`text-xs py-1.5 px-1 rounded-lg transition-colors ${
                        isSelected
                          ? "bg-blue-500/20 text-blue-400 font-medium"
                          : "text-gray-400 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Source breakdown cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {data.sources.map((src) => {
          const cfg = SOURCE_CONFIG[src.source] || SOURCE_CONFIG.cash;
          const Icon = cfg.icon;
          return (
            <div key={src.source} className="glass-card rounded-xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2.5 rounded-lg ${cfg.bgColor}`}>
                  <Icon size={22} className={cfg.color} />
                </div>
                <span className={`text-lg font-semibold ${cfg.color}`}>
                  {t(SOURCE_LABELS[src.source] || src.source)}
                </span>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <TrendingUp size={14} className="text-green-400" />
                    {t("finance.balanceIncome")}
                  </div>
                  <span className="text-sm font-medium text-green-400">+{formatMoney(src.income)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <TrendingDown size={14} className="text-red-400" />
                    {t("finance.balanceExpenses")}
                  </div>
                  <span className="text-sm font-medium text-red-400">-{formatMoney(src.expenses)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Wallet size={14} className="text-orange-400" />
                    {t("finance.balancePayroll")}
                  </div>
                  <span className="text-sm font-medium text-orange-400">-{formatMoney(src.payroll)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <HandCoins size={14} className="text-yellow-400" />
                    {t("finance.balanceAdvances")}
                  </div>
                  <span className="text-sm font-medium text-yellow-400">-{formatMoney(src.advances)}</span>
                </div>
                <div className="border-t border-white/[0.06] pt-3 flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-300">{t("finance.balanceNet")}</span>
                  <span className={`text-lg font-bold ${src.balance >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {formatMoney(src.balance)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Total balance card */}
      <div className="glass-card rounded-xl p-6 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 border border-white/[0.08]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="text-sm text-gray-400 mb-1">{t("finance.totalBalance")}</div>
            <div className={`text-3xl font-bold ${data.total_balance >= 0 ? "text-green-400" : "text-red-400"}`}>
              {formatMoney(data.total_balance)}
            </div>
          </div>
          <div className="flex gap-6 text-sm">
            <div>
              <div className="text-gray-500">{t("finance.balanceIncome")}</div>
              <div className="text-green-400 font-medium">+{formatMoney(data.total_income)}</div>
            </div>
            <div>
              <div className="text-gray-500">{t("finance.balanceExpenses")}</div>
              <div className="text-red-400 font-medium">-{formatMoney(data.total_expenses)}</div>
            </div>
            <div>
              <div className="text-gray-500">{t("finance.balancePayroll")}</div>
              <div className="text-orange-400 font-medium">-{formatMoney(data.total_payroll)}</div>
            </div>
            <div>
              <div className="text-gray-500">{t("finance.balanceAdvances")}</div>
              <div className="text-yellow-400 font-medium">-{formatMoney(data.total_advances)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
