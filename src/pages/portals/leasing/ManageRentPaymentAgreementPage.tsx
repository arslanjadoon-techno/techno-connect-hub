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
import { leasingService, type LeaseRentAgreement, type NewLeaseAgreement } from "@/services/portals/leasing";
import { marketsService } from "@/services/user-manager/markets.service";
import { storesService } from "@/services/user-manager/stores.service";
import type { Market, Store } from "@/lib/api/client";

const EMPTY_AGREEMENT: NewLeaseAgreement = {
  techId: "",
  monthlyRent: "",
  camCharges: "",
  adjustments: "",
  otherCharges: "",
  comments: "",
  startDate: "",
  endDate: "",
};

export default function ManageRentPaymentAgreementPage() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [leases, setLeases] = useState<LeaseRentAgreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<NewLeaseAgreement & { marketId: string }>({
    ...EMPTY_AGREEMENT,
    marketId: "",
  });
  const [saving, setSaving] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [marketsRes, storesRes, leaseData] = await Promise.all([
        marketsService.getAll({ size: 500 }),
        storesService.getAll({ size: 2000 }),
        leasingService.getAllLeaseRentAgreements(),
      ]);
      setMarkets(marketsRes.data ?? []);
      setStores(storesRes.data ?? []);
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

  const storesByMarket = useMemo(() => {
    const map = new Map<number, Store[]>();
    for (const s of stores) {
      if (!s.market?.id) continue;
      const list = map.get(s.market.id) ?? [];
      list.push(s);
      map.set(s.market.id, list);
    }
    return map;
  }, [stores]);

  const leasesByTechId = useMemo(() => {
    const map = new Map<string, LeaseRentAgreement[]>();
    for (const l of leases) {
      const list = map.get(l.techId) ?? [];
      list.push(l);
      map.set(l.techId, list);
    }
    return map;
  }, [leases]);

  const storesForSelectedMarket = addForm.marketId
    ? (storesByMarket.get(Number(addForm.marketId)) ?? [])
    : [];

  const handleAdd = async () => {
    if (!addForm.techId || !addForm.startDate || !addForm.endDate) {
      toast.error("Store, start date, and end date are required.");
      return;
    }
    setSaving(true);
    try {
      const { marketId: _marketId, ...payload } = addForm;
      await leasingService.insertLeaseRentAgreement(payload);
      toast.success("Lease agreement has been successfully recorded.");
      setAddOpen(false);
      setAddForm({ ...EMPTY_AGREEMENT, marketId: "" });
      fetchAll();
    } catch (error) {
      toast.error(`Error occurred: ${(error as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (lease: LeaseRentAgreement) => {
    const key = `${lease.techId}-${lease.startDate}`;
    setDeletingKey(key);
    try {
      await leasingService.deleteLeaseRentAgreement({
        TechID: lease.techId,
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
          <h1 className="font-display text-2xl font-semibold tracking-tight">Rent Payment Agreement</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Browse rent agreements by market and store.
          </p>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" /> Add Agreement
        </Button>
      </div>

      <Accordion type="multiple" className="space-y-2">
        {markets.map((market) => {
          const marketStores = storesByMarket.get(market.id) ?? [];
          return (
            <AccordionItem key={market.id} value={String(market.id)} className="rounded-lg border px-3">
              <AccordionTrigger className="text-sm font-semibold">{market.name}</AccordionTrigger>
              <AccordionContent>
                {marketStores.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No stores found.</p>
                ) : (
                  <Accordion type="multiple" className="space-y-2 pl-2">
                    {marketStores.map((store) => {
                      const techId = store.techId;
                      const storeLeases = techId ? (leasesByTechId.get(techId) ?? []) : [];
                      return (
                        <AccordionItem key={store.id} value={String(store.id)} className="rounded-md border px-3">
                          <AccordionTrigger className="text-sm">
                            <strong>{techId ?? "—"}</strong>&nbsp;{store.name}
                          </AccordionTrigger>
                          <AccordionContent className="space-y-2">
                            {storeLeases.length === 0 ? (
                              <p className="text-sm text-muted-foreground">No lease records found.</p>
                            ) : (
                              storeLeases.map((lease) => {
                                const key = `${lease.techId}-${lease.startDate}`;
                                return (
                                  <Card key={key} className="flex items-center justify-between p-3 text-sm">
                                    <div className="space-y-0.5">
                                      <div><strong>Start:</strong> {lease.startDate}</div>
                                      <div><strong>End:</strong> {lease.endDate ?? "—"}</div>
                                      <div><strong>Rent:</strong> ${lease.monthlyRent ?? 0}</div>
                                      <div><strong>CAM:</strong> ${lease.camCharges ?? 0}</div>
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
                value={addForm.marketId}
                onValueChange={(v) => setAddForm((f) => ({ ...f, marketId: v, techId: "" }))}
              >
                <SelectTrigger><SelectValue placeholder="Select market" /></SelectTrigger>
                <SelectContent>
                  {markets.map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Tech ID / Store Name</Label>
              <Select
                value={addForm.techId}
                onValueChange={(v) => setAddForm((f) => ({ ...f, techId: v }))}
                disabled={!addForm.marketId}
              >
                <SelectTrigger><SelectValue placeholder="Select store" /></SelectTrigger>
                <SelectContent>
                  {storesForSelectedMarket
                    .filter((s) => s.techId)
                    .map((s) => (
                      <SelectItem key={s.id} value={s.techId as string}>
                        {s.techId} &mdash; {s.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Monthly Rent</Label>
              <Input type="number" value={addForm.monthlyRent} onChange={(e) => setAddForm((f) => ({ ...f, monthlyRent: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">CAM Charges</Label>
              <Input type="number" value={addForm.camCharges} onChange={(e) => setAddForm((f) => ({ ...f, camCharges: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Adjustments</Label>
              <Input type="number" value={addForm.adjustments} onChange={(e) => setAddForm((f) => ({ ...f, adjustments: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Other Charges</Label>
              <Input type="number" value={addForm.otherCharges} onChange={(e) => setAddForm((f) => ({ ...f, otherCharges: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Start Date</Label>
              <Input type="date" value={addForm.startDate} onChange={(e) => setAddForm((f) => ({ ...f, startDate: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">End Date</Label>
              <Input type="date" value={addForm.endDate} onChange={(e) => setAddForm((f) => ({ ...f, endDate: e.target.value }))} />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Comments</Label>
              <Textarea value={addForm.comments} onChange={(e) => setAddForm((f) => ({ ...f, comments: e.target.value }))} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
