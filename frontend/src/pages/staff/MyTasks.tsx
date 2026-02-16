import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar } from "lucide-react";
import { format, parseISO, isPast } from "date-fns";
import { ru } from "date-fns/locale";
import { getTasks, updateTask } from "../../api/tasks";
import { useAuth } from "../../hooks/useAuth";
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

export default function MyTasks() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["my-tasks"],
    queryFn: () => getTasks({ assigned_to: user?.id }),
    enabled: !!user,
  });

  const updateMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: TaskStatus }) =>
      updateTask(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-tasks"] }),
  });

  if (isLoading) return <LoadingSpinner />;

  if (tasks.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
          {t("nav.myTasks")}
        </h1>
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          Нет задач на сегодня
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
        {t("nav.myTasks")}
      </h1>

      <div className="space-y-2">
        {tasks.map((task) => {
          const isOverdue = task.due_date && task.status !== "done" && isPast(parseISO(task.due_date));

          return (
            <div
              key={task.id}
              className={`bg-white dark:bg-gray-900 rounded-lg border p-4 ${
                isOverdue
                  ? "border-red-300 dark:border-red-800"
                  : "border-gray-200 dark:border-gray-800"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {task.title}
                  </div>
                  {task.description && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {task.description}
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <Badge color={priorityColor[task.priority]}>
                      {t(`tasks.${task.priority}`)}
                    </Badge>
                    {task.due_date && (
                      <span className={`text-xs flex items-center gap-0.5 ${isOverdue ? "text-red-600 dark:text-red-400" : "text-gray-400"}`}>
                        <Calendar size={12} />
                        {format(parseISO(task.due_date), "d MMM", { locale: ru })}
                      </span>
                    )}
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
          );
        })}
      </div>
    </div>
  );
}
