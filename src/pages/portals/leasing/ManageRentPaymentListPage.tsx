import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Loader2, Download, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  leasingService,
  type RentalPaymentDetail,
  type FinancialMonthlyFiguresUpdate,
} from "@/services/portals/leasing";

interface GroupedPayment extends RentalPaymentDetail {
  total_due: number;
  difference: number;
  records: RentalPaymentDetail[];
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const num = (v: unknown) => Number(v ?? 0);
const money = (v: unknown) => `$${num(v).toFixed(2)}`;

function computeTotalDue(item: RentalPaymentDetail): number {
  return (
    num(item.base_rent) +
    num(item.cam_charges) +
    num(item.adjustment) +
    num(item.other_charges) +
    num(item.cam_Reconciliation_Charges) +
    num(item.security_deposit_assignmentfee) +
    num(item.credit_available)
  );
}

export default function ManageRentPaymentListPage() {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [payments, setPayments] = useState<RentalPaymentDetail[]>([]);
  const [loading, setLoading] = useState(true);

  const [techFilter, setTechFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Paid" | "Pending">("All");
  const [duesLessThan, setDuesLessThan] = useState("");
  const [duesGreaterThan, setDuesGreaterThan] = useState("");

  const [editingTechId, setEditingTechId] = useState<string | null>(null);
  const [editRowForm, setEditRowForm] = useState<Partial<FinancialMonthlyFiguresUpdate>>({});
  const [savingRow, setSavingRow] = useState(false);

  const [drawerGroup, setDrawerGroup] = useState<GroupedPayment | null>(null);
  const [editModalGroup, setEditModalGroup] = useState<GroupedPayment | null>(null);
  const [editForm, setEditForm] = useState<Partial<FinancialMonthlyFiguresUpdate>>({});
  const [savingModal, setSavingModal] = useState(false);

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      const data = await leasingService.getRentalPaymentDetails(selectedYear, selectedMonth);
      setPayments(data);
    } catch (error) {
      console.error("Error fetching rent payments:", error);
      toast.error("Failed to load rent payment data");
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const groups = useMemo<GroupedPayment[]>(() => {
    const byTech = new Map<string, RentalPaymentDetail[]>();
    for (const p of payments) {
      const list = byTech.get(p.techId) ?? [];
      list.push(p);
      byTech.set(p.techId, list);
    }
    return Array.from(byTech.values()).map((records) => {
      const first = records[0];
      const total_due = computeTotalDue(first);
      const difference = num(first.total_accounting_figure) - total_due;
      return { ...first, total_due, difference, records };
    });
  }, [payments]);

  const filteredGroups = useMemo(() => {
    return groups.filter((g) => {
      if (techFilter && !g.techId.toUpperCase().includes(techFilter.toUpperCase())) return false;
      const status = g.paid ? "Paid" : "Pending";
      if (statusFilter !== "All" && status !== statusFilter) return false;
      if (duesLessThan !== "" && g.total_due > Number(duesLessThan)) return false;
      if (duesGreaterThan !== "" && g.total_due < Number(duesGreaterThan)) return false;
      return true;
    });
  }, [groups, techFilter, statusFilter, duesLessThan, duesGreaterThan]);

  const totals = useMemo(
    () => ({
      count: filteredGroups.length,
      sum: filteredGroups.reduce((acc, g) => acc + g.total_due, 0),
    }),
    [filteredGroups],
  );

  const startRowEdit = (g: GroupedPayment) => {
    setEditingTechId(g.techId);
    setEditRowForm({
      TechId: g.techId,
      year: String(selectedYear),
      month: selectedMonth,
      base_rent: num(g.base_rent),
      adjustment: num(g.adjustment),
      cam_charges: num(g.cam_charges),
      other_charges: num(g.other_charges),
      cam_Reconciliation_Charges: num(g.cam_Reconciliation_Charges),
      security_deposit_assignmentfee: num(g.security_deposit_assignmentfee),
      credit_available: num(g.credit_available),
      paid: g.paid ?? false,
    });
  };

  const saveRowEdit = async () => {
    if (!editingTechId) return;
    setSavingRow(true);
    try {
      await leasingService.updateFinancialMonthlyFiguresRowWise(editRowForm);
      toast.success("Record updated successfully.");
      setEditingTechId(null);
      fetchPayments();
    } catch (error) {
      toast.error(`Failed to save: ${(error as Error).message}`);
    } finally {
      setSavingRow(false);
    }
  };

  const openEditModal = (g: GroupedPayment) => {
    setEditModalGroup(g);
    setEditForm({
      TechId: g.techId,
      base_rent: num(g.base_rent),
      year: String(selectedYear),
      month: selectedMonth,
      adjustment: num(g.adjustment),
      cam_charges: num(g.cam_charges),
      other_charges: num(g.other_charges),
      cam_Reconciliation_Charges: num(g.cam_Reconciliation_Charges),
      security_deposit_assignmentfee: num(g.security_deposit_assignmentfee),
      credit_available: num(g.credit_available),
      total_accounting_figure: num(g.total_accounting_figure),
      accounting_remarks: g.accounting_remarks ?? "",
      paid: g.paid ?? false,
      remarks: g.remarks ?? "",
    });
  };

  const saveEditModal = async () => {
    if (!editModalGroup) return;
    setSavingModal(true);
    try {
      await leasingService.updateFinancialMonthlyFigures(editForm as FinancialMonthlyFiguresUpdate);
      toast.success("Record updated successfully.");
      setEditModalGroup(null);
      fetchPayments();
    } catch (error) {
      toast.error(`Failed to save: ${(error as Error).message}`);
    } finally {
      setSavingModal(false);
    }
  };

  return (
    <div className="w-full space-y-4 animate-fade-in pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Rent Payments</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {totals.count} stores &middot; <strong className="text-foreground">{money(totals.sum)}</strong> total dues
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.message("Excel export coming soon for this page.")}
          >
            <Download className="mr-1.5 h-4 w-4" /> Export Excel
          </Button>
          <Button size="sm" onClick={() => toast.message("Add missing store form coming soon.")}>
            <Plus className="mr-1.5 h-4 w-4" /> Add missing store
          </Button>
        </div>
      </div>

      <Card className="p-3 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Year</Label>
          <Input
            type="number"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="h-9 w-24"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Month</Label>
          <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
            <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Tech ID</Label>
          <Input value={techFilter} onChange={(e) => setTechFilter(e.target.value)} className="h-9 w-32" placeholder="Search..." />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
            <SelectTrigger className="h-9 w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All</SelectItem>
              <SelectItem value="Paid">Paid</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Dues &ge;</Label>
          <Input type="number" value={duesGreaterThan} onChange={(e) => setDuesGreaterThan(e.target.value)} className="h-9 w-28" />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Dues &le;</Label>
          <Input type="number" value={duesLessThan} onChange={(e) => setDuesLessThan(e.target.value)} className="h-9 w-28" />
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {["Tech ID", "Base Rent", "Adjustment", "CAM", "Other", "CAM Recon.", "Security Dep.", "Credit", "Status", "Total Due", "Accounting", "Diff.", "Action"].map((h) => (
                  <th key={h} className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                    <p className="mt-2 text-xs text-muted-foreground">Loading rent data...</p>
                  </td>
                </tr>
              ) : filteredGroups.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-sm text-muted-foreground">No records found.</td>
                </tr>
              ) : (
                filteredGroups.map((g) => {
                  const isEditing = editingTechId === g.techId;
                  return (
                    <tr key={g.techId} className="hover:bg-muted/30">
                      <td className="px-3 py-2 font-medium cursor-pointer" onClick={() => setDrawerGroup(g)}>{g.techId}</td>
                      {(["base_rent", "adjustment", "cam_charges", "other_charges", "cam_Reconciliation_Charges", "security_deposit_assignmentfee", "credit_available"] as const).map((field) => (
                        <td key={field} className="px-3 py-2">
                          {isEditing ? (
                            <Input
                              type="number"
                              className="h-8 w-24"
                              value={(editRowForm[field] as number | undefined) ?? ""}
                              onChange={(e) => setEditRowForm((f) => ({ ...f, [field]: Number(e.target.value) }))}
                            />
                          ) : (
                            money(g[field])
                          )}
                        </td>
                      ))}
                      <td className="px-3 py-2">
                        {isEditing ? (
                          <label className="flex items-center gap-1.5 text-xs">
                            <Checkbox
                              checked={editRowForm.paid ?? false}
                              onCheckedChange={(c) => setEditRowForm((f) => ({ ...f, paid: Boolean(c) }))}
                            />
                            Paid
                          </label>
                        ) : (
                          <Badge variant="outline" className={g.paid ? "border-emerald-300 text-emerald-700" : "border-amber-300 text-amber-700"}>
                            {g.paid ? "Paid" : "Pending"}
                          </Badge>
                        )}
                      </td>
                      <td className="px-3 py-2 font-medium">{money(g.total_due)}</td>
                      <td className="px-3 py-2 text-muted-foreground">{money(g.total_accounting_figure)}</td>
                      <td className={`px-3 py-2 font-medium ${g.difference.toFixed(2) !== "0.00" ? "text-destructive" : ""}`}>{money(g.difference)}</td>
                      <td className="px-3 py-2">
                        {isEditing ? (
                          <div className="flex gap-1.5">
                            <Button size="sm" onClick={saveRowEdit} disabled={savingRow}>
                              {savingRow ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingTechId(null)}>Cancel</Button>
                          </div>
                        ) : (
                          <div className="flex gap-1.5">
                            <Button size="sm" variant="outline" onClick={() => startRowEdit(g)}>Edit</Button>
                            <Button size="sm" variant="ghost" onClick={() => openEditModal(g)}>More</Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Drawer: individual payment records for a tech id */}
      <Sheet open={drawerGroup !== null} onOpenChange={(open) => !open && setDrawerGroup(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{drawerGroup?.techId}</SheetTitle>
            <SheetDescription>{drawerGroup?.records.length ?? 0} payment record(s)</SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            {drawerGroup?.records.map((r, idx) => (
              <Card key={idx} className="p-3 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Store</span><span>{r.storeName ?? "-"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Market</span><span>{r.market ?? "-"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Base Rent</span><span>{money(r.base_rent)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Pay Date</span><span>{r.pay_date?.split("T")[0] || "-"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Payment Mode</span><span>{r.paymentMode ?? "-"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Bank</span><span>{r.bankName ?? "-"}</span></div>
                {r.remarks && <div className="pt-1 text-xs text-muted-foreground">Remarks: {r.remarks}</div>}
              </Card>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Edit modal: full figures edit */}
      <Dialog open={editModalGroup !== null} onOpenChange={(open) => !open && setEditModalGroup(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit financial figures &mdash; {editModalGroup?.techId}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            {([
              ["base_rent", "Base Rent"],
              ["adjustment", "Adjustment"],
              ["cam_charges", "CAM Charges"],
              ["other_charges", "Other Charges"],
              ["cam_Reconciliation_Charges", "CAM Reconciliation"],
              ["security_deposit_assignmentfee", "Security Deposit"],
              ["credit_available", "Credit Available"],
              ["total_accounting_figure", "Total Accounting Figure"],
            ] as const).map(([field, label]) => (
              <div key={field} className="space-y-1">
                <Label className="text-xs">{label}</Label>
                <Input
                  type="number"
                  value={(editForm[field] as number | undefined) ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, [field]: Number(e.target.value) }))}
                />
              </div>
            ))}
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Accounting Remarks</Label>
              <Input
                value={editForm.accounting_remarks ?? ""}
                onChange={(e) => setEditForm((f) => ({ ...f, accounting_remarks: e.target.value }))}
              />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Remarks</Label>
              <Input
                value={editForm.remarks ?? ""}
                onChange={(e) => setEditForm((f) => ({ ...f, remarks: e.target.value }))}
              />
            </div>
            <label className="col-span-2 flex items-center gap-2 text-sm">
              <Checkbox
                checked={editForm.paid ?? false}
                onCheckedChange={(c) => setEditForm((f) => ({ ...f, paid: Boolean(c) }))}
              />
              Marked as paid
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalGroup(null)}>Cancel</Button>
            <Button onClick={saveEditModal} disabled={savingModal}>
              {savingModal ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
