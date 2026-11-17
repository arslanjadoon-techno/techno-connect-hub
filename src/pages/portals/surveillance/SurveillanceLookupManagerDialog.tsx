import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import type { SurveillanceLookupOption } from "@/services/portals/surveillance/types";
import { surveillanceService } from "@/services/portals/surveillance/surveillance.service";

const CATEGORIES: { value: string; label: string; description: string; showDeviceFlag: boolean }[] = [
  {
    value: "TransactionType",
    label: "Transaction Type",
    description:
      "Options in the audit row's Transaction Type picker. Mark an option as a device sale if it should count toward the Summary's \"closed customer\" rule (e.g. Phone, Tablet, HINT).",
    showDeviceFlag: true,
  },
  {
    value: "ClientType",
    label: "Client Type",
    description: "Options in the audit row's Client Type picker.",
    showDeviceFlag: false,
  },
  {
    value: "FraudCheckType",
    label: "Fraud Check Type",
    description:
      "Fraud & Compliance checks shown on the audit form. The original built-in checks can be deactivated but not removed; anything you add here shows up as a new Yes/No + notes check.",
    showDeviceFlag: false,
  },
];

interface SurveillanceLookupManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SurveillanceLookupManagerDialog({
  open,
  onOpenChange,
}: SurveillanceLookupManagerDialogProps) {
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].value);
  const [options, setOptions] = useState<SurveillanceLookupOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [newValue, setNewValue] = useState("");
  const [newIsDeviceType, setNewIsDeviceType] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const categoryMeta = useMemo(
    () => CATEGORIES.find((c) => c.value === activeCategory) || CATEGORIES[0],
    [activeCategory],
  );

  const loadOptions = async (category: string) => {
    setLoading(true);
    try {
      const data = await surveillanceService.getLookupOptions(category, true);
      setOptions(data.sort((a, b) => a.sortOrder - b.sortOrder));
    } catch (error) {
      toast.error(`Failed to load ${category} options: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setNewValue("");
    setNewIsDeviceType(false);
    loadOptions(activeCategory);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeCategory]);

  const handleAdd = async () => {
    const trimmed = newValue.trim();
    if (!trimmed) {
      toast.error("Please enter a value.");
      return;
    }
    if (options.some((o) => o.value.toLowerCase() === trimmed.toLowerCase() && o.isActive)) {
      toast.error("This value already exists.");
      return;
    }
    setSubmitting(true);
    try {
      await surveillanceService.createLookupOption({
        category: activeCategory,
        value: trimmed,
        label: trimmed,
        isDeviceType: categoryMeta.showDeviceFlag ? newIsDeviceType : undefined,
      });
      setNewValue("");
      setNewIsDeviceType(false);
      await loadOptions(activeCategory);
      toast.success(`${categoryMeta.label} option added.`);
    } catch (error) {
      toast.error(`Failed to add option: ${(error as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (option: SurveillanceLookupOption) => {
    setTogglingId(option.id);
    try {
      await surveillanceService.updateLookupOption(option.id, { isActive: !option.isActive });
      await loadOptions(activeCategory);
    } catch (error) {
      toast.error(`Failed to update option: ${(error as Error).message}`);
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Value Lists</DialogTitle>
          <DialogDescription>
            Add or retire the options agents see on the audit form - no code change needed.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeCategory} onValueChange={setActiveCategory} className="pt-1">
          <TabsList className="grid w-full grid-cols-3">
            {CATEGORIES.map((c) => (
              <TabsTrigger key={c.value} value={c.value} className="text-xs">
                {c.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {CATEGORIES.map((c) => (
            <TabsContent key={c.value} value={c.value} className="space-y-4 pt-3">
              <p className="text-xs text-muted-foreground">{c.description}</p>

              <div className="flex items-end gap-2">
                <div className="flex-1 space-y-1.5">
                  <Label className="text-xs font-semibold">New {c.label}</Label>
                  <Input
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    placeholder={`e.g. ${c.value === "FraudCheckType" ? "Gift Card Abuse" : "New option"}`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAdd();
                    }}
                  />
                </div>
                {c.showDeviceFlag && (
                  <div className="flex items-center gap-2 pb-2">
                    <Switch checked={newIsDeviceType} onCheckedChange={setNewIsDeviceType} />
                    <Label className="text-xs text-muted-foreground">Device sale</Label>
                  </div>
                )}
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAdd}
                  disabled={submitting}
                  className="h-9 gap-1.5 shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </Button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : options.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">
                  No options yet for {c.label}.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {options.map((o) => (
                    <div
                      key={o.id}
                      className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs ${
                        o.isActive
                          ? "border-border/60 bg-background"
                          : "border-border/40 bg-muted/30 opacity-60"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium text-foreground truncate">
                          {o.label || o.value}
                        </span>
                        {o.isDeviceType && (
                          <Badge
                            variant="outline"
                            className="border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300 text-[10px] font-semibold shrink-0"
                          >
                            Device sale
                          </Badge>
                        )}
                        {!o.isActive && (
                          <Badge variant="outline" className="text-[10px] font-semibold shrink-0">
                            Retired
                          </Badge>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={togglingId === o.id}
                        onClick={() => handleToggleActive(o)}
                        className="h-7 px-2.5 text-[11px] shrink-0"
                      >
                        {togglingId === o.id ? "..." : o.isActive ? "Retire" : "Reactivate"}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
