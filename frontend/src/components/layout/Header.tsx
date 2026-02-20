import { useTranslation } from "react-i18next";
import { Menu, LogOut } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import NotificationBell from "../shared/NotificationBell";

const roleBadgeColors: Record<string, string> = {
  owner: "bg-purple-500/20 text-purple-300 border border-purple-500/30",
  manager: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
  staff: "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30",
  driver: "bg-green-500/20 text-green-300 border border-green-500/30",
  chef: "bg-orange-500/20 text-orange-300 border border-orange-500/30",
  assistant: "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30",
  cleaner: "bg-pink-500/20 text-pink-300 border border-pink-500/30",
};

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();

  return (
    <header className="h-14 flex items-center justify-between px-4 glass-header relative z-20">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:text-purple-200 hover:bg-white/10 transition-colors"
      >
        <Menu size={20} />
      </button>

      <div className="flex-1" />

      <div className="flex items-center gap-3">
        {user && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-purple-200/80 hidden sm:inline">
              {user.full_name}
            </span>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                roleBadgeColors[user.role] || ""
              }`}
            >
              {t(`roles.${user.role}`)}
            </span>
          </div>
        )}

        <NotificationBell />

        <button
          onClick={logout}
          className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
          title={t("auth.logout")}
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
