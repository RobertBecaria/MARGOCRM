import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Calendar, Clock, LogIn, LogOut, Sparkles, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { useAuth } from "../../hooks/useAuth";
import { getSchedules } from "../../api/schedules";
import { getTasks, updateTask } from "../../api/tasks";
import { getTodayStatus, clockIn, clockOut } from "../../api/timecard";
import type { TaskStatus } from "../../types";
import { PRIORITY_COLOR, STATUS_FLOW, STATUS_LABEL_KEYS } from "../../utils/constants";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import LoadingSpinner from "../../components/shared/LoadingSpinner";

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

  const { data: timecard, isLoading: loadingTimecard } = useQuery({
    queryKey: ["timecard-today"],
    queryFn: getTodayStatus,
    refetchInterval: 60_000,
  });

  const updateMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: TaskStatus }) =>
      updateTask(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-tasks-active"] }),
  });

  const clockInMut = useMutation({
    mutationFn: clockIn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["timecard-today"] }),
  });

  const clockOutMut = useMutation({
    mutationFn: clockOut,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["timecard-today"] }),
  });

  const activeTasks = tasks.filter((t) => t.status !== "done");

  const isClockedIn = timecard && !timecard.clock_out;
  const isClockError = clockInMut.isError || clockOutMut.isError;
  const clockErrorMsg = (clockInMut.error as any)?.response?.data?.detail
    || (clockOutMut.error as any)?.response?.data?.detail
    || "";
  const isIpadError = clockErrorMsg.includes("iPad");

  // Calculate worked time
  let workedTime = "";
  if (timecard?.clock_in) {
    const start = new Date(timecard.clock_in);
    const end = timecard.clock_out ? new Date(timecard.clock_out) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const hours = Math.floor(diffMs / 3600000);
    const mins = Math.floor((diffMs % 3600000) / 60000);
    workedTime = `${hours}ч ${mins}м`;
  }

  if (loadingSchedules || loadingTasks || loadingTimecard) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-purple-200">
        {t("nav.myDay")}
      </h1>

      {/* Clock in/out card */}
      <div className="glass-card glow-border rounded-xl p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${isClockedIn ? "bg-green-500/15 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.3)]" : "bg-gray-500/15 text-gray-400"}`}>
              <Clock size={20} />
            </div>
            <div>
              <div className="text-sm font-medium text-purple-200">
                {isClockedIn ? t("tasks.clockedIn") : (timecard?.clock_out ? t("tasks.clockedOut") : t("tasks.clockIn"))}
              </div>
              {timecard?.clock_in && (
                <div className="text-xs text-gray-500 mt-0.5">
                  {t("tasks.clockInTime")}: {format(new Date(timecard.clock_in), "HH:mm")}
                  {timecard.clock_out && (
                    <> &middot; {t("tasks.clockOutTime")}: {format(new Date(timecard.clock_out), "HH:mm")}</>
                  )}
                  {workedTime && <> &middot; {t("tasks.workedTime")}: {workedTime}</>}
                </div>
              )}
            </div>
          </div>
          <div>
            {isClockedIn ? (
              <Button
                onClick={() => clockOutMut.mutate()}
                loading={clockOutMut.isPending}
              >
                <LogOut size={16} />
                {t("tasks.clockOut")}
              </Button>
            ) : (
              <Button
                onClick={() => clockInMut.mutate()}
                loading={clockInMut.isPending}
                disabled={!!timecard?.clock_out}
              >
                <LogIn size={16} />
                {t("tasks.clockIn")}
              </Button>
            )}
          </div>
        </div>
        {isClockError && (
          <div className="mt-3 flex items-center gap-2 text-xs text-red-400">
            <AlertCircle size={14} />
            {isIpadError ? t("tasks.ipadOnly") : clockErrorMsg}
          </div>
        )}
      </div>

      {/* Today's schedule */}
      <div>
        <h2 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
          <Calendar size={16} />
          {format(new Date(), "EEEE, d MMMM", { locale: ru })}
        </h2>
        {schedules.length === 0 ? (
          <div className="glass-card rounded-xl p-4 text-sm text-gray-500">
            {t("schedule.noShiftsToday")}
          </div>
        ) : (
          <div className="space-y-2">
            {schedules.map((s) => (
              <div
                key={s.id}
                className="glass-card rounded-xl p-4"
              >
                <div className="text-sm font-medium text-purple-200">
                  {s.shift_start.slice(0, 5)} — {s.shift_end.slice(0, 5)}
                </div>
                <div className="text-xs text-gray-500 mt-1">{s.location}</div>
                {s.notes && (
                  <div className="text-xs text-gray-600 mt-0.5">{s.notes}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active tasks */}
      <div>
        <h2 className="text-sm font-semibold text-gray-300 mb-2">
          {t("tasks.activeTasks")} ({activeTasks.length})
        </h2>
        {activeTasks.length === 0 ? (
          <div className="glass-card rounded-xl p-4 text-sm text-gray-500">
            {t("tasks.noActiveTasks")}
          </div>
        ) : (
          <div className="space-y-2">
            {activeTasks.map((task) => (
              <div
                key={task.id}
                className="glass-card rounded-xl p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-purple-200">
                      {task.title}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge color={PRIORITY_COLOR[task.priority]}>
                        {t(`tasks.${task.priority}`)}
                      </Badge>
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
            ))}
          </div>
        )}
      </div>

      {/* Quick AI link */}
      <Link
        to="/ai-chat"
        className="flex items-center gap-3 glass-card rounded-xl p-4 hover:bg-white/[0.05] transition-colors"
      >
        <div className="p-2 rounded-lg bg-purple-500/15 text-purple-400">
          <Sparkles size={20} />
        </div>
        <div>
          <div className="text-sm font-medium text-purple-200">
            {t("ai.askAssistant")}
          </div>
          <div className="text-xs text-gray-500">
            {t("ai.placeholder")}
          </div>
        </div>
      </Link>
    </div>
  );
}
