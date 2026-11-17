import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  housingLeasingService,
  type HousingLeaseRentAgreement,
  type NewHousingLeaseAgreement,
} from "@/services/portals/housing-leasing";
import { housesService } from "@/services/portals/commission";

// Mirrors the local `House` interface in commission/HousesPage.tsx - the
// @/lib/api/client House type only declares the legacy flat stateName/
// districtName/marketName fields, not the nested state/district/market
// objects the backend actually returns alongside them.
interface House {
  id: number;
  address: string;
  number: string;
  phone: string;
  stateId: number;
  stateName?: string;
  districtId: number;
  districtName?: string;
  marketId: number;
  marketName?: string;
  state?: { id: number; name: string };
  district?: { id: number; name: string };
  market?: { id: number; name: string };
  createdAt?: string;
  updatedAt?: string;
}

const EMPTY_AGREEMENT: Omit<NewHousingLeaseAgreement, "unitId"> & { unitId: string } = {
  unitId: "",
  monthlyRent: "",
  camCharges: "",
  adjustments: "",
  otherCharges: "",
  comments: "",
  startDate: "",
  endDate: "",
};

const unitLabel = (h: House) => h.number || h.address || `#${h.id}`;

/**
 * Adapted from Leasing's ManageRentPaymentAgreementPage - that page groups by
 * Market -> Store (two separate registries/services, marketsService +
 * storesService). Here, units come from the shared House registry
 * (housesService.getAll()) and are grouped by House.market?.name (falling
 * back to the legacy flat marketName field).
 */
export default function ManageRentPaymentAgreementPage() {
  const [units, setUnits] = useState<House[]>([]);
  const [leases, setLeases] = useState<HousingLeaseRentAgreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<typeof EMPTY_AGREEMENT & { marketName: string }>({
    ...EMPTY_AGREEMENT,
    marketName: "",
  });
  const [saving, setSaving] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [unitsRes, leaseData] = await Promise.all([
        housesService.getAll(),
        housingLeasingService.getAllLeaseRentAgreements(),
      ]);
      setUnits(unitsRes.success ? unitsRes.data : []);
      setLeases(leaseData);
    } catch (error) {
      console.error("Error loading rent agreements:", error);
      toast.error("Failed to load rent agreement data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const markets = useMemo(
    () =>
      [...new Set(units.map((u) => (u.market?.name ?? u.marketName)?.trim()).filter(Boolean))] as string[],
    [units],
  );

  const unitsByMarket = useMemo(() => {
    const map = new Map<string, House[]>();
    for (const u of units) {
      const market = (u.market?.name ?? u.marketName)?.trim();
      if (!market) continue;
      const list = map.get(market) ?? [];
      list.push(u);
      map.set(market, list);
    }
    return map;
  }, [units]);

  const leasesByUnitId = useMemo(() => {
    const map = new Map<number, HousingLeaseRentAgreement[]>();
    for (const l of leases) {
      const list = map.get(l.unitId) ?? [];
      list.push(l);
      map.set(l.unitId, list);
    }
    return map;
  }, [leases]);

  const unitsForSelectedMarket = addForm.marketName
    ? (unitsByMarket.get(addForm.marketName) ?? [])
    : [];

  const handleAdd = async () => {
    if (!addForm.unitId || !addForm.startDate || !addForm.endDate) {
      toast.error("Unit, start date, and end date are required.");
      return;
    }
    setSaving(true);
    try {
      const { marketName: _marketName, unitId, ...rest } = addForm;
      await housingLeasingService.insertLeaseRentAgreement({
        ...rest,
        unitId: Number(unitId),
      });
      toast.success("Lease agreement has been successfully recorded.");
      setAddOpen(false);
      setAddForm({ ...EMPTY_AGREEMENT, marketName: "" });
      fetchAll();
    } catch (error) {
      toast.error(`Error occurred: ${(error as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (lease: HousingLeaseRentAgreement) => {
    const key = `${lease.unitId}-${lease.startDate}`;
    setDeletingKey(key);
    try {
      await housingLeasingService.deleteLeaseRentAgreement({
        UnitId: lease.unitId,
        StartDate: lease.startDate,
        EndDate: lease.endDate,
      });
      toast.success("Agreement deleted.");
      fetchAll();
    } catch (error) {
      toast.error(`Delete failed: ${(error as Error).message}`);
    } finally {
      setDeletingKey(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm">Loading rent agreements...</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 animate-fade-in pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Rent Payment Agreement
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Browse rent agreements by market and housing unit.
          </p>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" /> Add Agreement
        </Button>
      </div>

      <Accordion type="multiple" className="space-y-2">
        {markets.map((market) => {
          const marketUnits = unitsByMarket.get(market) ?? [];
          return (
            <AccordionItem key={market} value={market} className="rounded-lg border px-3">
              <AccordionTrigger className="text-sm font-semibold">{market}</AccordionTrigger>
              <AccordionContent>
                {marketUnits.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No units found.</p>
                ) : (
                  <Accordion type="multiple" className="space-y-2 pl-2">
                    {marketUnits.map((unit) => {
                      const unitId = unit.id;
                      const unitLeases = unitId ? (leasesByUnitId.get(unitId) ?? []) : [];
                      return (
                        <AccordionItem
                          key={unit.id}
                          value={String(unit.id)}
                          className="rounded-md border px-3"
                        >
                          <AccordionTrigger className="text-sm">
                            <strong>{unitId ?? "—"}</strong>&nbsp;{unitLabel(unit)}
                          </AccordionTrigger>
                          <AccordionContent className="space-y-2">
                            {unitLeases.length === 0 ? (
                              <p className="text-sm text-muted-foreground">
                                No lease records found.
                              </p>
                            ) : (
                              unitLeases.map((lease) => {
                                const key = `${lease.unitId}-${lease.startDate}`;
                                return (
                                  <Card
                                    key={key}
                                    className="flex items-center justify-between p-3 text-sm"
                                  >
                                    <div className="space-y-0.5">
                                      <div>
                                        <strong>Start:</strong> {lease.startDate}
                                      </div>
                                      <div>
                                        <strong>End:</strong> {lease.endDate ?? "—"}
                                      </div>
                                      <div>
                                        <strong>Rent:</strong> ${lease.monthlyRent ?? 0}
                                      </div>
                                      <div>
                                        <strong>CAM:</strong> ${lease.camCharges ?? 0}
                                      </div>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-destructive"
                                      onClick={() => handleDelete(lease)}
                                      disabled={deletingKey === key}
                                    >
                                      {deletingKey === key ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Trash2 className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </Card>
                                );
                              })
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Rent Agreement</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Market</Label>
              <Select
                value={addForm.marketName}
                onValueChange={(v) => setAddForm((f) => ({ ...f, marketName: v, unitId: "" }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select market" />
                </SelectTrigger>
                <SelectContent>
                  {markets.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Unit ID / Unit Name</Label>
              <Select
                value={addForm.unitId}
                onValueChange={(v) => setAddForm((f) => ({ ...f, unitId: v }))}
                disabled={!addForm.marketName}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {unitsForSelectedMarket
                    .filter((u) => u.id != null)
                    .map((u) => (
                      <SelectItem key={u.id} value={String(u.id)}>
                        {u.id} &mdash; {unitLabel(u)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Monthly Rent</Label>
              <Input
                type="number"
                value={addForm.monthlyRent}
                onChange={(e) => setAddForm((f) => ({ ...f, monthlyRent: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">CAM Charges</Label>
              <Input
                type="number"
                value={addForm.camCharges}
                onChange={(e) => setAddForm((f) => ({ ...f, camCharges: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Adjustments</Label>
              <Input
                type="number"
                value={addForm.adjustments}
                onChange={(e) => setAddForm((f) => ({ ...f, adjustments: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Other Charges</Label>
              <Input
                type="number"
                value={addForm.otherCharges}
                onChange={(e) => setAddForm((f) => ({ ...f, otherCharges: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Start Date</Label>
              <Input
                type="date"
                value={addForm.startDate}
                onChange={(e) => setAddForm((f) => ({ ...f, startDate: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">End Date</Label>
              <Input
                type="date"
                value={addForm.endDate}
                onChange={(e) => setAddForm((f) => ({ ...f, endDate: e.target.value }))}
              />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Comments</Label>
              <Textarea
                value={addForm.comments}
                onChange={(e) => setAddForm((f) => ({ ...f, comments: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
