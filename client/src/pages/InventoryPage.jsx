import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { medicineAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Plus, Search, Edit, Trash2, PackagePlus, PackageMinus, ChevronLeft, ChevronRight, Package, QrCode, ScanLine, ShieldAlert,
} from "lucide-react";

const CATEGORIES = [
  "National TB",
  "Immunization",
  "Maternal/Child Health",
  "Rabies",
  "Dental",
  "Family Planning",
  "Nutrition",
  "Non-Communicable Diseases",
];
const DOSAGE_FORMS = [
  "Tablet", "Capsule", "Syrup", "Injection", "Cream", "Ointment", "Drops", "Inhaler", "Powder", "Other",
];
const UNITS = ["pcs", "bottles", "boxes", "vials", "tubes", "sachets", "rolls", "packs"];

const emptyForm = {
  name: "", genericName: "", brandName: "", category: "", dosageForm: "",
  dosageStrength: "", unit: "pcs", quantity: 0, minimumStock: 10,
  expiryDate: "", batchNumber: "", qrCode: "", supplier: "", location: "", notes: "",
};

export default function InventoryPage() {
  const { user, isCHOMonitor } = useAuth();
  const canEditStock = !isCHOMonitor;

  const [medicines, setMedicines] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [page, setPage] = useState(1);

  const [showForm, setShowForm] = useState(false);
  const [showStock, setShowStock] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showQRDispense, setShowQRDispense] = useState(false);
  const [editingMed, setEditingMed] = useState(null);
  const [selectedMed, setSelectedMed] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [stockData, setStockData] = useState({ quantity: 1, type: "add", reason: "" });
  const [qrData, setQrData] = useState({ qrString: "", quantity: 1, notes: "" });
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [qrSuccess, setQrSuccess] = useState("");
  const [scannerError, setScannerError] = useState("");

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);

  const fetchMedicines = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15, sortBy, sortOrder };
      if (search) params.search = search;
      if (categoryFilter !== "all") params.category = categoryFilter;
      if (statusFilter !== "all") params.status = statusFilter;
      const { data } = await medicineAPI.getAll(params);
      setMedicines(data.medicines);
      setPagination(data.pagination);
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false);
    }
  }, [page, search, categoryFilter, statusFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchMedicines();
  }, [fetchMedicines]);

  useEffect(() => {
    setPage(1);
  }, [search, categoryFilter, statusFilter]);

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
    if (!showQRDispense) {
      stopScanner();
      return;
    }

    const startScanner = async () => {
      setScannerError("");

      if (!window.BarcodeDetector) {
        setScannerError("Camera scanner is not supported on this browser. You can still enter QR text manually.");
        return;
      }

      try {
        const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
          },
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
              const detected = codes[0].rawValue.trim().toUpperCase();
              setQrData((prev) => ({ ...prev, qrString: detected }));
              stopScanner();
            }
          } catch {
            // ignore intermittent detector frame errors
          }
        }, 700);
      } catch {
        setScannerError("Unable to access camera. Please check camera permissions.");
      }
    };

    startScanner();

    return () => stopScanner();
  }, [showQRDispense, stopScanner]);

  const openCreateForm = () => {
    setEditingMed(null);
    setFormData(emptyForm);
    setFormError("");
    setShowForm(true);
  };

  const openEditForm = (med) => {
    setEditingMed(med);
    setFormData({
      name: med.name,
      genericName: med.genericName || "",
      brandName: med.brandName || "",
      category: med.category,
      dosageForm: med.dosageForm,
      dosageStrength: med.dosageStrength,
      unit: med.unit,
      quantity: med.quantity,
      minimumStock: med.minimumStock,
      expiryDate: med.expiryDate ? med.expiryDate.split("T")[0] : "",
      batchNumber: med.batchNumber || "",
      qrCode: med.qrCode || "",
      supplier: med.supplier || "",
      location: med.location || "",
      notes: med.notes || "",
    });
    setFormError("");
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormLoading(true);
    try {
      const payload = {
        ...formData,
        qrCode: formData.qrCode.trim().toUpperCase(),
        quantity: Number(formData.quantity),
        minimumStock: Number(formData.minimumStock),
      };
      if (editingMed) {
        await medicineAPI.update(editingMed._id, payload);
      } else {
        await medicineAPI.create(payload);
      }
      setShowForm(false);
      fetchMedicines();
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to save medicine");
    } finally {
      setFormLoading(false);
    }
  };

  const handleStockAdjust = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormLoading(true);
    try {
      await medicineAPI.adjustStock(selectedMed._id, {
        quantity: Number(stockData.quantity),
        type: stockData.type,
        reason: stockData.reason,
      });
      setShowStock(false);
      fetchMedicines();
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to adjust stock");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    setFormLoading(true);
    try {
      await medicineAPI.remove(selectedMed._id);
      setShowDelete(false);
      fetchMedicines();
    } catch {
      // handled by interceptor
    } finally {
      setFormLoading(false);
    }
  };

  const handleQRDispense = async (e) => {
    e.preventDefault();
    setFormError("");
    setQrSuccess("");
    setFormLoading(true);
    try {
      const { data } = await medicineAPI.dispenseByQR({
        qrString: qrData.qrString.trim().toUpperCase(),
        quantity: Number(qrData.quantity),
        notes: qrData.notes,
      });
      setQrSuccess(`Dispensed successfully. Remaining stock: ${data.medicine.quantity} ${data.medicine.unit}`);
      setQrData((prev) => ({ ...prev, qrString: "", notes: "" }));
      fetchMedicines();
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to process QR dispense");
    } finally {
      setFormLoading(false);
    }
  };

  const getStatusBadge = (med) => {
    const now = new Date();
    const expiry = new Date(med.expiryDate);
    const threeMonths = new Date();
    threeMonths.setMonth(threeMonths.getMonth() + 3);

    if (expiry < now) return <Badge variant="destructive">Expired</Badge>;
    if (med.quantity === 0) return <Badge variant="destructive">Out of Stock</Badge>;
    if (med.quantity <= med.minimumStock) return <Badge variant="warning">Low Stock</Badge>;
    if (expiry <= threeMonths) return <Badge variant="warning">Expiring Soon</Badge>;
    return <Badge variant="success">In Stock</Badge>;
  };

  const updateField = (field, value) => setFormData((p) => ({ ...p, [field]: value }));

  const getQrApiUrl = (value) => {
    const normalized = value?.trim().toUpperCase();
    if (!normalized) return "";
    return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&format=png&data=${encodeURIComponent(normalized)}`;
  };

  const autoGenerateQrValue = () => {
    const categoryToken = formData.category
      ? formData.category.replace(/[^A-Za-z0-9]/g, "").slice(0, 8).toUpperCase()
      : "MED";
    const batchToken = formData.batchNumber
      ? formData.batchNumber.replace(/\s+/g, "-").toUpperCase()
      : "BATCH";
    const nameToken = formData.name
      ? formData.name.replace(/[^A-Za-z0-9]/g, "").slice(0, 6).toUpperCase()
      : "ITEM";

    updateField("qrCode", `${categoryToken}|${nameToken}|${batchToken}`);
  };

  const downloadQrCode = () => {
    const qrUrl = getQrApiUrl(formData.qrCode);
    if (!qrUrl) return;

    const link = document.createElement("a");
    link.href = qrUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.download = `${(formData.batchNumber || "medicine-qr").replace(/\s+/g, "-").toLowerCase()}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const filteredSummary = useMemo(() => {
    const total = medicines.length;
    const lowStock = medicines.filter((m) => m.quantity > 0 && m.quantity <= m.minimumStock).length;
    const outStock = medicines.filter((m) => m.quantity === 0).length;
    return { total, lowStock, outStock };
  }, [medicines]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-foreground tracking-tight">Inventory</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Program-based medicine stock for {user?.healthCenter?.name || "health center"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canEditStock && (
            <Button variant="outline" className="gap-2" onClick={() => {
              setShowQRDispense(true);
              setQrData({ qrString: "", quantity: 1, notes: "" });
              setQrSuccess("");
              setFormError("");
            }}>
              <ScanLine className="w-4 h-4" /> QR Dispense
            </Button>
          )}
          {canEditStock && (
            <Button onClick={openCreateForm} className="gap-2">
              <Plus className="w-4 h-4" /> Add Medicine
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="!shadow-none border border-border/60"><CardContent className="p-4"><p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Visible Items</p><p className="text-xl font-semibold mt-1">{filteredSummary.total}</p></CardContent></Card>
        <Card className="!shadow-none border border-border/60"><CardContent className="p-4"><p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Low Stock</p><p className="text-xl font-semibold mt-1 text-amber-600">{filteredSummary.lowStock}</p></CardContent></Card>
        <Card className="!shadow-none border border-border/60"><CardContent className="p-4"><p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Out of Stock</p><p className="text-xl font-semibold mt-1 text-red-600">{filteredSummary.outStock}</p></CardContent></Card>
      </div>

      <Card className="!shadow-none border border-border/60">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[220px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, generic name, batch, or QR..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-10"
                />
              </div>
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[220px] h-10">
                <SelectValue placeholder="All Program Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Program Categories</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[170px] h-10">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="low_stock">Low Stock</SelectItem>
                <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="expiring_soon">Expiring Soon</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <svg className="animate-spin h-6 w-6 text-primary" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            </div>
          ) : medicines.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ background: "hsl(166 40% 93%)" }}>
                <Package className="w-5 h-5" style={{ color: "hsl(166 56% 38%)" }} />
              </div>
              <p className="text-sm font-medium text-foreground">No medicines found</p>
              <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters or add a new medicine</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Medicine</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Program</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Batch / QR</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground text-right">Current Qty</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Expiry</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Status</TableHead>
                  {canEditStock && <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {medicines.map((med) => (
                  <TableRow key={med._id} className="group hover:bg-slate-50/80">
                    <TableCell>
                      <div>
                        <p className="text-[13px] font-semibold text-foreground">{med.name}</p>
                        {med.genericName && <p className="text-[11px] text-muted-foreground">{med.genericName}</p>}
                      </div>
                    </TableCell>
                    <TableCell><span className="text-[12px] text-muted-foreground">{med.category}</span></TableCell>
                    <TableCell>
                      <div className="text-[12px] text-muted-foreground">
                        <p>Batch: {med.batchNumber || "N/A"}</p>
                        <p className="inline-flex items-center gap-1 mt-0.5"><QrCode className="w-3 h-3" /> {med.qrCode || "N/A"}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-[13px] font-semibold tabular-nums">
                        {med.quantity} <span className="text-muted-foreground font-normal text-[11px]">{med.unit}</span>
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-[12px] text-muted-foreground tabular-nums">
                        {new Date(med.expiryDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </TableCell>
                    <TableCell>{getStatusBadge(med)}</TableCell>
                    {canEditStock && (
                      <TableCell>
                        <div className="flex items-center justify-end gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg"
                            title="Add Stock"
                            onClick={() => {
                              setSelectedMed(med);
                              setStockData({ quantity: 1, type: "add", reason: "" });
                              setFormError("");
                              setShowStock(true);
                            }}
                          >
                            <PackagePlus className="w-4 h-4 text-emerald-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg"
                            title="Remove Stock"
                            onClick={() => {
                              setSelectedMed(med);
                              setStockData({ quantity: 1, type: "remove", reason: "" });
                              setFormError("");
                              setShowStock(true);
                            }}
                          >
                            <PackageMinus className="w-4 h-4 text-amber-500" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => openEditForm(med)}>
                            <Edit className="w-3.5 h-3.5 text-muted-foreground" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg"
                            onClick={() => {
                              setSelectedMed(med);
                              setShowDelete(true);
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {pagination.pages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-[12px] text-muted-foreground">
            Showing <span className="font-medium text-foreground">{((pagination.current - 1) * pagination.limit) + 1}</span> to <span className="font-medium text-foreground">{Math.min(pagination.current * pagination.limit, pagination.total)}</span> of <span className="font-medium text-foreground">{pagination.total}</span> results
          </p>
          <div className="flex gap-1.5">
            <Button variant="outline" size="sm" disabled={pagination.current <= 1} onClick={() => setPage((p) => p - 1)} className="h-8 px-3"><ChevronLeft className="w-4 h-4" /></Button>
            <div className="flex items-center px-3 h-8 text-xs font-medium text-muted-foreground">{pagination.current} / {pagination.pages}</div>
            <Button variant="outline" size="sm" disabled={pagination.current >= pagination.pages} onClick={() => setPage((p) => p + 1)} className="h-8 px-3"><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingMed ? "Edit Medicine" : "Add New Medicine"}</DialogTitle>
            <DialogDescription>{editingMed ? "Update medicine information" : "Enter medicine details to add to inventory"}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">{formError}</div>}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Medicine Name *</Label><Input value={formData.name} onChange={(e) => updateField("name", e.target.value)} required /></div>
              <div className="space-y-2"><Label>Generic Name</Label><Input value={formData.genericName} onChange={(e) => updateField("genericName", e.target.value)} /></div>
              <div className="space-y-2"><Label>Brand Name</Label><Input value={formData.brandName} onChange={(e) => updateField("brandName", e.target.value)} /></div>
              <div className="space-y-2">
                <Label>Program Category *</Label>
                <Select value={formData.category} onValueChange={(v) => updateField("category", v)}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Dosage Form *</Label>
                <Select value={formData.dosageForm} onValueChange={(v) => updateField("dosageForm", v)}>
                  <SelectTrigger><SelectValue placeholder="Select form" /></SelectTrigger>
                  <SelectContent>{DOSAGE_FORMS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Dosage Strength *</Label><Input value={formData.dosageStrength} onChange={(e) => updateField("dosageStrength", e.target.value)} placeholder="e.g., 500mg" required /></div>
              <div className="space-y-2">
                <Label>Unit *</Label>
                <Select value={formData.unit} onValueChange={(v) => updateField("unit", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Current Quantity *</Label><Input type="number" min="0" value={formData.quantity} onChange={(e) => updateField("quantity", e.target.value)} required /></div>
              <div className="space-y-2"><Label>Minimum Stock Level *</Label><Input type="number" min="0" value={formData.minimumStock} onChange={(e) => updateField("minimumStock", e.target.value)} required /></div>
              <div className="space-y-2"><Label>Expiry Date *</Label><Input type="date" value={formData.expiryDate} onChange={(e) => updateField("expiryDate", e.target.value)} required /></div>
              <div className="space-y-2"><Label>Batch Number *</Label><Input value={formData.batchNumber} onChange={(e) => updateField("batchNumber", e.target.value)} required /></div>
              <div className="space-y-2 col-span-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>QR Code *</Label>
                  <div className="flex items-center gap-1.5">
                    <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={autoGenerateQrValue}>
                      Generate QR Value
                    </Button>
                    <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={downloadQrCode} disabled={!formData.qrCode.trim()}>
                      Download QR PNG
                    </Button>
                  </div>
                </div>
                <Input value={formData.qrCode} onChange={(e) => updateField("qrCode", e.target.value.toUpperCase())} placeholder="e.g., MED|TB|BATCH-001" required />
                {formData.qrCode.trim() && (
                  <div className="rounded-lg border border-border bg-muted/40 p-3 flex items-center gap-3">
                    <img
                      src={getQrApiUrl(formData.qrCode)}
                      alt="Generated QR code preview"
                      className="w-20 h-20 rounded bg-white p-1 border border-border"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">QR Preview</p>
                      <p className="text-[12px] text-foreground break-all mt-1">{formData.qrCode.trim().toUpperCase()}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">This QR image is generated from QRServer API.</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-2"><Label>Supplier</Label><Input value={formData.supplier} onChange={(e) => updateField("supplier", e.target.value)} /></div>
            </div>
            <div className="space-y-2"><Label>Storage Location</Label><Input value={formData.location} onChange={(e) => updateField("location", e.target.value)} /></div>
            <div className="space-y-2"><Label>Notes</Label><Input value={formData.notes} onChange={(e) => updateField("notes", e.target.value)} placeholder="Additional notes (max 500 chars)" /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" disabled={formLoading}>{formLoading ? "Saving..." : editingMed ? "Update" : "Add Medicine"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showStock} onOpenChange={setShowStock}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{stockData.type === "add" ? "Add Stock" : "Remove Stock"}</DialogTitle>
            <DialogDescription>{selectedMed?.name} - Current: {selectedMed?.quantity} {selectedMed?.unit}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleStockAdjust} className="space-y-4">
            {formError && <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">{formError}</div>}
            <div className="space-y-2"><Label>Quantity</Label><Input type="number" min="1" value={stockData.quantity} onChange={(e) => setStockData((p) => ({ ...p, quantity: e.target.value }))} required /></div>
            <div className="space-y-2"><Label>Reason *</Label><Input value={stockData.reason} onChange={(e) => setStockData((p) => ({ ...p, reason: e.target.value }))} placeholder="e.g., Received new supply, emergency dispense" required /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowStock(false)}>Cancel</Button>
              <Button type="submit" disabled={formLoading}>{formLoading ? "Processing..." : stockData.type === "add" ? "Add Stock" : "Remove Stock"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showQRDispense} onOpenChange={setShowQRDispense}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ScanLine className="w-4 h-4" /> QR Dispensing Workflow</DialogTitle>
            <DialogDescription>Scan medicine QR using mobile camera. Stock is decremented only when quantity is sufficient.</DialogDescription>
          </DialogHeader>
          <Card className="!shadow-none border border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Live Camera</CardTitle>
              <CardDescription className="text-xs">Point camera to QR code to auto-fill scan field</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="rounded-lg overflow-hidden border border-border bg-black/90">
                <video ref={videoRef} className="w-full h-52 object-cover" muted playsInline />
              </div>
              {scannerError && (
                <p className="mt-2 text-xs text-amber-600 inline-flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" /> {scannerError}
                </p>
              )}
            </CardContent>
          </Card>

          <form onSubmit={handleQRDispense} className="space-y-3">
            {formError && <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">{formError}</div>}
            {qrSuccess && <div className="p-3 rounded-md bg-emerald-50 text-emerald-700 text-sm">{qrSuccess}</div>}
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">QR String</Label>
              <Input value={qrData.qrString} onChange={(e) => setQrData((p) => ({ ...p, qrString: e.target.value.toUpperCase() }))} placeholder="QR string" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Dispense Qty</Label>
                <Input type="number" min="1" value={qrData.quantity} onChange={(e) => setQrData((p) => ({ ...p, quantity: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Notes</Label>
                <Input value={qrData.notes} onChange={(e) => setQrData((p) => ({ ...p, notes: e.target.value }))} placeholder="Optional" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowQRDispense(false)}>Close</Button>
              <Button type="submit" disabled={formLoading} className="gap-2"><QrCode className="w-4 h-4" /> {formLoading ? "Processing..." : "Dispense"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Medicine</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove "{selectedMed?.name}" from inventory? The action is recorded in the permanent audit trail.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={formLoading}>{formLoading ? "Removing..." : "Remove"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
