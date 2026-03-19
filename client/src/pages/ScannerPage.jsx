import { useEffect, useRef, useState, useCallback } from "react";
import { medicineAPI } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScanLine, QrCode, ShieldAlert, CheckCircle2 } from "lucide-react";

export default function ScannerPage() {
  const [qrString, setQrString] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [scannerError, setScannerError] = useState("");

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);

  const stopScanner = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    const startScanner = async () => {
      setScannerError("");
      if (!window.BarcodeDetector) {
        setScannerError("Camera QR scanning is not supported on this browser. Manual input remains available.");
        return;
      }

      try {
        const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        scanIntervalRef.current = setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0 && codes[0].rawValue) {
              setQrString(codes[0].rawValue.trim().toUpperCase());
            }
          } catch {
            // ignore frame-level scanner errors
          }
        }, 650);
      } catch {
        setScannerError("Unable to access camera. Please allow camera permissions.");
      }
    };

    startScanner();
    return () => stopScanner();
  }, [stopScanner]);

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
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-bold text-foreground tracking-tight">QR Scanner</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Mobile-first medicine dispensing with real-time stock sufficiency checks</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base inline-flex items-center gap-2"><ScanLine className="w-4 h-4" /> Camera Scanner</CardTitle>
            <CardDescription>Point the camera to medicine QR code to auto-fill the QR field</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl overflow-hidden border border-border bg-black/90">
              <video ref={videoRef} className="w-full h-[360px] object-cover" muted playsInline />
            </div>
            {scannerError && (
              <p className="mt-3 text-xs text-amber-600 inline-flex items-center gap-1.5"><ShieldAlert className="w-3.5 h-3.5" /> {scannerError}</p>
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
