import { useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import Sidebar from "./Sidebar";
import Header from "./Header";
import MobileNav from "./MobileNav";
import ChatPanel from "../ai/ChatPanel";

export default function Layout() {
  const { isAuthenticated, user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen mesh-gradient-bg">
      {/* Floating gradient orbs */}
      <div className="orb animate-float-1 w-[500px] h-[500px] bg-purple-600 top-[-10%] left-[-5%]" />
      <div className="orb animate-float-2 w-[400px] h-[400px] bg-blue-600 top-[40%] right-[-5%]" />
      <div className="orb animate-float-3 w-[350px] h-[350px] bg-cyan-500 bottom-[-5%] left-[30%]" />

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        <Header onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 overflow-auto p-4 pb-20 lg:pb-4">
          <Outlet />
        </main>

        <MobileNav />
      </div>

      {(user?.role === "owner" || user?.role === "manager") && <ChatPanel />}
    </div>
  );
}
