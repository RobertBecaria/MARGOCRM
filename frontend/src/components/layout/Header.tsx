import { useTranslation } from "react-i18next";
import { Menu, Moon, Sun, LogOut } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useThemeStore } from "../../store/themeStore";
import NotificationBell from "../shared/NotificationBell";

const roleBadgeColors: Record<string, string> = {
  owner: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  manager: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  driver: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  chef: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  assistant: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300",
  cleaner: "bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300",
};

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { dark, toggle } = useThemeStore();

  return (
    <header className="h-14 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-1 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <Menu size={20} />
      </button>

      <div className="flex-1" />

      <div className="flex items-center gap-3">
        {user && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900 dark:text-white hidden sm:inline">
              {user.full_name}
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                roleBadgeColors[user.role] || ""
              }`}
            >
              {t(`roles.${user.role}`)}
            </span>
          </div>
        )}

        <NotificationBell />

        <button
          onClick={toggle}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title={dark ? "Светлая тема" : "Тёмная тема"}
        >
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <button
          onClick={logout}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title={t("auth.logout")}
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
