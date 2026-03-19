import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  ScanLine,
  Bell,
  FileText,
  ClipboardList,
  Users,
  LogOut,
  Shield,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState, useEffect } from "react";
import { alertAPI } from "@/lib/api";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Inventory", href: "/inventory", icon: Package },
  { name: "Scanner", href: "/scanner", icon: ScanLine },
  { name: "Alerts", href: "/alerts", icon: Bell },
];

const oversightNavigation = [
  { name: "Reports", href: "/reports", icon: FileText },
  { name: "Logs", href: "/logs", icon: ClipboardList },
];

const adminNavigation = [
  { name: "Users", href: "/users", icon: Users },
];

export default function Sidebar() {
  const { user, logout, isCHOAdmin, isCHOMonitor } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const { data } = await alertAPI.getUnreadCount();
        setUnreadCount(data.count);
      } catch {
        // silently fail
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 60000);
    return () => clearInterval(interval);
  }, []);

  const allNav = [
    ...(isCHOMonitor ? navigation.filter((item) => item.href !== "/scanner") : navigation),
    ...(isCHOAdmin || isCHOMonitor ? oversightNavigation : []),
    ...(isCHOAdmin ? adminNavigation : []),
  ];

  const initials = `${user?.firstName?.[0] || ""}${user?.lastName?.[0] || ""}`;

  return (
    <aside
      className={cn(
        "flex flex-col h-screen sticky top-0 transition-all duration-300 ease-in-out shrink-0",
        collapsed ? "w-[68px]" : "w-[252px]"
      )}
      style={{ background: 'hsl(222 47% 11%)' }}
    >
      {/* Logo */}
      <div className={cn(
        "flex items-center h-16 border-b shrink-0",
        collapsed ? "justify-center px-0" : "gap-3 px-5"
      )} style={{ borderColor: 'hsl(222 30% 18%)' }}>
        <div className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0" style={{ background: 'hsl(166 56% 38%)' }}>
          <Shield className="w-[18px] h-[18px] text-white" />
        </div>
        {!collapsed && (
          <div className="flex flex-col min-w-0">
            <span className="text-[15px] font-bold text-white tracking-tight">MedVault</span>
            <span className="text-[10px] font-medium leading-tight" style={{ color: 'hsl(220 15% 50%)' }}>
              Inventory System
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <div className={cn("space-y-0.5", collapsed ? "px-2" : "px-3")}>
          {!collapsed && (
            <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: 'hsl(220 15% 40%)' }}>
              Menu
            </p>
          )}
          {allNav.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg text-[13px] font-medium transition-all duration-150 relative group",
                  collapsed ? "justify-center p-2.5" : "px-3 py-2.5",
                  isActive
                    ? "text-white"
                    : "hover:text-white"
                )}
                style={{
                  color: isActive ? 'white' : 'hsl(220 15% 58%)',
                  background: isActive ? 'hsl(222 30% 18%)' : 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'hsl(222 30% 16%)';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'transparent';
                }}
              >
                {/* Active indicator bar */}
                {isActive && (
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                    style={{ background: 'hsl(166 56% 45%)' }}
                  />
                )}
                <item.icon className={cn("w-[18px] h-[18px] shrink-0", isActive && "text-white")} style={isActive ? { color: 'hsl(166 56% 55%)' } : {}} />
                {!collapsed && <span>{item.name}</span>}
                {item.name === "Alerts" && unreadCount > 0 && (
                  <span
                    className={cn(
                      "flex items-center justify-center rounded-full text-white text-[10px] font-bold",
                      collapsed
                        ? "absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1"
                        : "ml-auto min-w-[20px] h-5 px-1.5"
                    )}
                    style={{ background: 'hsl(0 68% 52%)' }}
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* User section */}
      <div className="p-3 border-t" style={{ borderColor: 'hsl(222 30% 18%)' }}>
        <div className={cn(
          "flex items-center mb-2 rounded-lg p-2 transition-colors",
          collapsed ? "justify-center" : "gap-3"
        )} style={{ background: 'hsl(222 30% 15%)' }}>
          <div
            className="flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold shrink-0"
            style={{ background: 'hsl(166 56% 38%)', color: 'white' }}
          >
            {initials}
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-[13px] font-semibold text-white truncate">
                {user?.firstName} {user?.lastName}
              </span>
              <span className="text-[10px] truncate" style={{ color: 'hsl(220 15% 50%)' }}>
                {user?.role === "cho_admin"
                  ? "CHO Administrator"
                  : user?.role === "cho_monitor"
                    ? "CHO Monitor"
                    : "Barangay Staff"}
              </span>
            </div>
          )}
        </div>
        <button
          onClick={logout}
          className={cn(
            "flex items-center w-full rounded-lg text-[13px] font-medium transition-all duration-150",
            collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2"
          )}
          style={{ color: 'hsl(220 15% 50%)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'hsl(0 68% 62%)';
            e.currentTarget.style.background = 'hsl(0 40% 15%)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'hsl(220 15% 50%)';
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <LogOut className="w-[18px] h-[18px] shrink-0" />
          {!collapsed && "Sign Out"}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center h-10 border-t transition-colors"
        style={{ borderColor: 'hsl(222 30% 18%)', color: 'hsl(220 15% 45%)' }}
        onMouseEnter={(e) => { e.currentTarget.style.color = 'white'; e.currentTarget.style.background = 'hsl(222 30% 16%)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'hsl(220 15% 45%)'; e.currentTarget.style.background = 'transparent'; }}
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </aside>
  );
}
