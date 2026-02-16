import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Calendar, Bot } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { useAuth } from "../../hooks/useAuth";
import { getSchedules } from "../../api/schedules";
import { getTasks, updateTask } from "../../api/tasks";
import type { TaskStatus, TaskPriority } from "../../types";
import Badge from "../../components/ui/Badge";
import LoadingSpinner from "../../components/shared/LoadingSpinner";

const priorityColor: Record<TaskPriority, "gray" | "blue" | "orange" | "red"> = {
  low: "gray",
  medium: "blue",
  high: "orange",
  urgent: "red",
};

const statusFlow: TaskStatus[] = ["pending", "in_progress", "done"];
const statusLabels: Record<TaskStatus, string> = {
  pending: "tasks.pending",
  in_progress: "tasks.inProgress",
  done: "tasks.done",
};

export default function MyDay() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: schedules = [], isLoading: loadingSchedules } = useQuery({
    queryKey: ["my-schedules-today"],
    queryFn: () => getSchedules({ user_id: user?.id, date_from: today, date_to: today }),
    enabled: !!user,
  });

  const { data: tasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ["my-tasks-active"],
    queryFn: () => getTasks({ assigned_to: user?.id }),
    enabled: !!user,
  });

  const updateMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: TaskStatus }) =>
      updateTask(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-tasks-active"] }),
  });

  const activeTasks = tasks.filter((t) => t.status !== "done");

  if (loadingSchedules || loadingTasks) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
        {t("nav.myDay")}
      </h1>

      {/* Today's schedule */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
          <Calendar size={16} />
          {format(new Date(), "EEEE, d MMMM", { locale: ru })}
        </h2>
        {schedules.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 text-sm text-gray-500 dark:text-gray-400">
            Нет смен сегодня
          </div>
        ) : (
          <div className="space-y-2">
            {schedules.map((s) => (
              <div
                key={s.id}
                className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4"
              >
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {s.shift_start.slice(0, 5)} — {s.shift_end.slice(0, 5)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{s.location}</div>
                {s.notes && (
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{s.notes}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active tasks */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Активные задачи ({activeTasks.length})
        </h2>
        {activeTasks.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 text-sm text-gray-500 dark:text-gray-400">
            Нет активных задач
          </div>
        ) : (
          <div className="space-y-2">
            {activeTasks.map((task) => (
              <div
                key={task.id}
                className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {task.title}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge color={priorityColor[task.priority]}>
                        {t(`tasks.${task.priority}`)}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {statusFlow.map((status) => (
                      <button
                        key={status}
                        onClick={() => updateMut.mutate({ id: task.id, status })}
                        disabled={task.status === status}
                        className={`text-xs px-2 py-1 rounded-md transition-colors ${
                          task.status === status
                            ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-medium"
                            : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                        }`}
                      >
                        {t(statusLabels[status])}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick AI link */}
      <Link
        to="/ai-chat"
        className="flex items-center gap-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400">
          <Bot size={20} />
        </div>
        <div>
          <div className="text-sm font-medium text-gray-900 dark:text-white">
            Спросить AI ассистента
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {t("ai.placeholder")}
          </div>
        </div>
      </Link>
    </div>
  );
}
