import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar } from "lucide-react";
import { format, parseISO, isPast } from "date-fns";
import { ru } from "date-fns/locale";
import { getTasks, updateTask } from "../../api/tasks";
import { useAuth } from "../../hooks/useAuth";
import type { TaskStatus } from "../../types";
import { PRIORITY_COLOR, STATUS_FLOW, STATUS_LABEL_KEYS } from "../../utils/constants";
import Badge from "../../components/ui/Badge";
import LoadingSpinner from "../../components/shared/LoadingSpinner";

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
        <h1 className="text-xl font-semibold text-purple-200">
          {t("nav.myTasks")}
        </h1>
        <div className="text-center py-12 text-gray-500">
          {t("tasks.noTasksToday")}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-purple-200">
        {t("nav.myTasks")}
      </h1>

      <div className="space-y-2">
        {tasks.map((task) => {
          const isOverdue = task.due_date && task.status !== "done" && isPast(parseISO(task.due_date));

          return (
            <div
              key={task.id}
              className={`glass-card rounded-lg border p-4 ${
                isOverdue
                  ? "border-red-500/30"
                  : "border-white/[0.08]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="text-sm font-medium text-purple-200">
                    {task.title}
                  </div>
                  {task.description && (
                    <div className="text-xs text-gray-500 mt-1">
                      {task.description}
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <Badge color={PRIORITY_COLOR[task.priority]}>
                      {t(`tasks.${task.priority}`)}
                    </Badge>
                    {task.due_date && (
                      <span className={`text-xs flex items-center gap-0.5 ${isOverdue ? "text-red-400" : "text-gray-400"}`}>
                        <Calendar size={12} />
                        {format(parseISO(task.due_date), "d MMM", { locale: ru })}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-1">
                  {STATUS_FLOW.map((status) => (
                    <button
                      key={status}
                      onClick={() => updateMut.mutate({ id: task.id, status })}
                      disabled={task.status === status}
                      className={`text-xs px-2 py-1 rounded-md transition-colors ${
                        task.status === status
                          ? "bg-blue-500/15 text-blue-400 font-medium"
                          : "text-gray-500 hover:bg-white/10"
                      }`}
                    >
                      {t(STATUS_LABEL_KEYS[status])}
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
