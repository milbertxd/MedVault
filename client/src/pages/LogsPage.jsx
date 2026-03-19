import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { reportAPI, authAPI } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight, History, QrCode, TrendingUp, Download } from "lucide-react";

export default function LogsPage() {
  const { isCHOAdmin, isCHOMonitor } = useAuth();
  const [healthCenters, setHealthCenters] = useState([]);
  const [selectedCenter, setSelectedCenter] = useState("all");

  const [auditLogs, setAuditLogs] = useState([]);
  const [auditPagination, setAuditPagination] = useState({});
  const [auditPage, setAuditPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("all");

  const [records, setRecords] = useState([]);
  const [recordPagination, setRecordPagination] = useState({});
  const [recordPage, setRecordPage] = useState(1);

  const [forecast, setForecast] = useState([]);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [loadingForecast, setLoadingForecast] = useState(false);
  const [exportingLogs, setExportingLogs] = useState(false);

  useEffect(() => {
    if (isCHOAdmin || isCHOMonitor) {
      authAPI.getHealthCenters().then(({ data }) => {
        setHealthCenters(data.healthCenters);
      }).catch(() => {});
    }
  }, [isCHOAdmin, isCHOMonitor]);

  const fetchAuditLogs = useCallback(async () => {
    setLoadingAudit(true);
    try {
      const params = { page: auditPage, limit: 20 };
      if (actionFilter !== "all") params.action = actionFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (selectedCenter !== "all") params.healthCenter = selectedCenter;
      const { data } = await reportAPI.getAuditLogs(params);
      setAuditLogs(data.logs);
      setAuditPagination(data.pagination);
    } catch {
      // handled globally
    } finally {
      setLoadingAudit(false);
    }
  }, [auditPage, actionFilter, startDate, endDate, selectedCenter]);

  const fetchDispensingRecords = useCallback(async () => {
    setLoadingRecords(true);
    try {
      const params = { page: recordPage, limit: 20 };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (selectedCenter !== "all") params.healthCenter = selectedCenter;
      const { data } = await reportAPI.getDispensingHistory(params);
      setRecords(data.records);
      setRecordPagination(data.pagination);
    } catch {
      // handled globally
    } finally {
      setLoadingRecords(false);
    }
  }, [recordPage, startDate, endDate, selectedCenter]);

  const fetchForecast = useCallback(async () => {
    setLoadingForecast(true);
    try {
      const params = {};
      if (selectedCenter !== "all") params.healthCenter = selectedCenter;
      const { data } = await reportAPI.getForecast60Day(params);
      setForecast(data.forecasts || []);
    } catch {
      // handled globally
    } finally {
      setLoadingForecast(false);
    }
  }, [selectedCenter]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  useEffect(() => {
    fetchDispensingRecords();
  }, [fetchDispensingRecords]);

  useEffect(() => {
    fetchForecast();
  }, [fetchForecast]);

  useEffect(() => {
    setAuditPage(1);
    setRecordPage(1);
  }, [actionFilter, selectedCenter, startDate, endDate]);

  const actionBadge = (action) => {
    if (action === "DISPENSED_VIA_QR") return "default";
    if (action.includes("STOCK_ADDED") || action.includes("CREATED")) return "success";
    if (action.includes("REMOVED") || action.includes("DELETED") || action.includes("BLOCKED")) return "destructive";
    if (action.includes("LOGIN") || action.includes("LOGOUT")) return "secondary";
    return "secondary";
  };

  const handleExportLogsPDF = async () => {
    setExportingLogs(true);
    try {
      const params = {};
      if (selectedCenter !== "all") params.healthCenter = selectedCenter;
      if (actionFilter !== "all") params.action = actionFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const { data } = await reportAPI.generateLogsPDF(params);
      const url = window.URL.createObjectURL(new Blob([data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `logs-report-${new Date().toISOString().split("T")[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      // handled globally
    } finally {
      setExportingLogs(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-bold text-foreground tracking-tight">Logs</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Permanent audit trail, QR dispensing records, and 60-day usage forecast</p>
      </div>

      <Card className="!shadow-none border border-border/60">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            {(isCHOAdmin || isCHOMonitor) && (
              <Select value={selectedCenter} onValueChange={setSelectedCenter}>
                <SelectTrigger className="w-[220px] h-10">
                  <SelectValue placeholder="All Centers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Centers</SelectItem>
                  {healthCenters.map((hc) => (
                    <SelectItem key={hc._id} value={hc._id}>{hc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[190px] h-10">
                <SelectValue placeholder="All Actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="DISPENSED_VIA_QR">Dispensed via QR</SelectItem>
                <SelectItem value="DISPENSE_ATTEMPT_BLOCKED">Blocked Dispense</SelectItem>
                <SelectItem value="STOCK_ADDED">Stock Added</SelectItem>
                <SelectItem value="STOCK_REMOVED">Stock Removed</SelectItem>
                <SelectItem value="MEDICINE_CREATED">Medicine Created</SelectItem>
                <SelectItem value="MEDICINE_UPDATED">Medicine Updated</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">From</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-[150px] h-10" />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">To</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-[150px] h-10" />
            </div>
            <Button onClick={handleExportLogsPDF} variant="outline" className="h-10 gap-2 ml-auto" disabled={exportingLogs}>
              <Download className="w-4 h-4" /> {exportingLogs ? "Exporting..." : "Export Logs PDF"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="audit" className="space-y-4">
        <TabsList className="bg-muted/60 p-1 rounded-lg">
          <TabsTrigger value="audit" className="gap-2 text-[13px] rounded-md data-[state=active]:shadow-sm">
            <History className="w-3.5 h-3.5" /> Audit Trail
          </TabsTrigger>
          <TabsTrigger value="dispensing" className="gap-2 text-[13px] rounded-md data-[state=active]:shadow-sm">
            <QrCode className="w-3.5 h-3.5" /> Dispensing Records
          </TabsTrigger>
          <TabsTrigger value="forecast" className="gap-2 text-[13px] rounded-md data-[state=active]:shadow-sm">
            <TrendingUp className="w-3.5 h-3.5" /> 60-Day Forecast
          </TabsTrigger>
        </TabsList>

        <TabsContent value="audit" className="space-y-3">
          <Card>
            <CardContent className="p-0">
              {loadingAudit ? (
                <div className="flex items-center justify-center h-64">Loading...</div>
              ) : auditLogs.length === 0 ? (
                <div className="text-center py-16 text-sm text-muted-foreground">No audit activity found.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Date/Time</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Action</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Description</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">User</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Center</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.map((log) => (
                      <TableRow key={log._id} className="group hover:bg-slate-50/80">
                        <TableCell className="text-[12px] text-muted-foreground tabular-nums whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </TableCell>
                        <TableCell>
                          <Badge variant={actionBadge(log.action)}>{log.action.replace(/_/g, " ")}</Badge>
                        </TableCell>
                        <TableCell className="text-[12px] text-muted-foreground max-w-[360px] truncate">{log.description}</TableCell>
                        <TableCell className="text-[12px]">{log.user ? `${log.user.firstName} ${log.user.lastName}` : "System"}</TableCell>
                        <TableCell className="text-[12px] text-muted-foreground">{log.healthCenter?.name || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {auditPagination.pages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-[12px] text-muted-foreground">Page <span className="font-medium text-foreground">{auditPagination.current}</span> of <span className="font-medium text-foreground">{auditPagination.pages}</span></p>
              <div className="flex gap-1.5">
                <Button variant="outline" size="sm" className="h-8 px-3" disabled={auditPagination.current <= 1} onClick={() => setAuditPage((p) => p - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" className="h-8 px-3" disabled={auditPagination.current >= auditPagination.pages} onClick={() => setAuditPage((p) => p + 1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="dispensing" className="space-y-3">
          <Card>
            <CardContent className="p-0">
              {loadingRecords ? (
                <div className="flex items-center justify-center h-64">Loading...</div>
              ) : records.length === 0 ? (
                <div className="text-center py-16 text-sm text-muted-foreground">No dispensing records found.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Date/Time</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Medicine</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Program</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground text-right">Dispensed</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Staff</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Center</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((record) => (
                      <TableRow key={record._id} className="group hover:bg-slate-50/80">
                        <TableCell className="text-[12px] text-muted-foreground tabular-nums whitespace-nowrap">
                          {new Date(record.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </TableCell>
                        <TableCell className="text-[12px] font-medium">
                          {record.medicine?.name || "Unknown"}
                        </TableCell>
                        <TableCell className="text-[12px] text-muted-foreground">{record.medicine?.category || "-"}</TableCell>
                        <TableCell className="text-[12px] text-right tabular-nums">
                          {record.quantity} {record.medicine?.unit || "pcs"}
                        </TableCell>
                        <TableCell className="text-[12px]">{record.dispensedBy ? `${record.dispensedBy.firstName} ${record.dispensedBy.lastName}` : "-"}</TableCell>
                        <TableCell className="text-[12px] text-muted-foreground">{record.healthCenter?.name || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {recordPagination.pages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-[12px] text-muted-foreground">Page <span className="font-medium text-foreground">{recordPagination.current}</span> of <span className="font-medium text-foreground">{recordPagination.pages}</span></p>
              <div className="flex gap-1.5">
                <Button variant="outline" size="sm" className="h-8 px-3" disabled={recordPagination.current <= 1} onClick={() => setRecordPage((p) => p - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" className="h-8 px-3" disabled={recordPagination.current >= recordPagination.pages} onClick={() => setRecordPage((p) => p + 1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="forecast">
          <Card>
            <CardHeader>
              <CardTitle className="text-[15px]">Smart Forecasting</CardTitle>
              <CardDescription>Computed from the 60-day moving average of dispensing activity</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loadingForecast ? (
                <div className="flex items-center justify-center h-64">Loading...</div>
              ) : forecast.length === 0 ? (
                <div className="text-center py-16 text-sm text-muted-foreground">No forecast data available yet.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Medicine</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Program</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground text-right">Current Qty</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground text-right">Avg/Day (60d)</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground text-right">Projected Stockout (Days)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {forecast.map((item) => (
                      <TableRow key={item.medicineId} className="group hover:bg-slate-50/80">
                        <TableCell className="text-[12px] font-medium">{item.medicineName}</TableCell>
                        <TableCell className="text-[12px] text-muted-foreground">{item.category}</TableCell>
                        <TableCell className="text-[12px] text-right tabular-nums">{item.currentQuantity} {item.unit}</TableCell>
                        <TableCell className="text-[12px] text-right tabular-nums">{item.movingAverage60Day}</TableCell>
                        <TableCell className="text-[12px] text-right tabular-nums">
                          {item.projectedDaysUntilStockout == null ? "N/A" : item.projectedDaysUntilStockout}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
