import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Check,
  ChevronsUpDown,
  Download,
  Loader2,
  Play,
  Plus,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { exportToExcel } from "@/lib/excel-export";
import {
  commissionEngineService,
  type CeAdjustment,
  type CeComponent,
  type CeCondition,
  type CeEmployeeResult,
  type CeField,
  type CeFieldValue,
  type CeMetricSummary,
  type CePlan,
  type CePlanSummary,
  type CeRule,
  type CeRunResult,
  type CeRunSummary,
  type CeTier,
} from "@/services/portals/commission/commission-engine.service";

const PAGE_SIZE = 100;
const money = (v: number | null | undefined) => (v ?? 0).toFixed(2);
const day = (v: string | null) => (v ? new Date(v).toLocaleDateString() : "-");

/* "Data till 10/27/2026 · $942,991.70 · run 10/30/2026, 12:10 AM" */
const runLabel = (r: { dataTill: string | null; tillDate: string | null; totalFinal: number; createdAt: string; employees: number }) =>
  `Data till ${day(r.tillDate ?? r.dataTill)}${r.tillDate ? " (till date)" : ""} · $${r.totalFinal.toLocaleString(undefined, { maximumFractionDigits: 2 })} · ${r.employees} emp · run ${new Date(r.createdAt).toLocaleString()}`;

const OPS: { value: string; label: string; kinds: string[] }[] = [
  { value: "eq", label: "equals", kinds: ["text", "number", "date"] },
  { value: "neq", label: "not equals", kinds: ["text", "number", "date"] },
  { value: "in", label: "is any of", kinds: ["text", "number"] },
  { value: "nin", label: "is none of", kinds: ["text", "number"] },
  { value: "contains", label: "contains", kinds: ["text"] },
  { value: "ncontains", label: "does not contain", kinds: ["text"] },
  { value: "starts", label: "starts with", kinds: ["text"] },
  { value: "ends", label: "ends with", kinds: ["text"] },
  { value: "empty", label: "is blank", kinds: ["text", "number", "date"] },
  { value: "nempty", label: "is not blank", kinds: ["text", "number", "date"] },
  { value: "gt", label: "greater than", kinds: ["number", "date", "text"] },
  { value: "gte", label: "greater or equal", kinds: ["number", "date", "text"] },
  { value: "lt", label: "less than", kinds: ["number", "date", "text"] },
  { value: "lte", label: "less or equal", kinds: ["number", "date", "text"] },
  { value: "between", label: "between", kinds: ["number", "date"] },
];

const NO_VALUE_OPS = ["empty", "nempty"];
const MULTI_OPS = ["in", "nin"];

/* Distinct values per source+field, loaded once */
const valueCache = new Map<string, Promise<CeFieldValue[]>>();
const loadValues = (source: string, field: string) => {
  const key = `${source}|${field}`;
  if (!valueCache.has(key)) valueCache.set(key, commissionEngineService.getFieldValues(source, field));
  return valueCache.get(key)!;
};

/* "0.59..0.65 = 10%" or "75.. = $10" - one tier per line */
const tiersToText = (tiers: CeTier[]) =>
  tiers
    .map(
      (t) =>
        `${t.min ?? ""}..${t.max ?? ""} = ${t.percent != null ? `${t.percent}%` : `$${t.amount ?? 0}`}`,
    )
    .join("\n");

const textToTiers = (text: string): CeTier[] =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.includes("="))
    .map((line) => {
      const [range, pay] = line.split("=").map((x) => x.trim());
      const [min, max] = range.split("..").map((x) => x.trim());
      const percent = pay.endsWith("%");
      const value = Number(pay.replace("%", "").replace("$", ""));
      return {
        min: min === "" || min === undefined ? null : Number(min),
        max: max === "" || max === undefined ? null : Number(max),
        amount: percent ? null : value,
        percent: percent ? value : null,
      };
    });

const listToText = (list: string[]) => list.join(", ");
const textToList = (text: string) =>
  text
    .split(",")
    .map((x) => x.trim())
    .filter((x) => x.length > 0);

const emptyRule = (source: string, sortOrder: number): CeRule => ({
  id: 0,
  source,
  sortOrder,
  category: "",
  valueField: null,
  skipEligibility: false,
  conditions: [],
  note: null,
});

const emptyComponent = (sortOrder: number): CeComponent => ({
  id: 0,
  code: "",
  name: "",
  reportGroup: "",
  sortOrder,
  kind: "LINE",
  source: "ADR",
  categories: "",
  calc: "FLAT",
  rate: 0,
  tierBasis: null,
  tierMetric: null,
  tiers: [],
  gateMetric: null,
  gateMin: null,
  inGross: true,
});

export default function CommissionEnginePage() {
  const [plans, setPlans] = useState<CePlanSummary[]>([]);
  const [planId, setPlanId] = useState<number | null>(null);
  const [plan, setPlan] = useState<CePlan | null>(null);
  const [run, setRun] = useState<CeRunResult | null>(null);
  const [runs, setRuns] = useState<CeRunSummary[]>([]);
  const [tillDate, setTillDate] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [newMonthOpen, setNewMonthOpen] = useState(false);

  const loadPlans = useCallback(async () => {
    const data = await commissionEngineService.getPlans();
    setPlans(data);
    setPlanId((current) => current ?? data[0]?.id ?? null);
  }, []);

  useEffect(() => {
    loadPlans().catch((e) => toast.error((e as Error).message));
  }, [loadPlans]);

  useEffect(() => {
    if (planId == null) return;
    setPlan(null);
    setRun(null);
    Promise.all([
      commissionEngineService.getPlan(planId),
      commissionEngineService.getLatestRun(planId),
      commissionEngineService.getRuns(planId),
    ])
      .then(([p, r, list]) => {
        setPlan(p);
        setRun(r);
        setRuns(list);
      })
      .catch((e) => toast.error((e as Error).message));
  }, [planId]);

  const openRun = (runId: number) =>
    withBusy("Loading run...", async () => {
      setRun(await commissionEngineService.getRun(runId));
    });

  const withBusy = async (label: string, action: () => Promise<void>) => {
    setBusy(label);
    try {
      await action();
    } catch (e) {
      toast.error((e as Error).message || "Something went wrong");
    } finally {
      setBusy(null);
    }
  };

  const onRun = () =>
    withBusy("Calculating commission...", async () => {
      if (planId == null) return;
      const result = await commissionEngineService.run(planId, tillDate || null);
      setRun(result);
      setRuns(await commissionEngineService.getRuns(planId));
      toast.success(`Calculated ${result.employees.length} employees`);
      await loadPlans();
    });

  return (
    <div className="space-y-4 p-4 md:p-6">
      {busy && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <div className="text-lg font-semibold">{busy}</div>
          <div className="text-sm text-muted-foreground">Please wait.</div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Commission Engine</h1>
          <p className="text-sm text-muted-foreground">
            Month rules, uploads and the final commission in one place.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={planId != null ? String(planId) : undefined}
            onValueChange={(v) => setPlanId(Number(v))}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              {plans.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setNewMonthOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New month
          </Button>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">Till date</span>
            <Input
              type="date"
              className="h-9 w-40"
              value={tillDate}
              onChange={(e) => setTillDate(e.target.value)}
              title="Empty = all data. A date = only lines on or before that date (e.g. 1-25 Oct)."
            />
          </div>
          <Button onClick={onRun} disabled={planId == null || busy != null}>
            <Play className="mr-2 h-4 w-4" />
            Run
          </Button>
        </div>
      </div>

      {!plan ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Tabs defaultValue="results" className="space-y-4">
          <TabsList>
            <TabsTrigger value="results">Results</TabsTrigger>
            <TabsTrigger value="rules">Rules</TabsTrigger>
            <TabsTrigger value="components">Components</TabsTrigger>
            <TabsTrigger value="data">Data</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="results" className="space-y-3">
            {runs.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted-foreground">History</span>
                <Select value={run ? String(run.runId) : undefined} onValueChange={(v) => openRun(Number(v))}>
                  <SelectTrigger className="w-[28rem] max-w-full">
                    <SelectValue placeholder="Select a run" />
                  </SelectTrigger>
                  <SelectContent className="max-h-80">
                    {runs.map((r) => (
                      <SelectItem key={r.runId} value={String(r.runId)}>
                        {runLabel(r)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <ResultsTab run={run} planName={plan.name} />
          </TabsContent>
          <TabsContent value="rules">
            <RulesTab plan={plan} onSaved={setPlan} withBusy={withBusy} />
          </TabsContent>
          <TabsContent value="components">
            <ComponentsTab plan={plan} onSaved={setPlan} withBusy={withBusy} />
          </TabsContent>
          <TabsContent value="data">
            <DataTab planId={plan.id} withBusy={withBusy} />
          </TabsContent>
          <TabsContent value="settings">
            <SettingsTab plan={plan} onSaved={setPlan} withBusy={withBusy} />
          </TabsContent>
        </Tabs>
      )}

      <NewMonthDialog
        open={newMonthOpen}
        onOpenChange={setNewMonthOpen}
        copyFrom={plan}
        onCreate={(year, month, copyFromId) =>
          withBusy("Creating month...", async () => {
            const created = await commissionEngineService.createPlan(year, month, copyFromId);
            setNewMonthOpen(false);
            await loadPlans();
            setPlanId(created.id);
            toast.success(`${created.name} created`);
          })
        }
      />
    </div>
  );
}

type WithBusy = (label: string, action: () => Promise<void>) => Promise<void>;

function ResultsTab({ run, planName }: { run: CeRunResult | null; planName: string }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = run?.employees ?? [];
    return term
      ? list.filter((e) =>
          `${e.market} ${e.ntid} ${e.employeeName ?? ""}`.toLowerCase().includes(term),
        )
      : list;
  }, [run, search]);

  if (!run) {
    return (
      <Card className="p-10 text-center text-sm text-muted-foreground">
        No calculation yet for {planName}. Press Run.
      </Card>
    );
  }

  const sum = (get: (e: CeEmployeeResult) => number) =>
    run.employees.reduce((total, e) => total + (get(e) ?? 0), 0);
  const dollars = (v: number) => `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const totals: { label: string; value: string; strong?: boolean }[] = [
    { label: "Employees", value: run.employees.length.toLocaleString() },
    { label: "Total BOX", value: sum((e) => e.totalBox).toLocaleString() },
    {
      label: "Upgrades",
      value: sum((e) =>
        Object.entries(e.counts)
          .filter(([k]) => k.toLowerCase().startsWith("upg"))
          .reduce((t, [, v]) => t + v, 0),
      ).toLocaleString(),
    },
    { label: "Acc Sales", value: dollars(sum((e) => e.bases["ACC"] ?? 0)) },
    ...run.groups.map((g) => ({ label: g, value: dollars(sum((e) => e.groups[g] ?? 0)) })),
    { label: "Commission", value: dollars(sum((e) => e.gross)), strong: true },
    { label: "Final Commission After Deduction", value: dollars(sum((e) => e.final)), strong: true },
  ];
  const pageRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));

  const onExport = () => {
    const data = run.employees.map((e) => {
      const row: Record<string, unknown> = {
        market: e.market,
        ntid: e.ntid,
        name: e.employeeName ?? "",
        eligible: e.eligible ?? "",
        retention: e.retention95 ?? "",
        totalBox: e.totalBox,
        gross: e.gross,
        final: e.final,
      };
      run.groups.forEach((g) => (row[`g_${g}`] = e.groups[g] ?? 0));
      run.categories.forEach((c) => (row[`c_${c}`] = e.counts[c] ?? 0));
      return row;
    });
    const columns = [
      "market",
      "ntid",
      "name",
      "eligible",
      "retention",
      "totalBox",
      ...run.groups.map((g) => `g_${g}`),
      "gross",
      "final",
      ...run.categories.map((c) => `c_${c}`),
    ];
    const headers: Record<string, string> = {
      market: "MARKET",
      ntid: "NTID",
      name: "EMPLOYEE NAME",
      eligible: "Eligible",
      retention: "95 Day Retention",
      totalBox: "Total BOX",
      gross: "Commission",
      final: "Final Commission After Deduction",
    };
    run.groups.forEach((g) => (headers[`g_${g}`] = g));
    run.categories.forEach((c) => (headers[`c_${c}`] = c));
    exportToExcel(data, columns, headers, {
      sheetName: "Commission",
      fileName: `Commission_${planName.replace(" ", "_")}`,
    });
  };

  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground">
        Data till <b>{day(run.tillDate ?? run.dataTill)}</b>
        {run.tillDate ? " (till date)" : ""} · calculated {new Date(run.createdAt).toLocaleString()}
      </div>
      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {totals.map((t) => (
          <Stat key={t.label} label={t.label} value={t.value} strong={t.strong} />
        ))}
      </div>

      {run.alerts.length > 0 && (
        <Card className="border-amber-500/50">
          <CardContent className="space-y-1 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-600">
              <AlertTriangle className="h-4 w-4" />
              Alerts - check these, then add a rule or upload the missing file
            </div>
            {run.alerts.map((a, i) => (
              <div key={i} className="text-xs text-muted-foreground">
                [{a.type}] {a.message}
                {a.count > 0 ? ` - ${a.count} lines` : ""}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Input
          placeholder="Search market, NTID or name"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          className="max-w-xs"
        />
        <Button variant="outline" onClick={onExport}>
          <Download className="mr-2 h-4 w-4" />
          Export Excel
        </Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Market</TableHead>
                <TableHead>NTID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Eligible</TableHead>
                <TableHead className="text-right">95D Ret.</TableHead>
                <TableHead className="text-right">Total BOX</TableHead>
                {run.groups.map((g) => (
                  <TableHead key={g} className="whitespace-nowrap text-right">
                    {g}
                  </TableHead>
                ))}
                <TableHead className="text-right">Commission</TableHead>
                <TableHead className="text-right">Final</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((e) => (
                <TableRow key={`${e.market}|${e.ntid}`}>
                  <TableCell>{e.market}</TableCell>
                  <TableCell>{e.ntid}</TableCell>
                  <TableCell className="whitespace-nowrap">{e.employeeName}</TableCell>
                  <TableCell>{e.eligible}</TableCell>
                  <TableCell className="text-right">
                    {e.retention95 != null ? `${(e.retention95 * 100).toFixed(1)}%` : ""}
                  </TableCell>
                  <TableCell className="text-right">{e.totalBox}</TableCell>
                  {run.groups.map((g) => (
                    <TableCell key={g} className="text-right">
                      {money(e.groups[g])}
                    </TableCell>
                  ))}
                  <TableCell className="text-right">{money(e.gross)}</TableCell>
                  <TableCell className="text-right font-semibold">{money(e.final)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <div className="flex items-center justify-end gap-2 text-sm">
        <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
          Previous
        </Button>
        <span>
          Page {page + 1} of {pages} ({rows.length} rows)
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page + 1 >= pages}
          onClick={() => setPage(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <Card className={cn("p-3", strong && "border-primary/50 bg-primary/5")}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn("mt-1 font-semibold", strong && "text-primary")}>{value}</div>
    </Card>
  );
}

type EditableRule = CeRule & { key: string };

let keySeed = 0;
const newKey = () => `r${++keySeed}`;

function RulesTab({
  plan,
  onSaved,
  withBusy,
}: {
  plan: CePlan;
  onSaved: (plan: CePlan) => void;
  withBusy: WithBusy;
}) {
  const [rules, setRules] = useState<EditableRule[]>([]);
  const [fields, setFields] = useState<Record<string, CeField[]>>({});

  useEffect(() => {
    setRules(plan.rules.map((r) => ({ ...r, key: newKey() })));
  }, [plan]);

  useEffect(() => {
    Promise.all([
      commissionEngineService.getSourceFields("ADR"),
      commissionEngineService.getSourceFields("SDR"),
    ])
      .then(([adr, sdr]) => setFields({ ADR: adr, SDR: sdr }))
      .catch((e) => toast.error((e as Error).message));
  }, []);

  const update = (key: string, patch: Partial<EditableRule>) =>
    setRules((list) => list.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const onSave = () =>
    withBusy("Saving rules...", async () => {
      const payload = rules.map(({ key: _key, ...r }) => r);
      await commissionEngineService.saveRules(plan.id, payload);
      onSaved(await commissionEngineService.getPlan(plan.id));
      toast.success("Rules saved");
    });

  return (
    <div className="space-y-3">
      <Card className="p-3 text-xs text-muted-foreground">
        Every line gets the category of the <b>first</b> rule (by order) whose conditions all match. Fields
        and values come from the raw ADR / SDR data. Category <b>EXCLUDE</b> drops the line,{" "}
        <b>{"{mrc}"}</b> is replaced by the MRC.
      </Card>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setRules((l) => [...l, { ...emptyRule("ADR", (l.length + 1) * 10), key: newKey() }])}>
          <Plus className="mr-2 h-4 w-4" />
          Add rule
        </Button>
        <Button onClick={onSave}>
          <Save className="mr-2 h-4 w-4" />
          Save rules
        </Button>
      </div>
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Source</TableHead>
                <TableHead className="w-20">Order</TableHead>
                <TableHead className="w-40">Category</TableHead>
                <TableHead className="min-w-80">Conditions</TableHead>
                <TableHead className="w-32">Value field</TableHead>
                <TableHead className="w-24">No eligibility</TableHead>
                <TableHead className="min-w-40">Note</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules
                .slice()
                .sort((a, b) => a.source.localeCompare(b.source) || a.sortOrder - b.sortOrder)
                .map((r) => (
                  <TableRow key={r.key}>
                    <TableCell>
                      <Select value={r.source} onValueChange={(v) => update(r.key, { source: v })}>
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ADR">ADR</SelectItem>
                          <SelectItem value="SDR">SDR</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input className="h-8" value={r.sortOrder} onChange={(e) => update(r.key, { sortOrder: Number(e.target.value) || 0 })} />
                    </TableCell>
                    <TableCell>
                      <Input className="h-8" value={r.category} onChange={(e) => update(r.key, { category: e.target.value })} />
                    </TableCell>
                    <TableCell>
                      <ConditionEditor
                        source={r.source}
                        fields={fields[r.source] ?? []}
                        conditions={r.conditions}
                        onChange={(conditions) => update(r.key, { conditions })}
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={r.valueField ?? "__default"}
                        onValueChange={(v) => update(r.key, { valueField: v === "__default" ? null : v })}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__default">default</SelectItem>
                          {(fields[r.source] ?? [])
                            .filter((f) => f.kind === "number")
                            .map((f) => (
                              <SelectItem key={f.name} value={f.name}>
                                {f.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Switch checked={r.skipEligibility} onCheckedChange={(v) => update(r.key, { skipEligibility: v })} />
                    </TableCell>
                    <TableCell>
                      <Input className="h-8" value={r.note ?? ""} onChange={(e) => update(r.key, { note: e.target.value || null })} />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setRules((l) => l.filter((x) => x.key !== r.key))}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

function ConditionEditor({
  source,
  fields,
  conditions,
  onChange,
}: {
  source: string;
  fields: CeField[];
  conditions: CeCondition[];
  onChange: (conditions: CeCondition[]) => void;
}) {
  const set = (index: number, patch: Partial<CeCondition>) =>
    onChange(conditions.map((c, i) => (i === index ? { ...c, ...patch } : c)));

  return (
    <div className="space-y-1.5">
      {conditions.map((c, index) => {
        const kind = fields.find((f) => f.name.toLowerCase() === c.field.toLowerCase())?.kind ?? "text";
        const ops = OPS.filter((o) => o.kinds.includes(kind));
        return (
          <div key={index} className="flex flex-wrap items-center gap-1">
            <Select value={c.field || undefined} onValueChange={(v) => set(index, { field: v, value: "" })}>
              <SelectTrigger className="h-8 w-36">
                <SelectValue placeholder="Field" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {fields.map((f) => (
                  <SelectItem key={f.name} value={f.name}>
                    {f.name}
                    {f.computed ? " *" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={c.op} onValueChange={(v) => set(index, { op: v, value: MULTI_OPS.includes(v) === MULTI_OPS.includes(c.op) ? c.value : "" })}>
              <SelectTrigger className="h-8 w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ops.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!NO_VALUE_OPS.includes(c.op) && c.field && (
              <ValueInput
                source={source}
                field={c.field}
                kind={kind}
                op={c.op}
                value={c.value ?? ""}
                onChange={(value) => set(index, { value })}
              />
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onChange(conditions.filter((_, i) => i !== index))}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        );
      })}
      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onChange([...conditions, { field: "", op: "eq", value: "" }])}>
        <Plus className="mr-1 h-3.5 w-3.5" />
        Condition
      </Button>
    </div>
  );
}

function ValueInput({
  source,
  field,
  kind,
  op,
  value,
  onChange,
}: {
  source: string;
  field: string;
  kind: string;
  op: string;
  value: string;
  onChange: (value: string) => void;
}) {
  if (op === "between") {
    const [from = "", to = ""] = value.split(",");
    const type = kind === "date" ? "date" : "text";
    return (
      <div className="flex items-center gap-1">
        <Input type={type} className="h-8 w-36" value={from} onChange={(e) => onChange(`${e.target.value},${to}`)} />
        <span className="text-xs">and</span>
        <Input type={type} className="h-8 w-36" value={to} onChange={(e) => onChange(`${from},${e.target.value}`)} />
      </div>
    );
  }
  if (kind === "date") {
    return <Input type="date" className="h-8 w-40" value={value} onChange={(e) => onChange(e.target.value)} />;
  }
  if (kind === "number" && !MULTI_OPS.includes(op) && field !== "mrc" && field !== "mrc_round") {
    return <Input className="h-8 w-28" value={value} onChange={(e) => onChange(e.target.value)} />;
  }
  return <ValuePicker source={source} field={field} multi={MULTI_OPS.includes(op)} value={value} onChange={onChange} />;
}

function ValuePicker({
  source,
  field,
  multi,
  value,
  onChange,
}: {
  source: string;
  field: string;
  multi: boolean;
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<CeFieldValue[] | null>(null);
  const [search, setSearch] = useState("");
  const selected = multi ? value.split(",").map((x) => x.trim()).filter((x) => x.length > 0) : [value];

  useEffect(() => {
    if (!open || options) return;
    loadValues(source, field)
      .then(setOptions)
      .catch(() => setOptions([]));
  }, [open, options, source, field]);

  useEffect(() => setOptions(null), [source, field]);

  const pick = (v: string) => {
    if (!multi) {
      onChange(v);
      setOpen(false);
      return;
    }
    const next = selected.some((s) => s.toLowerCase() === v.toLowerCase())
      ? selected.filter((s) => s.toLowerCase() !== v.toLowerCase())
      : [...selected, v];
    onChange(next.join(","));
  };

  const typed = search.trim();
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-8 min-w-40 max-w-72 items-center gap-1 rounded-md border border-input bg-background px-2 text-left text-xs hover:bg-accent"
        >
          <span className="truncate">{value ? selected.join(", ") : "Select value"}</span>
          <ChevronsUpDown className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search..." value={search} onValueChange={setSearch} />
          <CommandList>
            {options == null ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <CommandEmpty>No value found.</CommandEmpty>
                <CommandGroup>
                  {typed.length > 0 && !options.some((o) => o.value.toLowerCase() === typed.toLowerCase()) && (
                    <CommandItem value={`__typed ${typed}`} onSelect={() => pick(typed)}>
                      Use "{typed}"
                    </CommandItem>
                  )}
                  {options.map((o) => (
                    <CommandItem key={o.value} value={o.value || "(blank)"} onSelect={() => pick(o.value)}>
                      <Check
                        className={cn(
                          "mr-2 h-3.5 w-3.5",
                          selected.some((s) => s.toLowerCase() === o.value.toLowerCase()) ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <span className="truncate">{o.value || "(blank)"}</span>
                      <span className="ml-auto text-xs text-muted-foreground">{o.count.toLocaleString()}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

type EditableComponent = CeComponent & { key: string; tiersText: string };

function ComponentsTab({
  plan,
  onSaved,
  withBusy,
}: {
  plan: CePlan;
  onSaved: (plan: CePlan) => void;
  withBusy: WithBusy;
}) {
  const [items, setItems] = useState<EditableComponent[]>([]);

  useEffect(() => {
    setItems(plan.components.map((c) => ({ ...c, key: newKey(), tiersText: tiersToText(c.tiers) })));
  }, [plan]);

  const update = (key: string, patch: Partial<EditableComponent>) =>
    setItems((list) => list.map((c) => (c.key === key ? { ...c, ...patch } : c)));

  const onSave = () =>
    withBusy("Saving components...", async () => {
      const payload = items.map(({ key: _key, tiersText, ...c }) => ({ ...c, tiers: textToTiers(tiersText) }));
      await commissionEngineService.saveComponents(plan.id, payload);
      onSaved(await commissionEngineService.getPlan(plan.id));
      toast.success("Components saved");
    });

  return (
    <div className="space-y-3">
      <Card className="p-3 text-xs text-muted-foreground">
        <b>LINE</b> pays per line, <b>COUNT</b> pays per line using the employee's count, <b>ADJUSTMENT</b> adds
        uploaded amounts (type = categories). Categories: comma list, <code>*</code> wildcard, <code>!</code> to
        exclude (e.g. <code>* MRC,!VAS MRC</code>). Tiers, one per line: <code>0.59..0.65 = 10%</code> or{" "}
        <code>75.. = $10</code>. Tier basis: VALUE (line value), METRIC (uploaded metric), COUNT. Gate: pay only
        when the metric is at least the minimum.
      </Card>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setItems((l) => [...l, { ...emptyComponent((l.length + 1) * 10), key: newKey(), tiersText: "" }])}>
          <Plus className="mr-2 h-4 w-4" />
          Add component
        </Button>
        <Button onClick={onSave}>
          <Save className="mr-2 h-4 w-4" />
          Save components
        </Button>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {items
          .slice()
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((c) => (
            <Card key={c.key}>
              <CardContent className="grid grid-cols-2 gap-2 p-3 text-xs">
                <Field label="Code">
                  <Input className="h-8" value={c.code} onChange={(e) => update(c.key, { code: e.target.value })} />
                </Field>
                <Field label="Name">
                  <Input className="h-8" value={c.name} onChange={(e) => update(c.key, { name: e.target.value })} />
                </Field>
                <Field label="Report column">
                  <Input className="h-8" value={c.reportGroup} onChange={(e) => update(c.key, { reportGroup: e.target.value })} />
                </Field>
                <Field label="Order">
                  <Input className="h-8" value={c.sortOrder} onChange={(e) => update(c.key, { sortOrder: Number(e.target.value) || 0 })} />
                </Field>
                <Field label="Kind">
                  <Choice value={c.kind} options={["LINE", "COUNT", "ADJUSTMENT"]} onChange={(v) => update(c.key, { kind: v })} />
                </Field>
                <Field label="Source">
                  <Choice value={c.source ?? ""} options={["ADR", "SDR"]} onChange={(v) => update(c.key, { source: v })} />
                </Field>
                <Field label="Categories / adjustment types">
                  <Input className="h-8" value={c.categories ?? ""} onChange={(e) => update(c.key, { categories: e.target.value })} />
                </Field>
                <Field label="Calc">
                  <Choice value={c.calc ?? ""} options={["FLAT", "PERCENT", "TIER"]} onChange={(v) => update(c.key, { calc: v })} />
                </Field>
                <Field label="Rate ($ or %)">
                  <Input className="h-8" value={c.rate ?? ""} onChange={(e) => update(c.key, { rate: e.target.value === "" ? null : Number(e.target.value) })} />
                </Field>
                <Field label="Tier basis">
                  <Choice value={c.tierBasis ?? ""} options={["VALUE", "METRIC", "COUNT"]} onChange={(v) => update(c.key, { tierBasis: v })} />
                </Field>
                <Field label="Tier metric">
                  <Input className="h-8" value={c.tierMetric ?? ""} onChange={(e) => update(c.key, { tierMetric: e.target.value || null })} />
                </Field>
                <Field label="Gate metric / min">
                  <div className="flex gap-1">
                    <Input className="h-8" value={c.gateMetric ?? ""} onChange={(e) => update(c.key, { gateMetric: e.target.value || null })} />
                    <Input className="h-8 w-20" value={c.gateMin ?? ""} onChange={(e) => update(c.key, { gateMin: e.target.value === "" ? null : Number(e.target.value) })} />
                  </div>
                </Field>
                <div className="col-span-2">
                  <Field label="Tiers">
                    <Textarea className="min-h-16 font-mono text-xs" value={c.tiersText} onChange={(e) => update(c.key, { tiersText: e.target.value })} />
                  </Field>
                </div>
                <div className="col-span-2 flex items-center justify-between">
                  <label className="flex items-center gap-2">
                    <Switch checked={c.inGross} onCheckedChange={(v) => update(c.key, { inGross: v })} />
                    Part of Commission (off = only in Final, e.g. write-ups)
                  </label>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setItems((l) => l.filter((x) => x.key !== c.key))}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}

function Choice({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger className="h-8">
        <SelectValue placeholder="-" />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function DataTab({ planId, withBusy }: { planId: number; withBusy: WithBusy }) {
  const [metrics, setMetrics] = useState<CeMetricSummary[]>([]);
  const [adjustments, setAdjustments] = useState<CeAdjustment[]>([]);
  const [metricCode, setMetricCode] = useState("FEATURE_RETENTION");
  const [typeCode, setTypeCode] = useState("WRITEUP");
  const metricFile = useRef<HTMLInputElement>(null);
  const adjustmentFile = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const [m, a] = await Promise.all([
      commissionEngineService.getMetrics(planId),
      commissionEngineService.getAdjustments(planId),
    ]);
    setMetrics(m);
    setAdjustments(a);
  }, [planId]);

  useEffect(() => {
    load().catch((e) => toast.error((e as Error).message));
  }, [load]);

  const adjustmentTotals = useMemo(() => {
    const totals = new Map<string, { count: number; amount: number }>();
    adjustments.forEach((a) => {
      const t = totals.get(a.typeCode) ?? { count: 0, amount: 0 };
      totals.set(a.typeCode, { count: t.count + 1, amount: t.amount + a.amount });
    });
    return [...totals.entries()];
  }, [adjustments]);

  const upload = (kind: "metric" | "adjustment", file: File) =>
    withBusy("Uploading...", async () => {
      const message =
        kind === "metric"
          ? await commissionEngineService.uploadMetric(planId, metricCode.trim(), file)
          : await commissionEngineService.uploadAdjustments(planId, typeCode.trim(), file);
      toast.success(message);
      await load();
    });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="font-semibold">Metrics (per NTID values)</div>
          <p className="text-xs text-muted-foreground">
            Retention, feature retention, eligibility date, active status ... Upload an Excel/CSV with an NTID column and a
            value column. A new upload replaces that metric for this month.
          </p>
          <div className="flex flex-wrap gap-2">
            <Input className="w-56" value={metricCode} onChange={(e) => setMetricCode(e.target.value.toUpperCase())} />
            <input
              ref={metricFile}
              type="file"
              accept=".xlsx,.csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) upload("metric", f);
                e.target.value = "";
              }}
            />
            <Button variant="outline" onClick={() => metricFile.current?.click()} disabled={!metricCode.trim()}>
              <Upload className="mr-2 h-4 w-4" />
              Upload
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                withBusy("Importing...", async () => {
                  toast.success(await commissionEngineService.importMetricsFromRaw(planId));
                  await load();
                })
              }
            >
              Import eligibility + retention
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Metric</TableHead>
                <TableHead className="text-right">NTIDs</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics.map((m) => (
                <TableRow key={m.metricCode}>
                  <TableCell>{m.metricCode}</TableCell>
                  <TableCell className="text-right">{m.count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="font-semibold">Adjustments (write-ups, spiffs, contest ...)</div>
          <p className="text-xs text-muted-foreground">
            Upload an Excel/CSV with NTID, Amount and optional Market and Note columns. The type must match a component's
            categories. A new upload replaces that type for this month.
          </p>
          <div className="flex flex-wrap gap-2">
            <Input className="w-56" value={typeCode} onChange={(e) => setTypeCode(e.target.value.toUpperCase())} />
            <input
              ref={adjustmentFile}
              type="file"
              accept=".xlsx,.csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) upload("adjustment", f);
                e.target.value = "";
              }}
            />
            <Button variant="outline" onClick={() => adjustmentFile.current?.click()} disabled={!typeCode.trim()}>
              <Upload className="mr-2 h-4 w-4" />
              Upload
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Rows</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adjustmentTotals.map(([type, t]) => (
                <TableRow key={type}>
                  <TableCell>{type}</TableCell>
                  <TableCell className="text-right">{t.count}</TableCell>
                  <TableCell className="text-right">{money(t.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="max-h-72 overflow-y-auto">
            <Table>
              <TableBody>
                {adjustments.slice(0, 300).map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="text-xs">{a.typeCode}</TableCell>
                    <TableCell className="text-xs">{a.ntid}</TableCell>
                    <TableCell className="text-xs">{a.market}</TableCell>
                    <TableCell className="text-right text-xs">{money(a.amount)}</TableCell>
                    <TableCell className="w-10">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() =>
                          withBusy("Deleting...", async () => {
                            await commissionEngineService.deleteAdjustment(planId, a.id);
                            await load();
                          })
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsTab({
  plan,
  onSaved,
  withBusy,
}: {
  plan: CePlan;
  onSaved: (plan: CePlan) => void;
  withBusy: WithBusy;
}) {
  const [alwaysEligible, setAlwaysEligible] = useState("");
  const [boxExclude, setBoxExclude] = useState("");
  const [metrics, setMetrics] = useState({
    eligibilityMetric: "",
    activeStatusMetric: "",
    eligibleListMetric: "",
    retentionMetric: "",
  });

  useEffect(() => {
    setAlwaysEligible(listToText(plan.settings.alwaysEligibleMarkets));
    setBoxExclude(listToText(plan.settings.totalBoxExclude));
    setMetrics({
      eligibilityMetric: plan.settings.eligibilityMetric,
      activeStatusMetric: plan.settings.activeStatusMetric,
      eligibleListMetric: plan.settings.eligibleListMetric,
      retentionMetric: plan.settings.retentionMetric,
    });
  }, [plan]);

  const onSave = () =>
    withBusy("Saving settings...", async () => {
      await commissionEngineService.saveSettings(plan.id, {
        alwaysEligibleMarkets: textToList(alwaysEligible),
        totalBoxExclude: textToList(boxExclude),
        ...metrics,
      });
      onSaved(await commissionEngineService.getPlan(plan.id));
      toast.success("Settings saved");
    });

  return (
    <Card className="max-w-2xl">
      <CardContent className="grid gap-3 p-4 text-sm">
        <Field label="Markets always eligible (comma list)">
          <Input value={alwaysEligible} onChange={(e) => setAlwaysEligible(e.target.value)} />
        </Field>
        <Field label="Categories not counted in Total BOX (comma list)">
          <Input value={boxExclude} onChange={(e) => setBoxExclude(e.target.value)} />
        </Field>
        <Field label="Eligibility start date metric (a line counts when its date is on or after this date)">
          <Input value={metrics.eligibilityMetric} onChange={(e) => setMetrics({ ...metrics, eligibilityMetric: e.target.value })} />
        </Field>
        <Field label="Active status metric (value ACTIVE)">
          <Input value={metrics.activeStatusMetric} onChange={(e) => setMetrics({ ...metrics, activeStatusMetric: e.target.value })} />
        </Field>
        <Field label="Eligible list metric (NTID present = eligible)">
          <Input value={metrics.eligibleListMetric} onChange={(e) => setMetrics({ ...metrics, eligibleListMetric: e.target.value })} />
        </Field>
        <Field label="Retention metric shown in results">
          <Input value={metrics.retentionMetric} onChange={(e) => setMetrics({ ...metrics, retentionMetric: e.target.value })} />
        </Field>
        <div className="flex justify-end">
          <Button onClick={onSave}>
            <Save className="mr-2 h-4 w-4" />
            Save settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function NewMonthDialog({
  open,
  onOpenChange,
  copyFrom,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  copyFrom: CePlan | null;
  onCreate: (year: number, month: number, copyFromId: number | null) => void;
}) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [copy, setCopy] = useState(true);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New month</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Field label="Year">
            <Input value={year} onChange={(e) => setYear(Number(e.target.value) || year)} />
          </Field>
          <Field label="Month (1-12)">
            <Input value={month} onChange={(e) => setMonth(Number(e.target.value) || month)} />
          </Field>
          {copyFrom && (
            <label className="col-span-2 flex items-center gap-2">
              <Switch checked={copy} onCheckedChange={setCopy} />
              Copy rules, components and metrics from {copyFrom.name}
            </label>
          )}
        </div>
        <DialogFooter>
          <Button onClick={() => onCreate(year, month, copy && copyFrom ? copyFrom.id : null)}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
