import { useTranslation } from "react-i18next";
import { Menu, Moon, Sun, LogOut } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useThemeStore } from "../../store/themeStore";
import NotificationBell from "../shared/NotificationBell";

const roleBadgeColors: Record<string, string> = {
  owner: "bg-purple-500/20 text-purple-300 border border-purple-500/30",
  manager: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
  driver: "bg-green-500/20 text-green-300 border border-green-500/30",
  chef: "bg-orange-500/20 text-orange-300 border border-orange-500/30",
  assistant: "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30",
  cleaner: "bg-pink-500/20 text-pink-300 border border-pink-500/30",
};

const roleBadgeColorsLight: Record<string, string> = {
  owner: "bg-purple-100 text-purple-700 border border-purple-200",
  manager: "bg-blue-100 text-blue-700 border border-blue-200",
  driver: "bg-green-100 text-green-700 border border-green-200",
  chef: "bg-orange-100 text-orange-700 border border-orange-200",
  assistant: "bg-cyan-100 text-cyan-700 border border-cyan-200",
  cleaner: "bg-pink-100 text-pink-700 border border-pink-200",
};

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { dark, toggle } = useThemeStore();

  const badgeColors = dark ? roleBadgeColors : roleBadgeColorsLight;

  return (
    <header className="h-14 flex items-center justify-between px-4 glass-header relative z-20">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
      >
        <Menu size={20} />
      </button>

      <div className="flex-1" />

      <div className="flex items-center gap-3">
        {user && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white/80 hidden sm:inline">
              {user.full_name}
            </span>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                badgeColors[user.role] || ""
              }`}
            >
              {t(`roles.${user.role}`)}
            </span>
          </div>
        )}

        <NotificationBell />

        <button
          onClick={toggle}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
          title={dark ? t("settings.lightTheme") : t("settings.darkTheme")}
        >
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

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
