import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { medicineAPI, alertAPI } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Package, AlertTriangle, XCircle, Clock, Activity, ArrowUpRight, Bell,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function StockBar({ current, minimum, max }) {
  const percentage = max > 0 ? Math.min((current / max) * 100, 100) : 0;
  const isLow = current <= minimum;
  const isEmpty = current === 0;
  const barColor = isEmpty ? 'hsl(0 68% 52%)' : isLow ? 'hsl(38 92% 50%)' : 'hsl(166 56% 42%)';
  return (
    <div className="flex items-center gap-3 flex-1">
      <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percentage}%`, background: barColor }}
        />
      </div>
      <span className="text-xs font-semibold tabular-nums w-8 text-right" style={{ color: barColor }}>
        {current}
      </span>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [lowStockMeds, setLowStockMeds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, alertsRes, lowStockRes] = await Promise.all([
          medicineAPI.getStats(),
          alertAPI.getAll({ limit: 5, isRead: "false" }),
          medicineAPI.getAll({ status: "low_stock", limit: 6 }),
        ]);
        setStats(statsRes.data.stats);
        setRecentAlerts(alertsRes.data.alerts);
        setLowStockMeds(lowStockRes.data.medicines);
      } catch {
        // handled by interceptor
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <svg className="animate-spin h-6 w-6 text-primary" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Medicines",
      value: stats?.totalMedicines || 0,
      subtitle: `${stats?.totalQuantity?.toLocaleString() || 0} total units in stock`,
      icon: Package,
      iconBg: "hsl(166 40% 93%)",
      iconColor: "hsl(166 56% 38%)",
    },
    {
      title: "Low Stock",
      value: stats?.lowStockCount || 0,
      subtitle: "Items below minimum level",
      icon: AlertTriangle,
      iconBg: "hsl(38 92% 93%)",
      iconColor: "hsl(38 80% 45%)",
    },
    {
      title: "Out of Stock",
      value: stats?.outOfStockCount || 0,
      subtitle: "Require immediate restock",
      icon: XCircle,
      iconBg: "hsl(0 68% 94%)",
      iconColor: "hsl(0 68% 52%)",
    },
    {
      title: "Expiring Soon",
      value: (stats?.expiringSoonCount || 0) + (stats?.expiredCount || 0),
      subtitle: `${stats?.expiredCount || 0} expired, ${stats?.expiringSoonCount || 0} within 3 months`,
      icon: Clock,
      iconBg: "hsl(24 80% 93%)",
      iconColor: "hsl(24 75% 48%)",
    },
  ];

  const getAlertColor = (type) => {
    switch (type) {
      case "OUT_OF_STOCK": case "EXPIRED": return { dot: 'hsl(0 68% 52%)', bg: 'hsl(0 68% 97%)', variant: 'destructive' };
      case "LOW_STOCK": case "EXPIRING_SOON": return { dot: 'hsl(38 80% 50%)', bg: 'hsl(38 80% 97%)', variant: 'warning' };
      default: return { dot: 'hsl(220 10% 60%)', bg: 'hsl(220 10% 97%)', variant: 'secondary' };
    }
  };

  return (
    <div className="space-y-8">
      {/* Header with greeting */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-foreground tracking-tight">
            {getGreeting()}, {user?.firstName}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Here's what's happening with your inventory today.
          </p>
        </div>
        <p className="text-xs text-muted-foreground hidden sm:block">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
        </p>
      </div>

      {/* Stat Cards - 4 column asymmetric */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((item) => (
          <Card key={item.title} className="group hover:shadow-card-hover">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div
                  className="flex items-center justify-center w-10 h-10 rounded-lg"
                  style={{ background: item.iconBg }}
                >
                  <item.icon className="w-[18px] h-[18px]" style={{ color: item.iconColor }} />
                </div>
                <span className="text-[28px] font-bold tracking-tight text-foreground leading-none">
                  {item.value}
                </span>
              </div>
              <p className="text-[13px] font-semibold text-foreground">{item.title}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{item.subtitle}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Two-column: Alerts (wider) + Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Recent Alerts */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-[15px] font-semibold">Recent Alerts</CardTitle>
                {recentAlerts.length > 0 && (
                  <span className="flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white" style={{ background: 'hsl(0 68% 52%)' }}>
                    {recentAlerts.length}
                  </span>
                )}
              </div>
              <button
                onClick={() => navigate("/alerts")}
                className="flex items-center gap-1 text-xs font-medium transition-colors"
                style={{ color: 'hsl(166 56% 38%)' }}
              >
                View all <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {recentAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3" style={{ background: 'hsl(166 40% 93%)' }}>
                  <Bell className="w-4 h-4" style={{ color: 'hsl(166 56% 38%)' }} />
                </div>
                <p className="text-sm font-medium text-foreground">All clear</p>
                <p className="text-xs text-muted-foreground mt-0.5">No pending alerts right now</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentAlerts.map((alert) => {
                  const colors = getAlertColor(alert.type);
                  return (
                    <div
                      key={alert._id}
                      className="flex items-start gap-3 p-3 rounded-lg transition-colors hover:bg-slate-50"
                    >
                      <div className="mt-1.5 w-2 h-2 rounded-full shrink-0" style={{ background: colors.dot }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <Badge variant={colors.variant}>
                            {alert.type.replace(/_/g, " ")}
                          </Badge>
                        </div>
                        <p className="text-[13px] text-foreground leading-snug">{alert.message}</p>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          {new Date(alert.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Items with progress bars */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[15px] font-semibold">Stock Health</CardTitle>
              <button
                onClick={() => navigate("/inventory")}
                className="flex items-center gap-1 text-xs font-medium transition-colors"
                style={{ color: 'hsl(166 56% 38%)' }}
              >
                View all <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {lowStockMeds.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3" style={{ background: 'hsl(166 40% 93%)' }}>
                  <Package className="w-4 h-4" style={{ color: 'hsl(166 56% 38%)' }} />
                </div>
                <p className="text-sm font-medium text-foreground">Well stocked</p>
                <p className="text-xs text-muted-foreground mt-0.5">All items above minimum levels</p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {lowStockMeds.map((med) => (
                  <div key={med._id} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-foreground truncate">{med.name}</p>
                        <p className="text-[10px] text-muted-foreground">{med.dosageStrength} {med.dosageForm}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                        min: {med.minimumStock}
                      </span>
                    </div>
                    <StockBar current={med.quantity} minimum={med.minimumStock} max={med.minimumStock * 3} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Category Overview */}
      {stats?.categoryStats?.length > 0 && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-[15px] font-semibold">Inventory by Category</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {stats.categoryStats.map((cat) => (
                <div
                  key={cat._id}
                  className="group p-3.5 rounded-lg text-center transition-all hover:shadow-card-hover cursor-default"
                  style={{ background: 'hsl(210 20% 98%)' }}
                >
                  <p className="text-lg font-bold text-foreground">{cat.count}</p>
                  <p className="text-[11px] font-medium text-muted-foreground mt-0.5 truncate">{cat._id}</p>
                  <p className="text-[10px] text-muted-foreground/70">
                    {cat.totalQuantity.toLocaleString()} units
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
