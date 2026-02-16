import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
} from "lucide-react";
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
import { getSchedules, createSchedule, updateSchedule, deleteSchedule } from "../../api/schedules";
import { getUsers } from "../../api/users";
import type { Schedule, User } from "../../types";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Modal from "../../components/ui/Modal";
import Badge from "../../components/ui/Badge";
import LoadingSpinner from "../../components/shared/LoadingSpinner";

interface ShiftForm {
  user_id: string;
  date: string;
  shift_start: string;
  shift_end: string;
  location: string;
  notes: string;
}

const emptyForm: ShiftForm = {
  user_id: "",
  date: "",
  shift_start: "09:00",
  shift_end: "18:00",
  location: "",
  notes: "",
};

export default function Schedules() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [staffFilter, setStaffFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Schedule | null>(null);
  const [form, setForm] = useState<ShiftForm>(emptyForm);

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ["schedules", format(weekStart, "yyyy-MM-dd"), format(weekEnd, "yyyy-MM-dd")],
    queryFn: () =>
      getSchedules({
        date_from: format(weekStart, "yyyy-MM-dd"),
        date_to: format(weekEnd, "yyyy-MM-dd"),
      }),
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => getUsers(),
  });

  const staffList = users.filter((u) => u.role !== "owner");

  const staffMap = useMemo(() => {
    const map = new Map<number, { user: User; colorIdx: number }>();
    staffList.forEach((u, i) => map.set(u.id, { user: u, colorIdx: i }));
    return map;
  }, [staffList]);

  const staffFilterOptions = [
    { value: "", label: t("staff.allStaff") },
    ...staffList.map((u) => ({ value: String(u.id), label: u.full_name })),
  ];

  const createMut = useMutation({
    mutationFn: createSchedule,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["schedules"] }); closeModal(); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ShiftForm> }) =>
      updateSchedule(id, {
        user_id: Number(data.user_id),
        date: data.date!,
        shift_start: data.shift_start!,
        shift_end: data.shift_end!,
        location: data.location!,
        notes: data.notes,
      }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["schedules"] }); closeModal(); },
  });

  const deleteMut = useMutation({
    mutationFn: deleteSchedule,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["schedules"] }); closeModal(); },
  });

  function openCreate(day?: Date) {
    setEditing(null);
    setForm({ ...emptyForm, date: day ? format(day, "yyyy-MM-dd") : "" });
    setModalOpen(true);
  }

  function openEdit(schedule: Schedule) {
    setEditing(schedule);
    setForm({
      user_id: String(schedule.user_id),
      date: schedule.date,
      shift_start: schedule.shift_start,
      shift_end: schedule.shift_end,
      location: schedule.location,
      notes: schedule.notes || "",
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setForm(emptyForm);
  }

  function handleSubmit() {
    if (editing) {
      updateMut.mutate({ id: editing.id, data: form });
    } else {
      createMut.mutate({
        user_id: Number(form.user_id),
        date: form.date,
        shift_start: form.shift_start,
        shift_end: form.shift_end,
        location: form.location,
        notes: form.notes || undefined,
      });
    }
  }

  const filtered = staffFilter
    ? schedules.filter((s) => s.user_id === Number(staffFilter))
    : schedules;

  function getShiftsForDay(day: Date) {
    return filtered.filter((s) => isSameDay(parseISO(s.date), day));
  }

  const isSaving = createMut.isPending || updateMut.isPending;

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
          {t("schedule.title")}
        </h1>
        <Button onClick={() => openCreate()}>
          <Plus size={16} />
          {t("schedule.addShift")}
        </Button>
      </div>

      {/* Week navigation & filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentWeek(addWeeks(currentWeek, -1))}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-medium text-gray-900 dark:text-white min-w-[180px] text-center">
            {format(weekStart, "d MMM", { locale: ru })} — {format(weekEnd, "d MMM yyyy", { locale: ru })}
          </span>
          <button
            onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ChevronRight size={18} />
          </button>
          <Button variant="secondary" onClick={() => setCurrentWeek(new Date())}>
            {t("common.today")}
          </Button>
        </div>
        <Select
          options={staffFilterOptions}
          value={staffFilter}
          onChange={(e) => setStaffFilter(e.target.value)}
          className="sm:w-48"
        />
      </div>

      {/* Desktop: weekly grid */}
      <div className="hidden md:grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800">
        {days.map((day) => {
          const isToday = isSameDay(day, new Date());
          const shifts = getShiftsForDay(day);
          return (
            <div
              key={day.toISOString()}
              className="bg-white dark:bg-gray-950 min-h-[140px] p-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900"
              onClick={() => openCreate(day)}
            >
              <div
                className={`text-xs font-medium mb-2 ${
                  isToday
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                {format(day, "EEE, d MMM", { locale: ru })}
              </div>
              <div className="space-y-1">
                {shifts.map((s) => {
                  const info = staffMap.get(s.user_id);
                  return (
                    <div
                      key={s.id}
                      onClick={(e) => { e.stopPropagation(); openEdit(s); }}
                      className="text-xs p-1.5 rounded-md bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900"
                    >
                      <div className="font-medium text-gray-900 dark:text-white truncate">
                        {info?.user.full_name || `ID ${s.user_id}`}
                      </div>
                      <div className="text-gray-500 dark:text-gray-400">
                        {s.shift_start.slice(0, 5)}–{s.shift_end.slice(0, 5)}
                      </div>
                      {s.location && (
                        <div className="text-gray-400 dark:text-gray-500 truncate">
                          {s.location}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile: list view */}
      <div className="md:hidden space-y-3">
        {days.map((day) => {
          const shifts = getShiftsForDay(day);
          const isToday = isSameDay(day, new Date());
          return (
            <div key={day.toISOString()}>
              <div
                className={`text-sm font-medium mb-1 ${
                  isToday ? "text-blue-600 dark:text-blue-400" : "text-gray-700 dark:text-gray-300"
                }`}
              >
                {format(day, "EEEE, d MMMM", { locale: ru })}
              </div>
              {shifts.length === 0 ? (
                <div className="text-xs text-gray-400 dark:text-gray-500 py-1">—</div>
              ) : (
                <div className="space-y-2">
                  {shifts.map((s) => {
                    const info = staffMap.get(s.user_id);
                    return (
                      <div
                        key={s.id}
                        onClick={() => openEdit(s)}
                        className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-3 cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm text-gray-900 dark:text-white">
                            {info?.user.full_name || `ID ${s.user_id}`}
                          </span>
                          <Badge color={s.status === "completed" ? "green" : s.status === "cancelled" ? "red" : "blue"}>
                            {t(`schedule.${s.status}`)}
                          </Badge>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {s.shift_start.slice(0, 5)}–{s.shift_end.slice(0, 5)} &middot; {s.location}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Create/Edit modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? t("common.edit") : t("schedule.addShift")}
      >
        <div className="space-y-4">
          <Select
            label={t("staff.employee")}
            options={[
              { value: "", label: t("staff.selectEmployee") },
              ...staffList.map((u) => ({ value: String(u.id), label: u.full_name })),
            ]}
            value={form.user_id}
            onChange={(e) => setForm({ ...form, user_id: e.target.value })}
          />
          <Input
            label={t("schedule.date")}
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={t("schedule.start")}
              type="time"
              value={form.shift_start}
              onChange={(e) => setForm({ ...form, shift_start: e.target.value })}
              required
            />
            <Input
              label={t("schedule.end")}
              type="time"
              value={form.shift_end}
              onChange={(e) => setForm({ ...form, shift_end: e.target.value })}
              required
            />
          </div>
          <Input
            label={t("schedule.location")}
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            required
          />
          <Input
            label={t("schedule.notes")}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
          <div className="flex gap-3 justify-end pt-2">
            {editing && (
              <Button
                variant="danger"
                loading={deleteMut.isPending}
                onClick={() => deleteMut.mutate(editing.id)}
              >
                {t("schedule.cancelled")}
              </Button>
            )}
            <Button variant="secondary" onClick={closeModal}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSubmit} loading={isSaving}>
              {t("common.save")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
