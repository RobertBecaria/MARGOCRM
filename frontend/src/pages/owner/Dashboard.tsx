import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Users, CheckSquare, Wallet, Bell, Plus, Receipt } from "lucide-react";
import { formatDistanceToNow, parseISO, format } from "date-fns";
import { ru } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../hooks/useAuth";
import { getSchedules } from "../../api/schedules";
import { getTasks } from "../../api/tasks";
import { getNotifications } from "../../api/notifications";
import { getFinanceSummary } from "../../api/finance";
import { formatMoney } from "../../utils/formatters";
import Button from "../../components/ui/Button";
import LoadingSpinner from "../../components/shared/LoadingSpinner";

export default function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

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

  const pendingTasks = useMemo(() => tasks.filter((t) => t.status !== "done"), [tasks]);
  const { unreadCount, recentNotifs } = useMemo(() => {
    let count = 0;
    for (const n of notifications) {
      if (!n.is_read) count++;
    }
    return { unreadCount: count, recentNotifs: notifications.slice(0, 10) };
  }, [notifications]);

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-xl font-semibold text-white">
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

      {/* Quick actions */}
      <div className="flex gap-3">
        <Button onClick={() => navigate("/tasks")}>
          <Plus size={16} />
          {t("dashboard.createTask")}
        </Button>
        <Button variant="secondary" onClick={() => navigate("/finance")}>
          <Receipt size={16} />
          {t("dashboard.addExpense")}
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
                  <div className="text-sm text-white">{n.title}</div>
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
    </div>
  );
}

const glowColors = {
  blue: "rgba(59, 130, 246, 0.15)",
  orange: "rgba(249, 115, 22, 0.15)",
  red: "rgba(239, 68, 68, 0.15)",
  purple: "rgba(139, 92, 246, 0.15)",
};

const iconBg = {
  blue: "bg-blue-500/15 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]",
  orange: "bg-orange-500/15 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.3)]",
  red: "bg-red-500/15 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.3)]",
  purple: "bg-purple-500/15 text-purple-400 shadow-[0_0_15px_rgba(139,92,246,0.3)]",
};

function SummaryCard({ icon: Icon, label, value, color, delay }: {
  icon: typeof Users;
  label: string;
  value: string;
  color: "blue" | "orange" | "red" | "purple";
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
