import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./i18n";
import Layout from "./components/layout/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/owner/Dashboard";
import Staff from "./pages/owner/Staff";
import Schedules from "./pages/owner/Schedules";
import Tasks from "./pages/owner/Tasks";
import Finance from "./pages/owner/Finance";
import Notifications from "./pages/owner/Notifications";
import Settings from "./pages/owner/Settings";
import MyDay from "./pages/staff/MyDay";
import MySchedule from "./pages/staff/MySchedule";
import MyTasks from "./pages/staff/MyTasks";
import MyPay from "./pages/staff/MyPay";
import { useAuth } from "./hooks/useAuth";

// Placeholder — will be replaced with full AI chat implementation
function Placeholder({ title }: { title: string }) {
  return (
    <div className="text-xl font-semibold text-gray-900 dark:text-white">
      {title}
    </div>
  );
}

function AiChat() { return <Placeholder title="AI Ассистент" />; }

function LoginRoute() {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <Login />;
}

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginRoute />} />
          <Route element={<Layout />}>
            {/* Owner/Manager routes */}
            <Route path="/" element={<Dashboard />} />
            <Route path="/staff" element={<Staff />} />
            <Route path="/schedules" element={<Schedules />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/finance" element={<Finance />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/settings" element={<Settings />} />
            {/* Staff routes */}
            <Route path="/my-day" element={<MyDay />} />
            <Route path="/my-schedule" element={<MySchedule />} />
            <Route path="/my-tasks" element={<MyTasks />} />
            <Route path="/my-pay" element={<MyPay />} />
            <Route path="/ai-chat" element={<AiChat />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
