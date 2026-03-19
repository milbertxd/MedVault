import { useState, useEffect, useCallback } from "react";
import { alertAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Bell, Check, CheckCheck, ChevronLeft, ChevronRight, Inbox } from "lucide-react";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [pagination, setPagination] = useState({});
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState("");
  const [readFilter, setReadFilter] = useState("");

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (typeFilter && typeFilter !== "all") params.type = typeFilter;
      if (readFilter && readFilter !== "all") params.isRead = readFilter;
      const { data } = await alertAPI.getAll(params);
      setAlerts(data.alerts);
      setPagination(data.pagination);
      setUnreadCount(data.unreadCount);
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter, readFilter]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  useEffect(() => {
    setPage(1);
  }, [typeFilter, readFilter]);

  const handleMarkAsRead = async (id) => {
    try {
      await alertAPI.markAsRead(id);
      fetchAlerts();
    } catch {
      // handled by interceptor
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await alertAPI.markAllAsRead();
      fetchAlerts();
    } catch {
      // handled by interceptor
    }
  };

  const getAlertStyles = (type) => {
    switch (type) {
      case "OUT_OF_STOCK": case "EXPIRED":
        return { dot: 'hsl(0 68% 52%)', variant: 'destructive', iconBg: 'hsl(0 68% 96%)' };
      case "LOW_STOCK":
        return { dot: 'hsl(38 80% 50%)', variant: 'warning', iconBg: 'hsl(38 80% 96%)' };
      case "EXPIRING_SOON":
        return { dot: 'hsl(24 75% 48%)', variant: 'warning', iconBg: 'hsl(24 75% 96%)' };
      default:
        return { dot: 'hsl(220 10% 60%)', variant: 'secondary', iconBg: 'hsl(220 10% 96%)' };
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-foreground tracking-tight">Alerts</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {unreadCount > 0
              ? <><span className="font-semibold text-foreground">{unreadCount}</span> unread alert{unreadCount > 1 ? "s" : ""} needing attention</>
              : "All caught up — no pending alerts"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={handleMarkAllAsRead} className="gap-2">
            <CheckCheck className="w-4 h-4" /> Mark All Read
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="!shadow-none border border-border/60">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[170px] h-10">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="LOW_STOCK">Low Stock</SelectItem>
                <SelectItem value="OUT_OF_STOCK">Out of Stock</SelectItem>
                <SelectItem value="EXPIRING_SOON">Expiring Soon</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
              </SelectContent>
            </Select>
            <Select value={readFilter} onValueChange={setReadFilter}>
              <SelectTrigger className="w-[150px] h-10">
                <SelectValue placeholder="All Alerts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Alerts</SelectItem>
                <SelectItem value="false">Unread Only</SelectItem>
                <SelectItem value="true">Read</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Alert List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <svg className="animate-spin h-6 w-6 text-primary" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            </div>
          ) : alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ background: 'hsl(166 40% 93%)' }}>
                <Inbox className="w-5 h-5" style={{ color: 'hsl(166 56% 38%)' }} />
              </div>
              <p className="text-sm font-medium text-foreground">No alerts match your filters</p>
              <p className="text-xs text-muted-foreground mt-0.5">Try adjusting the type or read filters above</p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {alerts.map((alert) => {
                const styles = getAlertStyles(alert.type);
                return (
                  <div
                    key={alert._id}
                    className={`flex items-start gap-4 p-4 transition-colors hover:bg-slate-50/60 ${
                      !alert.isRead ? "bg-primary/[0.02]" : ""
                    }`}
                  >
                    <div
                      className="p-2 rounded-lg shrink-0 mt-0.5"
                      style={{ background: styles.iconBg }}
                    >
                      <Bell className="w-4 h-4" style={{ color: styles.dot }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={styles.variant}>
                          {alert.type.replace(/_/g, " ")}
                        </Badge>
                        {!alert.isRead && (
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'hsl(166 56% 45%)' }} />
                        )}
                      </div>
                      <p className="text-[13px] text-foreground leading-snug">{alert.message}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                        <span>{new Date(alert.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                        {alert.healthCenter && (
                          <>
                            <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/40" />
                            <span>{alert.healthCenter.name}</span>
                          </>
                        )}
                        {alert.isRead && alert.readBy && (
                          <>
                            <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/40" />
                            <span>Acknowledged by {alert.readBy.firstName}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {!alert.isRead && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0 text-xs gap-1.5 h-8 rounded-lg"
                        onClick={() => handleMarkAsRead(alert._id)}
                      >
                        <Check className="w-3.5 h-3.5" /> Acknowledge
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-[12px] text-muted-foreground">
            Page <span className="font-medium text-foreground">{pagination.current}</span> of <span className="font-medium text-foreground">{pagination.pages}</span>
            {" "}({pagination.total} total)
          </p>
          <div className="flex gap-1.5">
            <Button variant="outline" size="sm" disabled={pagination.current <= 1} onClick={() => setPage((p) => p - 1)} className="h-8 px-3">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={pagination.current >= pagination.pages} onClick={() => setPage((p) => p + 1)} className="h-8 px-3">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
