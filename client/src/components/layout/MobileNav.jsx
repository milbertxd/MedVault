import { NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { alertAPI } from "@/lib/api";
import {
  LayoutDashboard,
  Package,
  ScanLine,
  Bell,
  ClipboardList,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navBase = [
  { name: "Home", href: "/dashboard", icon: LayoutDashboard },
  { name: "Stock", href: "/inventory", icon: Package },
  { name: "Scan", href: "/scanner", icon: ScanLine },
  { name: "Alerts", href: "/alerts", icon: Bell },
];

export default function MobileNav() {
  const { isCHOAdmin, isCHOMonitor } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMobileViewport, setIsMobileViewport] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 767px)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return () => {};
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobileViewport(media.matches);
    update();

    if (media.addEventListener) {
      media.addEventListener("change", update);
      return () => media.removeEventListener("change", update);
    }

    media.addListener(update);
    return () => media.removeListener(update);
  }, []);

  useEffect(() => {
    if (!isMobileViewport) return () => {};

    const fetchUnread = async () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      try {
        const { data } = await alertAPI.getUnreadCount();
        setUnreadCount(data.count || 0);
      } catch {
        // Silent failure to keep nav stable.
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 120000);
    return () => clearInterval(interval);
  }, [isMobileViewport]);

  const baseNav = isCHOMonitor
    ? navBase.filter((item) => item.href !== "/scanner")
    : navBase;

  const extras = [];
  if (isCHOAdmin || isCHOMonitor) {
    extras.push({ name: "Logs", href: "/logs", icon: ClipboardList });
  }
  if (isCHOAdmin) {
    extras.push({ name: "Users", href: "/users", icon: Users });
  }

  const navItems = [...baseNav, ...extras].slice(0, 5);

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-slate-200/80 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <ul className="grid min-h-16 px-1" style={{ gridTemplateColumns: `repeat(${navItems.length || 1}, minmax(0, 1fr))` }}>
        {navItems.map((item) => (
          <li key={item.href} className="relative">
            <NavLink
              to={item.href}
              className={({ isActive }) => cn(
                "flex h-full flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-semibold",
                isActive ? "text-emerald-700" : "text-slate-500"
              )}
            >
              {({ isActive }) => (
                <>
                  <item.icon className={cn("h-4 w-4", isActive && "text-emerald-600")} />
                  <span className="leading-none">{item.name}</span>
                </>
              )}
            </NavLink>

            {item.href === "/alerts" && unreadCount > 0 && (
              <span className="absolute top-2 right-4 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
