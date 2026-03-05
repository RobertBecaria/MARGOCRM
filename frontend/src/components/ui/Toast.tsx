import { create } from "zustand";
import { X } from "lucide-react";

type ToastType = "success" | "error" | "warning";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastStore {
  toasts: Toast[];
  addToast: (message: string, type: ToastType) => void;
  removeToast: (id: string) => void;
}

const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (message, type) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

const BORDER_COLOR: Record<ToastType, string> = {
  error: "border-l-red-500",
  success: "border-l-green-500",
  warning: "border-l-orange-500",
};

const TEXT_COLOR: Record<ToastType, string> = {
  error: "text-red-400",
  success: "text-green-400",
  warning: "text-orange-400",
};

function ToastItem({ toast }: { toast: Toast }) {
  const remove = useToastStore((s) => s.removeToast);

  return (
    <div
      className={`glass-card rounded-lg border-l-4 ${BORDER_COLOR[toast.type]} px-4 py-3 shadow-xl flex items-start gap-3 animate-slide-in-right min-w-[280px] max-w-[420px]`}
    >
      <span className={`text-sm flex-1 ${TEXT_COLOR[toast.type]}`}>{toast.message}</span>
      <button
        onClick={() => remove(toast.id)}
        className="text-gray-500 hover:text-gray-300 shrink-0"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col-reverse gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}

export const toast = {
  error: (msg: string) => useToastStore.getState().addToast(msg, "error"),
  success: (msg: string) => useToastStore.getState().addToast(msg, "success"),
  warning: (msg: string) => useToastStore.getState().addToast(msg, "warning"),
};
