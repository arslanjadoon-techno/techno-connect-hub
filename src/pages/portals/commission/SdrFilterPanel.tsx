import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, ChevronsUpDown, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { commissionService } from "@/services/portals/commission/commission.service";
import type { CommissionMarket } from "@/services/portals/commission/types";
import { dailyCommissionFilterService } from "@/services/portals/commission/daily-commission-filter.service";

const DEFAULT_MARKET = "COLORADO";

export default function SdrFilterPanel() {
  const [markets, setMarkets] = useState<CommissionMarket[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [savedIds, setSavedIds] = useState<number[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [saved, marketList] = await Promise.allSettled([
        dailyCommissionFilterService.getDailyCommissionSdrFilter(),
        commissionService.getMarkets(),
      ]);
      const list =
        marketList.status === "fulfilled"
          ? [...marketList.value].sort((a, b) => a.name.localeCompare(b.name))
          : [];
      setMarkets(list);

      let savedList: number[] = [];
      if (saved.status === "fulfilled" && Array.isArray(saved.value))
        savedList = saved.value.map((m) => m.marketId);
      else if (saved.status === "rejected")
        toast.error((saved.reason as Error)?.message || "Could not load SDR markets");

      let ids = savedList;
      if (ids.length === 0) {
        const fallback = list.find((m) => m.name.trim().toUpperCase() === DEFAULT_MARKET);
        if (fallback) ids = [fallback.id];
      }
      setSavedIds(savedList);
      setSelectedIds(ids);
      setLoading(false);
    };
    load();
  }, []);

  const selectedNames = useMemo(
    () => markets.filter((m) => selectedIds.includes(m.id)).map((m) => m.name),
    [markets, selectedIds],
  );

  const dirty =
    selectedIds.length !== savedIds.length || selectedIds.some((id) => !savedIds.includes(id));

  const toggle = (id: number) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const onSave = async () => {
    if (selectedIds.length === 0) {
      toast.error("Select at least one market");
      return;
    }
    setSaving(true);
    try {
      await dailyCommissionFilterService.saveDailyCommissionSdrFilter(
        markets
          .filter((m) => selectedIds.includes(m.id))
          .map((m) => ({ marketId: m.id, name: m.name, isActive: true })),
      );
      setSavedIds(selectedIds);
      toast.success("SDR markets saved");
    } catch (e) {
      toast.error((e as Error).message || "Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-1">
      <div className="px-1 text-xs font-medium text-muted-foreground">SDR Markets</div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={loading}
            className="flex min-h-10 w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-left text-sm hover:bg-accent disabled:opacity-60"
          >
            <span className="line-clamp-2">
              {selectedNames.length > 0 ? selectedNames.join(", ") : "Select markets"}
            </span>
            {loading ? (
              <Loader2 className="ml-auto h-4 w-4 shrink-0 animate-spin" />
            ) : (
              <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <Command>
            <CommandInput placeholder="Search market..." />
            <CommandList>
              <CommandEmpty>No market found.</CommandEmpty>
              <CommandGroup>
                {markets.map((m) => (
                  <CommandItem key={m.id} value={m.name} onSelect={() => toggle(m.id)}>
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedIds.includes(m.id) ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {m.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {dirty && (
        <Button size="sm" className="w-full" onClick={onSave} disabled={saving}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save
        </Button>
      )}
    </div>
  );
}
