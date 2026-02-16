import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  format,
  eachDayOfInterval,
  isSameDay,
  parseISO,
} from "date-fns";
import { ru } from "date-fns/locale";
import { getSchedules, createChangeRequest } from "../../api/schedules";
import { useAuth } from "../../hooks/useAuth";
import type { Schedule } from "../../types";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import Badge from "../../components/ui/Badge";
import LoadingSpinner from "../../components/shared/LoadingSpinner";

export default function MySchedule() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [changeModal, setChangeModal] = useState<Schedule | null>(null);
  const [reason, setReason] = useState("");
  const [requestedDate, setRequestedDate] = useState("");

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ["my-schedules", format(weekStart, "yyyy-MM-dd"), format(weekEnd, "yyyy-MM-dd")],
    queryFn: () =>
      getSchedules({
        user_id: user?.id,
        date_from: format(weekStart, "yyyy-MM-dd"),
        date_to: format(weekEnd, "yyyy-MM-dd"),
      }),
    enabled: !!user,
  });

  const changeMut = useMutation({
    mutationFn: createChangeRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-schedules"] });
      setChangeModal(null);
      setReason("");
      setRequestedDate("");
    },
  });

  function getShiftsForDay(day: Date) {
    return schedules.filter((s) => isSameDay(parseISO(s.date), day));
  }

  function handleChangeRequest() {
    if (!changeModal) return;
    changeMut.mutate({
      original_schedule_id: changeModal.id,
      requested_date: requestedDate,
      reason,
    });
  }

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-purple-200">
        {t("nav.mySchedule")}
      </h1>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setCurrentWeek(addWeeks(currentWeek, -1))}
          className="p-1.5 rounded-lg text-gray-500 hover:bg-white/10"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-medium text-purple-200 min-w-[180px] text-center">
          {format(weekStart, "d MMM", { locale: ru })} — {format(weekEnd, "d MMM yyyy", { locale: ru })}
        </span>
        <button
          onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
          className="p-1.5 rounded-lg text-gray-500 hover:bg-white/10"
        >
          <ChevronRight size={18} />
        </button>
        <Button variant="secondary" onClick={() => setCurrentWeek(new Date())}>
          {t("common.today")}
        </Button>
      </div>

      <div className="space-y-3">
        {days.map((day) => {
          const shifts = getShiftsForDay(day);
          const isToday = isSameDay(day, new Date());
          return (
            <div key={day.toISOString()}>
              <div
                className={`text-sm font-medium mb-1 ${
                  isToday ? "text-blue-400" : "text-gray-300"
                }`}
              >
                {format(day, "EEEE, d MMMM", { locale: ru })}
              </div>
              {shifts.length === 0 ? (
                <div className="text-xs text-gray-600 py-1">—</div>
              ) : (
                <div className="space-y-2">
                  {shifts.map((s) => (
                    <div
                      key={s.id}
                      className="glass-card rounded-lg p-3"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-purple-200">
                            {s.shift_start.slice(0, 5)}–{s.shift_end.slice(0, 5)}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {s.location}
                          </div>
                          {s.notes && (
                            <div className="text-xs text-gray-600 mt-0.5">
                              {s.notes}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge color={s.status === "completed" ? "green" : s.status === "cancelled" ? "red" : "blue"}>
                            {t(`schedule.${s.status}`)}
                          </Badge>
                          {s.status === "scheduled" && (
                            <Button
                              variant="secondary"
                              onClick={() => { setChangeModal(s); setRequestedDate(s.date); }}
                              className="text-xs !px-2 !py-1"
                            >
                              Запросить изменение
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Change request modal */}
      <Modal
        open={changeModal !== null}
        onClose={() => { setChangeModal(null); setReason(""); setRequestedDate(""); }}
        title={t("schedule.requestChange")}
      >
        <div className="space-y-4">
          <Input
            label={t("schedule.desiredDate")}
            type="date"
            value={requestedDate}
            onChange={(e) => setRequestedDate(e.target.value)}
            required
          />
          <Input
            label={t("schedule.reason")}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("schedule.reasonPlaceholder")}
            required
          />
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" onClick={() => { setChangeModal(null); setReason(""); }}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleChangeRequest} loading={changeMut.isPending}>
              {t("schedule.submit")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
