import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./i18n";
import Layout from "./components/layout/Layout";
import LoadingSpinner from "./components/shared/LoadingSpinner";
import { useAuth } from "./hooks/useAuth";

const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/owner/Dashboard"));
const Staff = lazy(() => import("./pages/owner/Staff"));
const Schedules = lazy(() => import("./pages/owner/Schedules"));
const Tasks = lazy(() => import("./pages/owner/Tasks"));
const Finance = lazy(() => import("./pages/owner/Finance"));
const Notifications = lazy(() => import("./pages/owner/Notifications"));
const Settings = lazy(() => import("./pages/owner/Settings"));
const MyDay = lazy(() => import("./pages/staff/MyDay"));
const MySchedule = lazy(() => import("./pages/staff/MySchedule"));
const MyTasks = lazy(() => import("./pages/staff/MyTasks"));
const MyPay = lazy(() => import("./pages/staff/MyPay"));
const AiChat = lazy(() => import("./pages/staff/AiChat"));

function LoginRoute() {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <Login />;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<LoadingSpinner />}>
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
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
