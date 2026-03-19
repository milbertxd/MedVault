import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { userAPI, authAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
  Search, Edit, UserCheck, UserX, ChevronLeft, ChevronRight, Building2, Users, ShieldCheck,
} from "lucide-react";

export default function UsersPage() {
  const { isCHOAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(1);
  const [healthCenters, setHealthCenters] = useState([]);

  // Edit dialog
  const [showEdit, setShowEdit] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [editData, setEditData] = useState({});
  const [editLoading, setEditLoading] = useState(false);

  // Health Center dialog
  const [showHC, setShowHC] = useState(false);
  const [hcData, setHcData] = useState({ name: "", address: "", barangay: "", city: "Muntinlupa City", contactNumber: "" });
  const [hcLoading, setHcLoading] = useState(false);
  const [hcError, setHcError] = useState("");

  useEffect(() => {
    authAPI.getHealthCenters().then(({ data }) => {
      setHealthCenters(data.healthCenters);
    }).catch(() => {});
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (roleFilter && roleFilter !== "all") params.role = roleFilter;
      const { data } = await userAPI.getAll(params);
      setUsers(data.users);
      setPagination(data.pagination);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    setPage(1);
  }, [search, roleFilter]);

  const handleEdit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    try {
      await userAPI.update(editUser._id, editData);
      setShowEdit(false);
      fetchUsers();
    } catch {
      // handled
    } finally {
      setEditLoading(false);
    }
  };

  const handleToggleStatus = async (userId) => {
    try {
      await userAPI.toggleStatus(userId);
      fetchUsers();
    } catch {
      // handled
    }
  };

  const handleCreateHC = async (e) => {
    e.preventDefault();
    setHcError("");
    setHcLoading(true);
    try {
      await userAPI.createHealthCenter(hcData);
      setShowHC(false);
      const { data } = await authAPI.getHealthCenters();
      setHealthCenters(data.healthCenters);
      setHcData({ name: "", address: "", barangay: "", city: "Muntinlupa City", contactNumber: "" });
    } catch (err) {
      setHcError(err.response?.data?.message || "Failed to create health center");
    } finally {
      setHcLoading(false);
    }
  };

  if (!isCHOAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-2">
        <ShieldCheck className="w-8 h-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Access restricted to CHO administrators</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-foreground tracking-tight">User Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage staff accounts and health center registrations
          </p>
        </div>
        <Button variant="outline" onClick={() => setShowHC(true)} className="gap-2">
          <Building2 className="w-4 h-4" /> Add Health Center
        </Button>
      </div>

      {/* Filters */}
      <Card className="!shadow-none border border-border/60">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[220px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-10"
                />
              </div>
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[170px] h-10">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="cho_admin">CHO Admin</SelectItem>
                <SelectItem value="cho_monitor">CHO Monitor</SelectItem>
                <SelectItem value="barangay_staff">Barangay Staff</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <svg className="animate-spin h-6 w-6 text-primary" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ background: 'hsl(220 15% 95%)' }}>
                <Users className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">No users found</p>
              <p className="text-xs text-muted-foreground mt-0.5">Try adjusting your search or filters</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Name</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Email</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Role</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Health Center</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Status</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Last Login</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u._id} className="group hover:bg-slate-50/80">
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div
                          className="flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-bold shrink-0"
                          style={{ background: 'hsl(166 40% 93%)', color: 'hsl(166 56% 32%)' }}
                        >
                          {u.firstName?.[0]}{u.lastName?.[0]}
                        </div>
                        <span className="text-[13px] font-semibold text-foreground">
                          {u.firstName} {u.lastName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-[12px] text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant={u.role === "cho_admin" ? "default" : "secondary"}>
                        {u.role === "cho_admin" ? "CHO Admin" : u.role === "cho_monitor" ? "CHO Monitor" : "Staff"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[12px] text-muted-foreground">
                      {u.healthCenter?.name || "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: u.isActive ? 'hsl(166 56% 42%)' : 'hsl(0 68% 52%)' }}
                        />
                        <span className="text-[12px]" style={{ color: u.isActive ? 'hsl(166 56% 32%)' : 'hsl(0 68% 45%)' }}>
                          {u.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-[12px] text-muted-foreground tabular-nums">
                      {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Never"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg"
                          onClick={() => {
                            setEditUser(u);
                            setEditData({
                              firstName: u.firstName,
                              lastName: u.lastName,
                              email: u.email,
                              role: u.role,
                              healthCenter: u.healthCenter?._id || "",
                            });
                            setShowEdit(true);
                          }}
                        >
                          <Edit className="w-3.5 h-3.5 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg"
                          onClick={() => handleToggleStatus(u._id)}
                        >
                          {u.isActive ? (
                            <UserX className="w-3.5 h-3.5 text-red-400" />
                          ) : (
                            <UserCheck className="w-3.5 h-3.5" style={{ color: 'hsl(166 56% 38%)' }} />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-[12px] text-muted-foreground">
            Page <span className="font-medium text-foreground">{pagination.current}</span> of <span className="font-medium text-foreground">{pagination.pages}</span>
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

      {/* Edit User Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold tracking-tight">Edit User</DialogTitle>
            <DialogDescription className="text-[13px]">
              Update user information and role assignment
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">First Name</Label>
                <Input className="h-10" value={editData.firstName || ""} onChange={(e) => setEditData((p) => ({ ...p, firstName: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Last Name</Label>
                <Input className="h-10" value={editData.lastName || ""} onChange={(e) => setEditData((p) => ({ ...p, lastName: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Email</Label>
              <Input className="h-10" value={editData.email || ""} onChange={(e) => setEditData((p) => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Role</Label>
              <Select value={editData.role} onValueChange={(v) => setEditData((p) => ({ ...p, role: v }))}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="barangay_staff">Barangay Staff</SelectItem>
                  <SelectItem value="cho_monitor">CHO Monitor</SelectItem>
                  <SelectItem value="cho_admin">CHO Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Health Center</Label>
              <Select value={editData.healthCenter} onValueChange={(v) => setEditData((p) => ({ ...p, healthCenter: v }))}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {healthCenters.map((hc) => (
                    <SelectItem key={hc._id} value={hc._id}>{hc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setShowEdit(false)}>Cancel</Button>
              <Button type="submit" disabled={editLoading}>
                {editLoading ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Health Center Dialog */}
      <Dialog open={showHC} onOpenChange={setShowHC}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold tracking-tight">Add Health Center</DialogTitle>
            <DialogDescription className="text-[13px]">
              Register a new health center in the system
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateHC} className="space-y-4 pt-2">
            {hcError && (
              <div className="p-3 rounded-lg bg-red-50 text-red-600 text-[13px] border border-red-100">{hcError}</div>
            )}
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Name *</Label>
              <Input className="h-10" value={hcData.name} onChange={(e) => setHcData((p) => ({ ...p, name: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Address *</Label>
              <Input className="h-10" value={hcData.address} onChange={(e) => setHcData((p) => ({ ...p, address: e.target.value }))} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Barangay *</Label>
                <Input className="h-10" value={hcData.barangay} onChange={(e) => setHcData((p) => ({ ...p, barangay: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">City *</Label>
                <Input className="h-10" value={hcData.city} onChange={(e) => setHcData((p) => ({ ...p, city: e.target.value }))} required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Contact Number</Label>
              <Input className="h-10" value={hcData.contactNumber} onChange={(e) => setHcData((p) => ({ ...p, contactNumber: e.target.value }))} />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setShowHC(false)}>Cancel</Button>
              <Button type="submit" disabled={hcLoading}>
                {hcLoading ? "Creating..." : "Create Health Center"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
