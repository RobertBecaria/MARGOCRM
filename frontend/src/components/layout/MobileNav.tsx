import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  Wallet,
  Bot,
  Sun,
  ListTodo,
  CreditCard,
  CalendarDays,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

const ownerItems = [
  { to: "/", icon: LayoutDashboard },
  { to: "/staff", icon: Users },
  { to: "/tasks", icon: CheckSquare },
  { to: "/finance", icon: Wallet },
];

const staffItems = [
  { to: "/my-day", icon: Sun },
  { to: "/my-schedule", icon: CalendarDays },
  { to: "/my-tasks", icon: ListTodo },
  { to: "/my-pay", icon: CreditCard },
  { to: "/ai-chat", icon: Bot },
];

export default function MobileNav() {
  const { user } = useAuth();
  const isAdmin = user?.role === "owner" || user?.role === "manager";
  const items = isAdmin ? ownerItems : staffItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 glass-header border-t border-b-0 lg:hidden">
      <div className="flex justify-around py-2">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `p-2 rounded-lg transition-all duration-200 ${
                isActive
                  ? "mobile-nav-active text-blue-400"
                  : "text-gray-500 hover:text-gray-300"
              }`
            }
          >
            <item.icon size={22} />
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
