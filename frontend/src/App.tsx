import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./i18n";
import Layout from "./components/layout/Layout";
import LoadingSpinner from "./components/shared/LoadingSpinner";
import { ToastContainer } from "./components/ui/Toast";
import { useAuth } from "./hooks/useAuth";

const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Staff = lazy(() => import("./pages/owner/Staff"));
const Schedules = lazy(() => import("./pages/owner/Schedules"));
const Tasks = lazy(() => import("./pages/owner/Tasks"));
const Finance = lazy(() => import("./pages/owner/Finance"));
const Notifications = lazy(() => import("./pages/owner/Notifications"));
const Notes = lazy(() => import("./pages/owner/Notes"));
const Settings = lazy(() => import("./pages/owner/Settings"));
const MyDay = lazy(() => import("./pages/staff/MyDay"));
const MySchedule = lazy(() => import("./pages/staff/MySchedule"));
const MyTasks = lazy(() => import("./pages/staff/MyTasks"));
const MyPay = lazy(() => import("./pages/staff/MyPay"));
const AiChat = lazy(() => import("./pages/staff/AiChat"));

function OwnerRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <LoadingSpinner />;
  if (user.role !== "owner" && user.role !== "manager") return <Navigate to="/my-day" replace />;
  return <>{children}</>;
}

function StaffRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <LoadingSpinner />;
  if (user.role === "owner" || user.role === "manager") return <Navigate to="/" replace />;
  return <>{children}</>;
}

function LoginRoute() {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <Login />;
}

function RegisterRoute() {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <Register />;
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
          <ToastContainer />
          <Routes>
            <Route path="/login" element={<LoginRoute />} />
            <Route path="/register" element={<RegisterRoute />} />
            <Route element={<Layout />}>
              {/* Owner/Manager routes */}
              <Route path="/" element={<OwnerRoute><Finance /></OwnerRoute>} />
              <Route path="/staff" element={<OwnerRoute><Staff /></OwnerRoute>} />
              <Route path="/schedules" element={<OwnerRoute><Schedules /></OwnerRoute>} />
              <Route path="/tasks" element={<OwnerRoute><Tasks /></OwnerRoute>} />
              <Route path="/notes" element={<OwnerRoute><Notes /></OwnerRoute>} />
              <Route path="/notifications" element={<OwnerRoute><Notifications /></OwnerRoute>} />
              <Route path="/settings" element={<OwnerRoute><Settings /></OwnerRoute>} />
              {/* Staff routes */}
              <Route path="/my-day" element={<StaffRoute><MyDay /></StaffRoute>} />
              <Route path="/my-schedule" element={<StaffRoute><MySchedule /></StaffRoute>} />
              <Route path="/my-tasks" element={<StaffRoute><MyTasks /></StaffRoute>} />
              <Route path="/my-pay" element={<StaffRoute><MyPay /></StaffRoute>} />
              <Route path="/ai-chat" element={<StaffRoute><AiChat /></StaffRoute>} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
