import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { Calendar, CheckSquare, CreditCard, Settings } from "lucide-react";
import { getNotifications, markAsRead, markAllAsRead } from "../../api/notifications";
import type { NotificationType } from "../../types";
import Button from "../../components/ui/Button";
import LoadingSpinner from "../../components/shared/LoadingSpinner";

const typeFilters: { value: string; label: string }[] = [
  { value: "", label: "Все" },
  { value: "schedule", label: "Расписание" },
  { value: "task", label: "Задачи" },
  { value: "payment", label: "Оплата" },
  { value: "system", label: "Система" },
];

const typeIcons: Record<NotificationType, typeof Calendar> = {
  schedule: Calendar,
  task: CheckSquare,
  payment: CreditCard,
  system: Settings,
};

export default function Notifications() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState("");

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => getNotifications(),
  });

  const markReadMut = useMutation({
    mutationFn: markAsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllMut = useMutation({
    mutationFn: markAllAsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const filtered = typeFilter
    ? notifications.filter((n) => n.type === typeFilter)
    : notifications;

  const hasUnread = notifications.some((n) => !n.is_read);

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
          {t("notifications.title")}
        </h1>
        {hasUnread && (
          <Button variant="secondary" onClick={() => markAllMut.mutate()} loading={markAllMut.isPending}>
            {t("notifications.markAllRead")}
          </Button>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {typeFilters.map((f) => (
          <button
            key={f.value}
            onClick={() => setTypeFilter(f.value)}
            className={`px-3 py-1.5 text-xs rounded-full font-medium whitespace-nowrap transition-colors ${
              typeFilter === f.value
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          {t("notifications.empty")}
        </div>
      ) : (
        <div className="space-y-1">
          {filtered.map((n) => {
            const Icon = typeIcons[n.type];
            return (
              <button
                key={n.id}
                onClick={() => { if (!n.is_read) markReadMut.mutate(n.id); }}
                className={`w-full text-left flex items-start gap-3 p-3 rounded-lg transition-colors ${
                  n.is_read
                    ? "hover:bg-gray-50 dark:hover:bg-gray-900"
                    : "bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                }`}
              >
                <div className={`mt-0.5 p-1.5 rounded-lg ${n.is_read ? "bg-gray-100 dark:bg-gray-800 text-gray-400" : "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400"}`}>
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${n.is_read ? "text-gray-600 dark:text-gray-400" : "text-gray-900 dark:text-white"}`}>
                      {n.title}
                    </span>
                    {!n.is_read && <span className="w-2 h-2 rounded-full bg-blue-500" />}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                    {n.message}
                  </div>
                  <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                    {formatDistanceToNow(parseISO(n.created_at), { addSuffix: true, locale: ru })}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
