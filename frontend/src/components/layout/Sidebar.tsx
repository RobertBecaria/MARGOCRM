import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  Users,
  Calendar,
  CheckSquare,
  Wallet,
  Bell,
  Settings,
  Sun,
  CalendarDays,
  ListTodo,
  CreditCard,
  Bot,
  X,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

const ownerNav = [
  { to: "/", icon: LayoutDashboard, label: "nav.dashboard" },
  { to: "/staff", icon: Users, label: "nav.staff" },
  { to: "/schedules", icon: Calendar, label: "nav.schedules" },
  { to: "/tasks", icon: CheckSquare, label: "nav.tasks" },
  { to: "/finance", icon: Wallet, label: "nav.finance" },
  { to: "/notifications", icon: Bell, label: "nav.notifications" },
  { to: "/settings", icon: Settings, label: "nav.settings" },
];

const staffNav = [
  { to: "/my-day", icon: Sun, label: "nav.myDay" },
  { to: "/my-schedule", icon: CalendarDays, label: "nav.mySchedule" },
  { to: "/my-tasks", icon: ListTodo, label: "nav.myTasks" },
  { to: "/my-pay", icon: CreditCard, label: "nav.myPay" },
  { to: "/ai-chat", icon: Bot, label: "nav.aiChat" },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { t } = useTranslation();
  const { user } = useAuth();

  const isAdmin = user?.role === "owner" || user?.role === "manager";
  const navItems = isAdmin ? ownerNav : staffNav;

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-60 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:z-auto ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between h-14 px-4 border-b border-gray-200 dark:border-gray-800">
          <span className="text-lg font-bold text-gray-900 dark:text-white">
            {t("app.name")}
          </span>
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="p-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`
              }
            >
              <item.icon size={18} />
              {t(item.label)}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
