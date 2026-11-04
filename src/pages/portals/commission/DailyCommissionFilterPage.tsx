import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Loader2,
  Plus,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DailyCommissionUploadPanel from "./DailyCommissionUploadPanel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
  dailyCommissionFilterService,
  PAY_TYPES,
  type CommissionFilter,
  type CommissionHistory,
  type CommissionMonth,
  type CommissionType,
} from "@/services/portals/commission/daily-commission-filter.service";
import SdrFilterPanel from "./SdrFilterPanel";

type EditableFilter = {
  key: string;
  criteria: string;
  minValue: string;
  maxValue: string;
  commissionPayout: string;
  payTypeId: number;
  isActive: boolean;
};

type EditableType = {
  key: string;
  id: number;
  name: string;
  isActive: boolean;
  filters: EditableFilter[];
  snapshot: string;
  open: boolean;
};

type EditableMonth = {
  key: string;
  year: number;
  month: number;
  types: EditableType[];
  history: CommissionHistory[];
};

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

let keySeed = 0;
const newKey = () => `k${++keySeed}`;
const monthKey = (year: number, month: number) => `${year}-${month}`;
const monthLabel = (m: { year: number; month: number }) => `${MONTH_NAMES[m.month - 1]} ${m.year}`;

const historyLabel = (h: CommissionHistory) => new Date(h.savedAt).toLocaleDateString();

const numText = (v: number | null | undefined) => (v === null || v === undefined ? "" : String(v));
const toNum = (v: string) => (v.trim() === "" ? null : Number(v));

const toEditableFilter = (f: CommissionFilter): EditableFilter => {
  return {
    key: newKey(),
    criteria: f.criteria ?? "",
    minValue: f.minValue === null ? "0" : numText(f.minValue),
    maxValue: f.maxValue === null ? "5000" : numText(f.maxValue),
    commissionPayout: numText(f.commissionPayout),
    payTypeId: f.payTypeId,
    isActive: f.isActive,
  };
};

const emptyFilter = (): EditableFilter => ({
  key: newKey(),
  criteria: "",
  minValue: "0",
  maxValue: "5000",
  commissionPayout: "0",
  payTypeId: 1,
  isActive: true,
});

const toPayload = (t: EditableType): CommissionType => ({
  id: t.id,
  name: t.name.trim(),
  isActive: t.isActive,
  filters: t.filters.map((f) => ({
    criteria: f.criteria.trim() || null,
    minValue: toNum(f.minValue),
    maxValue: toNum(f.maxValue),
    commissionPayout: toNum(f.commissionPayout) ?? 0,
    payTypeId: f.payTypeId,
    isActive: f.isActive,
  })),
});

const snapshotOf = (t: EditableType) => JSON.stringify(toPayload(t));
const isDirty = (t: EditableType) => t.id === 0 || snapshotOf(t) !== t.snapshot;

const toEditable = (t: CommissionType, saved: boolean): EditableType => {
  const editable: EditableType = {
    key: newKey(),
    id: t.id,
    name: t.name,
    isActive: t.isActive,
    filters: t.filters.map(toEditableFilter),
    snapshot: "",
    open: false,
  };
  editable.snapshot = saved ? snapshotOf(editable) : "";
  return editable;
};

function filterError(f: EditableFilter): string | null {
  const min = toNum(f.minValue);
  const max = toNum(f.maxValue);
  if (
    [f.minValue, f.maxValue, f.commissionPayout].some(
      (v) => v.trim() !== "" && Number.isNaN(Number(v)),
    )
  )
    return "Only numbers allowed";
  if (min !== null && max !== null && min > max) return "Min is greater than max";
  if (min === null || max === null) return "Need min and max";
  return null;
}

function monthFromFileName(name: string): number | null {
  const upper = name.toUpperCase();
  const index = MONTH_NAMES.findIndex((m) => upper.includes(m.toUpperCase()));
  return index >= 0 ? index + 1 : null;
}

export default function DailyCommissionFilterPage() {
  const [months, setMonths] = useState<EditableMonth[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EditableType | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await dailyCommissionFilterService.getAllDailyCommissionFilter();
        setMonths(
          data.map((m) => ({
            key: monthKey(m.year, m.month),
            year: m.year,
            month: m.month,
            types: m.types.map((t) => toEditable(t, true)),
            history: m.history ?? [],
          })),
        );
      } catch (e) {
        toast.error((e as Error).message || "Could not load");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const current = useMemo(() => months.find((m) => m.key === selected) ?? null, [months, selected]);
  const version = current && selectedVersion !== null ? current.history[selectedVersion] : null;

  const refreshHistory = async () => {
    const data: CommissionMonth[] =
      await dailyCommissionFilterService.getAllDailyCommissionFilter();
    setMonths((prev) =>
      prev.map((m) => ({
        ...m,
        history: data.find((d) => d.year === m.year && d.month === m.month)?.history ?? m.history,
      })),
    );
  };
  const dirtyTypes = useMemo(() => current?.types.filter(isDirty) ?? [], [current]);

  const setMonthTypes = (key: string, types: CommissionType[]) =>
    setMonths((prev) =>
      prev.map((m) => (m.key === key ? { ...m, types: types.map((t) => toEditable(t, true)) } : m)),
    );

  /* Load that date's filters into the editor so it can be changed and saved on the same date */
  const openVersion = (index: number) => {
    if (!current) return;
    setSelectedVersion(index);
    setMonthTypes(current.key, current.history[index].types);
  };

  const updateTypes = (update: (types: EditableType[]) => EditableType[]) =>
    setMonths((prev) =>
      prev.map((m) => (m.key === selected ? { ...m, types: update(m.types) } : m)),
    );

  const updateType = (key: string, patch: Partial<EditableType>) =>
    updateTypes((types) => types.map((t) => (t.key === key ? { ...t, ...patch } : t)));

  const updateFilter = (typeKey: string, filterKey: string, patch: Partial<EditableFilter>) =>
    updateTypes((types) =>
      types.map((t) =>
        t.key === typeKey
          ? { ...t, filters: t.filters.map((f) => (f.key === filterKey ? { ...f, ...patch } : f)) }
          : t,
      ),
    );

  const moveFilter = (t: EditableType, index: number, step: number) => {
    const filters = [...t.filters];
    [filters[index], filters[index + step]] = [filters[index + step], filters[index]];
    updateType(t.key, { filters });
  };

  const addSection = () =>
    updateTypes((types) => [
      {
        key: newKey(),
        id: 0,
        name: "",
        isActive: true,
        filters: [emptyFilter()],
        snapshot: "",
        open: true,
      },
      ...types,
    ]);

  const onUpload = async (file: File) => {
    setUploading(true);
    try {
      const result = await dailyCommissionFilterService.dailyCommissionParsePdf(file);
      const now = new Date();
      const month = result.month ?? monthFromFileName(file.name) ?? now.getMonth() + 1;
      const year = month > now.getMonth() + 2 ? now.getFullYear() - 1 : now.getFullYear();
      const key = monthKey(year, month);

      setMonths((prev) => {
        const existing = prev.find((m) => m.key === key);
        const types = [...(existing?.types ?? [])];
        for (const parsed of result.types) {
          const index = types.findIndex(
            (t) => t.name.trim().toLowerCase() === parsed.name.trim().toLowerCase(),
          );
          const filters = parsed.filters.map(toEditableFilter);
          if (index >= 0) types[index] = { ...types[index], filters };
          else types.push(toEditable(parsed, false));
        }
        const updated: EditableMonth = {
          key,
          year,
          month,
          types,
          history: existing?.history ?? [],
        };
        const next = existing ? prev.map((m) => (m.key === key ? updated : m)) : [...prev, updated];
        return next.sort((a, b) => b.year - a.year || b.month - a.month);
      });
      setSelected(key);
      setSelectedVersion(null);
      toast.success(`${monthLabel({ year, month })} filled. Check and save.`);
    } catch (e) {
      toast.error((e as Error).message || "Could not read PDF");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const onSave = async () => {
    if (!current || dirtyTypes.length === 0) return;
    if (dirtyTypes.some((t) => !t.name.trim() || t.filters.some((f) => filterError(f) !== null))) {
      toast.error("Fix the red rows first");
      return;
    }
    setSaving(true);
    try {
      const saved = await dailyCommissionFilterService.saveDailyCommissionFilter({
        year: current.year,
        month: current.month,
        savedDate: version?.savedAt,
        types: dirtyTypes.map(toPayload),
      });
      const savedByKey = new Map(dirtyTypes.map((t, i) => [t.key, saved[i]]));
      updateTypes((types) =>
        types.map((t) => {
          const match = savedByKey.get(t.key);
          return match ? { ...toEditable(match, true), key: t.key, open: t.open } : t;
        }),
      );
      if (!version || new Date(version.savedAt).toDateString() === new Date().toDateString())
        await dailyCommissionFilterService.refreshDailyCommissionSummary();
      toast.success("Saved");
      await refreshHistory();
    } catch (e) {
      toast.error((e as Error).message || "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    const target = deleteTarget;
    setDeleteTarget(null);
    if (!target || !current) return;
    setSaving(true);
    try {
      if (target.id > 0)
        await dailyCommissionFilterService.deleteDailyCommissionFilter(
          target.id,
          current.year,
          current.month,
        );
      updateTypes((types) => types.filter((t) => t.key !== target.key));
      await dailyCommissionFilterService.refreshDailyCommissionSummary();
    } catch (e) {
      toast.error((e as Error).message || "Could not delete");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Tabs defaultValue="filters" className="space-y-4 p-4 md:p-6">
      <TabsList>
        <TabsTrigger value="filters">Filters</TabsTrigger>
        <TabsTrigger value="uploads">Uploader</TabsTrigger>
      </TabsList>
      <TabsContent value="uploads">
        <DailyCommissionUploadPanel />
      </TabsContent>
      <TabsContent value="filters">
        <div className="grid gap-4 md:grid-cols-[220px_1fr]">
          {saving && (
            <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <div className="text-lg font-semibold">Saving and calculating commission...</div>
              <div className="text-sm text-muted-foreground">
                This can take up to a minute. Please wait.
              </div>
            </div>
          )}
          <div className="space-y-2">
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUpload(file);
              }}
            />
            <Button
              className="w-full"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Upload PDF
            </Button>
            <SdrFilterPanel />
            <Card>
              <CardContent className="p-1">
                {loading ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : months.length === 0 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">No months</div>
                ) : (
                  months.map((m) => (
                    <div key={m.key}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelected(m.key === selected ? null : m.key);
                          setSelectedVersion(null);
                          const latest = m.history[m.history.length - 1];
                          if (latest) setMonthTypes(m.key, latest.types);
                        }}
                        className={cn(
                          "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-muted",
                          m.key === selected && selectedVersion === null && "bg-muted font-medium",
                        )}
                      >
                        {monthLabel(m)}
                        <span className="text-xs text-muted-foreground">{m.types.length}</span>
                      </button>
                      {m.key === selected &&
                        m.history.map((h, index) => (
                          <button
                            key={h.savedAt}
                            type="button"
                            onClick={() => openVersion(index)}
                            className={cn(
                              "w-full rounded-md py-1.5 pl-6 pr-3 text-left text-xs text-muted-foreground hover:bg-muted",
                              index === selectedVersion && "bg-muted font-medium text-foreground",
                            )}
                          >
                            {historyLabel(h)}
                          </button>
                        ))}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {current && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">
                  {monthLabel(current)}
                  {version && (
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      {historyLabel(version)}
                    </span>
                  )}
                </h2>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={addSection}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Section
                  </Button>
                  <Button onClick={onSave} disabled={saving || dirtyTypes.length === 0}>
                    {saving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save
                  </Button>
                </div>
              </div>

              {current.types.map((t) => (
                <Card key={t.key} className={cn(isDirty(t) && "border-primary/50")}>
                  <CardContent className="p-0">
                    <div className="flex items-center gap-2 p-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateType(t.key, { open: !t.open })}
                      >
                        {t.open ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                      <Input
                        value={t.name}
                        placeholder="Section name"
                        onChange={(e) => updateType(t.key, { name: e.target.value })}
                        className={cn(
                          "h-8 max-w-xs font-medium",
                          !t.name.trim() && "border-destructive",
                        )}
                      />
                      <div className="ml-auto flex items-center gap-2">
                        <Switch
                          checked={t.isActive}
                          onCheckedChange={(v) => updateType(t.key, { isActive: v })}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setDeleteTarget(t)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    {t.open && (
                      <div className="border-t">
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-8" />
                                <TableHead className="min-w-36">Criteria</TableHead>
                                <TableHead className="w-28">Min</TableHead>
                                <TableHead className="w-28">Max</TableHead>
                                <TableHead className="w-28">Payout</TableHead>
                                <TableHead className="min-w-36">Pay type</TableHead>
                                <TableHead className="w-16">Active</TableHead>
                                <TableHead className="w-10" />
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {t.filters.map((f, index) => {
                                const error = filterError(f);
                                return (
                                  <TableRow
                                    key={f.key}
                                    title={error ?? undefined}
                                    className={cn(error && "bg-destructive/10")}
                                  >
                                    <TableCell className="p-1">
                                      <div className="flex flex-col">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-5 w-6"
                                          disabled={index === 0}
                                          onClick={() => moveFilter(t, index, -1)}
                                        >
                                          <ChevronUp className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-5 w-6"
                                          disabled={index === t.filters.length - 1}
                                          onClick={() => moveFilter(t, index, 1)}
                                        >
                                          <ChevronDown className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <Input
                                        value={f.criteria}
                                        onChange={(e) =>
                                          updateFilter(t.key, f.key, { criteria: e.target.value })
                                        }
                                        className="h-8"
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <Input
                                        value={f.minValue}
                                        inputMode="decimal"
                                        onChange={(e) =>
                                          updateFilter(t.key, f.key, { minValue: e.target.value })
                                        }
                                        className="h-8"
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <Input
                                        value={f.maxValue}
                                        inputMode="decimal"
                                        onChange={(e) =>
                                          updateFilter(t.key, f.key, { maxValue: e.target.value })
                                        }
                                        className="h-8"
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <Input
                                        value={f.commissionPayout}
                                        inputMode="decimal"
                                        onChange={(e) =>
                                          updateFilter(t.key, f.key, {
                                            commissionPayout: e.target.value,
                                          })
                                        }
                                        className="h-8"
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <Select
                                        value={String(f.payTypeId)}
                                        onValueChange={(v) =>
                                          updateFilter(t.key, f.key, { payTypeId: Number(v) })
                                        }
                                      >
                                        <SelectTrigger className="h-8">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {PAY_TYPES.map((p) => (
                                            <SelectItem key={p.id} value={String(p.id)}>
                                              {p.label}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </TableCell>
                                    <TableCell>
                                      <Switch
                                        checked={f.isActive}
                                        onCheckedChange={(v) =>
                                          updateFilter(t.key, f.key, { isActive: v })
                                        }
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() =>
                                          updateType(t.key, {
                                            filters: t.filters.filter((x) => x.key !== f.key),
                                          })
                                        }
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                        <div className="p-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              updateType(t.key, { filters: [...t.filters, emptyFilter()] })
                            }
                          >
                            <Plus className="mr-1 h-4 w-4" />
                            Add row
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <AlertDialog
            open={deleteTarget !== null}
            onOpenChange={(open) => !open && setDeleteTarget(null)}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {deleteTarget?.name || "this section"}?</AlertDialogTitle>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TabsContent>
    </Tabs>
  );
}
