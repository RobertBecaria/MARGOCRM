import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Users, CheckSquare, Wallet, Bell, Plus, Receipt } from "lucide-react";
import { formatDistanceToNow, parseISO, format } from "date-fns";
import { ru } from "date-fns/locale";
import { useAuth } from "../../hooks/useAuth";
import { getSchedules } from "../../api/schedules";
import { getTasks } from "../../api/tasks";
import { getNotifications } from "../../api/notifications";
import { getFinanceSummary } from "../../api/finance";
import { formatMoney } from "../../utils/formatters";
import Button from "../../components/ui/Button";
import LoadingSpinner from "../../components/shared/LoadingSpinner";

export default function Dashboard() {
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

  const pendingTasks = tasks.filter((t) => t.status !== "done");
  const unreadNotifs = notifications.filter((n) => !n.is_read);
  const recentNotifs = notifications.slice(0, 10);

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
        Добро пожаловать, {user?.full_name}
      </h1>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={Users}
          label="Сотрудники на смене сегодня"
          value={String(todaySchedules.length)}
          color="blue"
        />
        <SummaryCard
          icon={CheckSquare}
          label="Незавершённые задачи"
          value={String(pendingTasks.length)}
          color="orange"
        />
        <SummaryCard
          icon={Wallet}
          label="Расходы за месяц"
          value={summary ? formatMoney(summary.total_expenses) : "—"}
          color="red"
        />
        <SummaryCard
          icon={Bell}
          label="Непрочитанные уведомления"
          value={String(unreadNotifs.length)}
          color="purple"
        />
      </div>

      {/* Quick actions */}
      <div className="flex gap-3">
        <Button onClick={() => navigate("/tasks")}>
          <Plus size={16} />
          Создать задачу
        </Button>
        <Button variant="secondary" onClick={() => navigate("/finance")}>
          <Receipt size={16} />
          Добавить расход
        </Button>
      </div>

      {/* Recent activity */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Последние события
        </h2>
        {recentNotifs.length === 0 ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">Нет событий</div>
        ) : (
          <div className="space-y-1">
            {recentNotifs.map((n) => (
              <div
                key={n.id}
                className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900"
              >
                <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${n.is_read ? "bg-gray-300 dark:bg-gray-600" : "bg-blue-500"}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-900 dark:text-white">{n.title}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{n.message}</div>
                </div>
                <span className="text-[10px] text-gray-400 dark:text-gray-500 whitespace-nowrap">
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

function SummaryCard({ icon: Icon, label, value, color }: {
  icon: typeof Users;
  label: string;
  value: string;
  color: "blue" | "orange" | "red" | "purple";
}) {
  const colorClasses = {
    blue: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950",
    orange: "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950",
    red: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950",
    purple: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950",
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon size={20} />
        </div>
        <div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
        </div>
      </div>
    </div>
  );
}
