import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { reportAPI, authAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  FileText, Download, FileDown,
} from "lucide-react";

export default function ReportsPage() {
  const { isCHOAdmin, isCHOMonitor } = useAuth();
  const [pdfLoading, setPdfLoading] = useState(false);
  const [healthCenters, setHealthCenters] = useState([]);
  const [selectedCenter, setSelectedCenter] = useState("all");

  useEffect(() => {
    if (isCHOAdmin || isCHOMonitor) {
      authAPI.getHealthCenters().then(({ data }) => {
        setHealthCenters(data.healthCenters);
      }).catch(() => {});
    }
  }, [isCHOAdmin, isCHOMonitor]);

  const handleDownloadPDF = async () => {
    setPdfLoading(true);
    try {
      const params = {};
      if (selectedCenter && selectedCenter !== "all") params.healthCenter = selectedCenter;
      const { data } = await reportAPI.generatePDF(params);
      const url = window.URL.createObjectURL(new Blob([data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `inventory-report-${new Date().toISOString().split("T")[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      // globally handled
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-bold text-foreground tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Generate printable CHO compliance inventory reports
        </p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg" style={{ background: "hsl(166 40% 93%)" }}>
              <FileText className="w-[18px] h-[18px]" style={{ color: "hsl(166 56% 38%)" }} />
            </div>
            <div>
              <CardTitle className="text-[15px] font-semibold inline-flex items-center gap-2">
                <FileDown className="w-4 h-4" /> Inventory PDF Report
              </CardTitle>
              <CardDescription className="text-[12px] mt-0.5">
                Clean non-gradient medical format for compliance submissions
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          {(isCHOAdmin || isCHOMonitor) && healthCenters.length > 0 && (
            <div className="space-y-1.5 max-w-xs">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Health Center</Label>
              <Select value={selectedCenter} onValueChange={setSelectedCenter}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="All Health Centers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Health Centers</SelectItem>
                  {healthCenters.map((hc) => (
                    <SelectItem key={hc._id} value={hc._id}>{hc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button onClick={handleDownloadPDF} disabled={pdfLoading} className="gap-2">
            <Download className="w-4 h-4" />
            {pdfLoading ? "Generating..." : "Download Inventory PDF"}
          </Button>

          <p className="text-[11px] text-muted-foreground leading-relaxed max-w-lg">
            Includes medicine list, current quantities, category/program breakdown, low-stock and expiry summary, and preparation metadata.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
