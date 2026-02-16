import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDistanceToNow, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { getNotifications, markAsRead } from "../../api/notifications";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => getNotifications(),
    refetchInterval: 30000,
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const recent = notifications.slice(0, 5);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all relative"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 notification-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 glass-modal rounded-xl z-50 overflow-hidden animate-scale-in">
          <div className="px-4 py-3 border-b border-white/[0.08]">
            <span className="text-sm font-semibold text-white">
              Уведомления
            </span>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {recent.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-gray-500">
                Нет новых уведомлений
              </div>
            ) : (
              recent.map((n) => (
                <button
                  key={n.id}
                  onClick={() => { if (!n.is_read) markAsRead(n.id); }}
                  className={`w-full text-left px-4 py-3 hover:bg-white/[0.05] border-b border-white/[0.05] last:border-0 transition-colors ${
                    !n.is_read ? "bg-blue-500/[0.05]" : ""
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!n.is_read && (
                      <span className="mt-1.5 w-2 h-2 rounded-full bg-blue-400 shrink-0 shadow-[0_0_6px_rgba(59,130,246,0.5)]" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">
                        {n.title}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {n.message}
                      </div>
                      <div className="text-[10px] text-gray-600 mt-0.5">
                        {formatDistanceToNow(parseISO(n.created_at), { addSuffix: true, locale: ru })}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
          <Link
            to="/notifications"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-center text-xs text-blue-400 hover:bg-white/[0.05] border-t border-white/[0.08] transition-colors"
          >
            Все уведомления
          </Link>
        </div>
      )}
    </div>
  );
}
