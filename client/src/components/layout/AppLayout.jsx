import { Outlet, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";
import { Shield } from "lucide-react";

const pageLabels = {
  "/dashboard": "Dashboard",
  "/inventory": "Inventory",
  "/scanner": "QR Scanner",
  "/alerts": "Alerts",
  "/reports": "Reports",
  "/logs": "Logs",
  "/users": "User Management",
};

export default function AppLayout() {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-background">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl" style={{ background: 'hsl(166 56% 38%)' }}>
          <Shield className="w-6 h-6 text-white animate-pulse" />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          Loading...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const currentPage = pageLabels[location.pathname] || "Dashboard";

  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden md:flex">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex items-center justify-between h-14 md:h-16 px-4 md:px-6 bg-card/95 border-b border-border shrink-0 backdrop-blur supports-[backdrop-filter]:bg-card/85 shadow-xs">
          <div className="flex items-center gap-3">
            <h2 className="text-[15px] font-semibold text-foreground">{currentPage}</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'hsl(168 25% 94%)' }}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'hsl(166 56% 45%)' }} />
              <span className="text-xs font-medium" style={{ color: 'hsl(168 40% 22%)' }}>
                {user?.healthCenter?.name || "CHO Office"}
              </span>
            </div>
          </div>
        </header>
        {/* Page content */}
        <main className="flex-1 overflow-auto pb-20 md:pb-0">
          <div className="p-4 md:p-6 max-w-[1400px]">
            <Outlet />
          </div>
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
