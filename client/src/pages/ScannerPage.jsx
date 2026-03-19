import { useRef, useState } from "react";
import { medicineAPI } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScanLine, QrCode, ShieldAlert, CheckCircle2, Camera, CameraOff, RefreshCcw } from "lucide-react";
import useQrScanner from "@/hooks/useQrScanner";

export default function ScannerPage() {
  const [qrString, setQrString] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [scannerError, setScannerError] = useState("");
  const [cameraActive, setCameraActive] = useState(true);

  const videoRef = useRef(null);
  const isSecureContext = typeof window === "undefined" ? true : window.isSecureContext;

  const { stop: stopScanner } = useQrScanner({
    active: cameraActive,
    videoRef,
    onDetected: (value) => setQrString(value),
    onError: setScannerError,
    stopOnDetected: false,
    scanIntervalMs: 650,
  });

  const handleDispense = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const { data } = await medicineAPI.dispenseByQR({
        qrString: qrString.trim().toUpperCase(),
        quantity: Number(quantity),
        notes,
      });
      setSuccess(`Dispensed successfully: ${data.medicine.name}. Remaining: ${data.medicine.quantity} ${data.medicine.unit}`);
      setQrString("");
      setNotes("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to dispense using QR");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-5">
      <div>
        <h1 className="text-[22px] font-bold text-foreground tracking-tight">QR Scanner</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Mobile-first medicine dispensing with real-time stock sufficiency checks</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base inline-flex items-center gap-2"><ScanLine className="w-4 h-4" /> Camera Scanner</CardTitle>
            <CardDescription>Works with BarcodeDetector and fallback decoder for wider mobile support</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl overflow-hidden border border-border bg-black/90 relative">
              <video ref={videoRef} className="w-full h-[52vh] min-h-[260px] max-h-[420px] object-cover" muted playsInline />
              <div className="pointer-events-none absolute inset-0 border-[3px] border-white/20 rounded-xl" />
              <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-56 max-w-[85%] h-32 border-2 border-emerald-300/70 rounded-lg" />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" variant={cameraActive ? "outline" : "default"} className="gap-2" onClick={() => setCameraActive((v) => !v)}>
                {cameraActive ? <CameraOff className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
                {cameraActive ? "Stop Camera" : "Start Camera"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={() => {
                  stopScanner();
                  setScannerError("");
                  setCameraActive(false);
                  setTimeout(() => setCameraActive(true), 120);
                }}
              >
                <RefreshCcw className="w-4 h-4" /> Retry Camera
              </Button>
            </div>

            {scannerError && (
              <p className="mt-3 text-xs text-amber-600 inline-flex items-center gap-1.5"><ShieldAlert className="w-3.5 h-3.5" /> {scannerError}</p>
            )}
            {!isSecureContext && (
              <p className="mt-2 text-xs text-amber-600">Camera scanning requires HTTPS. Open this app from the secure deployed URL.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base inline-flex items-center gap-2"><QrCode className="w-4 h-4" /> Dispense Action</CardTitle>
            <CardDescription>Submitting updates inventory, alerts, dispensing history, and audit trail</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleDispense} className="space-y-3">
              {error && <div className="p-3 rounded-md bg-red-50 text-red-600 text-sm border border-red-100">{error}</div>}
              {success && <div className="p-3 rounded-md bg-emerald-50 text-emerald-700 text-sm border border-emerald-100 inline-flex items-start gap-1.5"><CheckCircle2 className="w-4 h-4 mt-0.5" /> <span>{success}</span></div>}

              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">QR String</Label>
                <Input value={qrString} onChange={(e) => setQrString(e.target.value.toUpperCase())} placeholder="Scan or type QR code" required className="h-10" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Dispense Quantity</Label>
                <Input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} required className="h-10" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Notes</Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional dispensing remarks" className="h-10" />
              </div>

              <Button type="submit" disabled={loading} className="w-full gap-2 h-10">
                <ScanLine className="w-4 h-4" /> {loading ? "Processing..." : "Dispense Medicine"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
