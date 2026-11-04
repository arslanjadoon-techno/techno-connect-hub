import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
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
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
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
  type CeCondition,
  type CeEmployeeResult,
  type CeField,
  type CeFieldValue,
  type CeFilter,
  type CePlan,
  type CePlanSummary,
  type CeRule,
  type CeRunResult,
  type CeRunSummary,
  type CeType,
  type CeUpload,
} from "@/services/portals/commission/commission-engine.service";

const PAGE_SIZE = 100;
const money = (v: number | null | undefined) => (v ?? 0).toFixed(2);
const day = (v: string | null) => (v ? new Date(v).toLocaleDateString() : "-");

/* "Data till 10/27/2026 · $942,991.70 · run 10/30/2026, 12:10 AM" */
const runLabel = (r: {
  dataTill: string | null;
  tillDate: string | null;
  totalFinal: number;
  createdAt: string;
  employees: number;
}) =>
  `Data till ${day(r.tillDate ?? r.dataTill)}${r.tillDate ? " (till date)" : ""} · $${r.totalFinal.toLocaleString(undefined, { maximumFractionDigits: 2 })} · ${r.employees} emp · run ${new Date(r.createdAt).toLocaleString()}`;

type Option = { value: string; label: string };

/* Rules saved with equals / not equals open as is / is not (same result) */
const LEGACY_OPS: Record<string, string> = { eq: "in", neq: "nin" };

const FIELD_LABELS: Record<string, string> = {
  market: "market (report name)",
  marketid: "market (from file)",
  date: "date",
  mrc_round: "mrc (rounded)",
  sales: "sales (price x qty)",
  net_sales: "net sales (sales - cost)",
};
const fieldLabel = (name: string) => FIELD_LABELS[name.toLowerCase()] ?? name;

/* Distinct values per source+field, loaded once */
const valueCache = new Map<string, Promise<CeFieldValue[]>>();
const loadValues = (source: string, field: string) => {
  const key = `${source}|${field}`;
  if (!valueCache.has(key))
    valueCache.set(key, commissionEngineService.getFieldValues(source, field));
  return valueCache.get(key)!;
};

const RULE_SOURCES: Option[] = [
  { value: "ADR", label: "Activations (ADR)" },
  { value: "SDR", label: "Accessories (SDR)" },
  { value: "MARKET", label: "Market names" },
  { value: "ELIGIBLE", label: "Always eligible markets" },
];

const TYPE_SOURCES: Option[] = [
  { value: "ADR", label: "Activation file (ADR)" },
  { value: "SDR", label: "Accessory file (SDR)" },
];

const BASIS_OPTIONS: Option[] = [
  { value: "NONE", label: "One rate for all" },
  { value: "VALUE", label: "Rate by MRC" },
  { value: "COUNT", label: "Rate by number of lines" },
  { value: "RETENTION_95", label: "Rate by 95 Day Retention %" },
  { value: "FEATURE_RETENTION", label: "Rate by Feature Retention %" },
];

const BASIS_UNIT: Record<string, string> = {
  VALUE: "MRC $",
  COUNT: "lines",
  RETENTION_95: "%",
  FEATURE_RETENTION: "%",
};

const VALUE_FIELDS: Record<string, Option[]> = {
  ADR: [
    { value: "", label: "MRC" },
    { value: "mrc_round", label: "MRC (rounded)" },
  ],
  SDR: [
    { value: "", label: "Sales (price x qty)" },
    { value: "net_sales", label: "Net sales (sales - cost)" },
  ],
};

const REPORT_COLUMNS = [
  "BOX Commission",
  "Acc Commission",
  "VAS Commission",
  "HSI Commission",
  "PROMO10 Commission",
  "Contest",
  "Other Spiff",
  "Write-Ups Chargebacks",
];

const METRIC_UPLOADS = ["FEATURE_RETENTION", "RETENTION_95"];
const AMOUNT_UPLOADS = ["CONTEST", "OTHER_SPIFF", "WRITEUP"];

/* Ready-made groups for commission types */
const CATEGORY_GROUPS: Option[] = [
  { value: "* MRC,!VAS MRC", label: "Activations (5 MRC to 75 MRC)" },
  { value: "Upg *", label: "Upgrades" },
];

/* Excel / comp plan names for the categories */
const CATEGORY_NAMES: Record<string, string> = {
  "VAS MRC": "VAS (Feature revenue)",
  HSI: "HSI (High speed internet)",
  PROMO10: "PROMO10",
  "40L1WEB": "40L1WEB",
  ACC: "Accessories",
  "ACC NET": "Accessories - Colorado (sales minus cost)",
  HINT: "HINT (not paid)",
};

/* Special results a rule can give a line */
const RULE_CATEGORIES: Option[] = [
  { value: "EXCLUDE", label: "Not paid (drop the line)" },
  { value: "{mrc} MRC", label: "MRC activation (5 MRC, 10 MRC ...)" },
  { value: "Upg {mrc}", label: "Upgrade by MRC (Upg 25, Upg 40 ...)" },
];

const splitList = (text: string | null) =>
  (text ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter((x) => x.length > 0);

/* "* MRC,!VAS MRC,PROMO10" -> ["* MRC,!VAS MRC", "PROMO10"] */
const toPicks = (categories: string | null) => {
  let tokens = splitList(categories);
  const picks: string[] = [];
  CATEGORY_GROUPS.forEach((g) => {
    const parts = splitList(g.value);
    if (parts.every((p) => tokens.includes(p))) {
      picks.push(g.value);
      tokens = tokens.filter((t) => !parts.includes(t));
    }
  });
  return [...picks, ...tokens];
};

const uniqueOptions = (values: string[], known: Option[] = []) => {
  const seen = new Set(known.map((o) => o.value.toLowerCase()));
  const extra = values
    .filter((v) => v.length > 0 && !seen.has(v.toLowerCase()) && seen.add(v.toLowerCase()))
    .map((v) => ({ value: v, label: v }));
  return [...known, ...extra];
};

const emptyRule = (source: string, sortOrder: number): CeRule => ({
  id: 0,
  source,
  sortOrder,
  category: source === "ELIGIBLE" ? "YES" : "",
  valueField: null,
  skipEligibility: false,
  conditions: [],
  note: null,
});

const emptyFilter = (): CeFilter => ({
  criteria: null,
  minValue: 0,
  maxValue: 5000,
  commissionPayout: 0,
  payTypeId: 1,
});

const emptyType = (sortOrder: number): CeType => ({
  id: 0,
  name: "",
  source: "ADR",
  categories: "",
  basis: null,
  reportGroup: "",
  sortOrder,
  inGross: true,
  inBox: true,
  filters: [emptyFilter()],
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
            <TabsTrigger value="types">Commission types</TabsTrigger>
            <TabsTrigger value="rules">Rules</TabsTrigger>
            <TabsTrigger value="upload">Upload</TabsTrigger>
          </TabsList>
          <TabsContent value="results" className="space-y-3">
            {runs.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted-foreground">History</span>
                <Select
                  value={run ? String(run.runId) : undefined}
                  onValueChange={(v) => openRun(Number(v))}
                >
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
          <TabsContent value="types">
            <TypesTab plan={plan} run={run} onSaved={setPlan} withBusy={withBusy} />
          </TabsContent>
          <TabsContent value="rules">
            <RulesTab plan={plan} onSaved={setPlan} withBusy={withBusy} />
          </TabsContent>
          <TabsContent value="upload">
            <UploadTab planId={plan.id} withBusy={withBusy} />
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
  const [market, setMarket] = useState("__all");
  const [eligible, setEligible] = useState("__all");
  const [page, setPage] = useState(0);

  const markets = useMemo(
    () => [...new Set((run?.employees ?? []).map((e) => e.market))].sort(),
    [run],
  );

  /* Search, market and eligible filters; the tiles and the export use the same rows */
  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (run?.employees ?? []).filter(
      (e) =>
        (market === "__all" || e.market === market) &&
        (eligible === "__all" || (e.eligible ?? "").toLowerCase() === eligible) &&
        (!term || `${e.market} ${e.ntid} ${e.employeeName ?? ""}`.toLowerCase().includes(term)),
    );
  }, [run, search, market, eligible]);

  if (!run) {
    return (
      <Card className="p-10 text-center text-sm text-muted-foreground">
        No calculation yet for {planName}. Press Run.
      </Card>
    );
  }

  const sum = (get: (e: CeEmployeeResult) => number) =>
    rows.reduce((total, e) => total + (get(e) ?? 0), 0);
  const dollars = (v: number) =>
    `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const totals: { label: string; value: string; strong?: boolean }[] = [
    { label: "Employees", value: rows.length.toLocaleString() },
    { label: "Total BOX", value: sum((e) => e.totalBox).toLocaleString() },
    {
      label: "Upgrades",
      value: sum((e) =>
        Object.entries(e.counts)
          .filter(([k]) => k.toLowerCase().startsWith("upg"))
          .reduce((t, [, v]) => t + v, 0),
      ).toLocaleString(),
    },
    { label: "Acc Sales", value: dollars(sum((e) => e.bases["SDR"] ?? 0)) },
    ...run.groups.map((g) => ({ label: g, value: dollars(sum((e) => e.groups[g] ?? 0)) })),
    { label: "Commission", value: dollars(sum((e) => e.gross)), strong: true },
    {
      label: "Final Commission After Deduction",
      value: dollars(sum((e) => e.final)),
      strong: true,
    },
  ];
  const pageRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));

  const onExport = () => {
    const data = rows.map((e) => {
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
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search market, NTID or name"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="max-w-xs"
          />
          <div className="w-44">
            <Choice
              value={market}
              options={[
                { value: "__all", label: "All markets" },
                ...markets.map((m) => ({ value: m, label: m })),
              ]}
              onChange={(v) => {
                setMarket(v);
                setPage(0);
              }}
            />
          </div>
          <div className="w-36">
            <Choice
              value={eligible}
              options={[
                { value: "__all", label: "All eligible" },
                { value: "yes", label: "Eligible: Yes" },
                { value: "no", label: "Eligible: No" },
              ]}
              onChange={(v) => {
                setEligible(v);
                setPage(0);
              }}
            />
          </div>
        </div>
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

/* Swaps an item with its neighbour and renumbers the list 10, 20, 30 ... */
function moveItem<T extends { key: string; sortOrder: number }>(
  list: T[],
  key: string,
  step: number,
) {
  const ordered = list.slice().sort((a, b) => a.sortOrder - b.sortOrder);
  const index = ordered.findIndex((x) => x.key === key);
  const target = index + step;
  if (index < 0 || target < 0 || target >= ordered.length) return list;
  [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
  const orders = new Map(ordered.map((x, i) => [x.key, (i + 1) * 10]));
  return list.map((x) => (orders.has(x.key) ? { ...x, sortOrder: orders.get(x.key)! } : x));
}

function MoveButtons({ onUp, onDown }: { onUp: () => void; onDown: () => void }) {
  return (
    <div className="flex flex-col">
      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onUp} title="Move up">
        <ArrowUp className="h-3.5 w-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onDown} title="Move down">
        <ArrowDown className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

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
  const [source, setSource] = useState("ADR");

  useEffect(() => {
    setRules(
      plan.rules.map((r) => ({
        ...r,
        key: newKey(),
        conditions: r.conditions.map((c) => ({ ...c, op: LEGACY_OPS[c.op] ?? c.op })),
      })),
    );
  }, [plan]);

  useEffect(() => {
    Promise.all(RULE_SOURCES.map((s) => commissionEngineService.getSourceFields(s.value)))
      .then((list) => setFields(Object.fromEntries(RULE_SOURCES.map((s, i) => [s.value, list[i]]))))
      .catch((e) => toast.error((e as Error).message));
  }, []);

  const update = (key: string, patch: Partial<EditableRule>) =>
    setRules((list) => list.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const shown = rules.filter((r) => r.source === source).sort((a, b) => a.sortOrder - b.sortOrder);
  const isLine = source === "ADR" || source === "SDR";
  const categoryOptions = uniqueOptions(
    rules.filter((r) => r.source === source).map((r) => r.category),
    RULE_CATEGORIES,
  );

  const move = (key: string, step: number) =>
    setRules((list) => {
      const others = list.filter((r) => r.source !== source);
      const moved = moveItem(
        list.filter((r) => r.source === source),
        key,
        step,
      );
      return [...others, ...moved];
    });

  const onSave = () =>
    withBusy("Saving rules...", async () => {
      if (rules.some((r) => !r.category.trim())) {
        toast.error("Every rule needs a result.");
        return;
      }
      const payload = rules.map(({ key: _key, ...r }) => r);
      await commissionEngineService.saveRules(plan.id, payload);
      onSaved(await commissionEngineService.getPlan(plan.id));
      toast.success("Rules saved");
    });

  const help: Record<string, string> = {
    ADR: "Every activation line is checked from top to bottom. The first rule whose conditions all match gives the line its category. Use the arrows to change the order.",
    SDR: "Every accessory line is checked from top to bottom. The first rule whose conditions all match gives the line its category.",
    MARKET:
      "Markets from the file that should show under another name (for example MIAMI as PALM BEACH).",
    ELIGIBLE: "Markets where every active employee is eligible.",
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {RULE_SOURCES.map((s) => (
            <Button
              key={s.value}
              size="sm"
              variant={source === s.value ? "default" : "outline"}
              onClick={() => setSource(s.value)}
            >
              {s.label}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() =>
              setRules((l) => [
                ...l,
                { ...emptyRule(source, (shown.length + 1) * 10), key: newKey() },
              ])
            }
          >
            <Plus className="mr-2 h-4 w-4" />
            Add rule
          </Button>
          <Button onClick={onSave}>
            <Save className="mr-2 h-4 w-4" />
            Save rules
          </Button>
        </div>
      </div>
      <Card className="p-3 text-xs text-muted-foreground">{help[source]}</Card>
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead className="min-w-96">When</TableHead>
                <TableHead className="w-64">
                  {source === "MARKET" ? "Show as market" : isLine ? "Then category" : "Result"}
                </TableHead>
                {isLine && <TableHead className="w-44">Amount from</TableHead>}
                {isLine && <TableHead className="w-28">Pay before start date</TableHead>}
                <TableHead className="min-w-40">Note</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((r) => (
                <TableRow key={r.key}>
                  <TableCell className="p-1">
                    <MoveButtons onUp={() => move(r.key, -1)} onDown={() => move(r.key, 1)} />
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
                    {source === "ELIGIBLE" ? (
                      <span className="text-xs">Always eligible</span>
                    ) : source === "MARKET" ? (
                      <ValuePicker
                        source="ELIGIBLE"
                        field="market"
                        multi={false}
                        value={r.category}
                        onChange={(v) => update(r.key, { category: v.toUpperCase() })}
                      />
                    ) : (
                      <PickList
                        options={categoryOptions}
                        value={r.category ? [r.category] : []}
                        allowNew
                        placeholder="Select category"
                        onChange={(v) => update(r.key, { category: v[0] ?? "" })}
                      />
                    )}
                  </TableCell>
                  {isLine && (
                    <TableCell>
                      <Choice
                        value={r.valueField ?? ""}
                        options={VALUE_FIELDS[source]}
                        onChange={(v) => update(r.key, { valueField: v || null })}
                      />
                    </TableCell>
                  )}
                  {isLine && (
                    <TableCell>
                      <Switch
                        checked={r.skipEligibility}
                        onCheckedChange={(v) => update(r.key, { skipEligibility: v })}
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    <Input
                      className="h-8"
                      value={r.note ?? ""}
                      onChange={(e) => update(r.key, { note: e.target.value || null })}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setRules((l) => l.filter((x) => x.key !== r.key))}
                    >
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

  const kindOf = (field: string) =>
    fields.find((f) => f.name.toLowerCase() === field.toLowerCase())?.kind ?? "text";

  return (
    <div className="space-y-1.5">
      {conditions.length === 0 && <div className="text-xs text-muted-foreground">Every line</div>}
      {conditions.map((c, index) => (
        <div key={index} className="flex flex-wrap items-center gap-1">
          {index > 0 && <span className="text-xs text-muted-foreground">and</span>}
          <Select
            value={c.field || undefined}
            onValueChange={(v) =>
              set(index, { field: v, op: kindOf(v) === "date" ? "between" : "in", value: "" })
            }
          >
            <SelectTrigger className="h-8 w-44">
              <SelectValue placeholder="Column" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {fields.map((f) => (
                <SelectItem key={f.name} value={f.name}>
                  {fieldLabel(f.name)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {c.field &&
            (kindOf(c.field) === "date" ? (
              <DateRange
                value={c.value ?? ""}
                onChange={(value) => set(index, { op: "between", value })}
              />
            ) : (
              <ExcelFilter
                source={source}
                field={c.field}
                op={c.op}
                value={c.value ?? ""}
                onChange={(op, value) => set(index, { op, value })}
              />
            ))}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onChange(conditions.filter((_, i) => i !== index))}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 text-xs"
        onClick={() => onChange([...conditions, { field: "", op: "in", value: "" }])}
      >
        <Plus className="mr-1 h-3.5 w-3.5" />
        Condition
      </Button>
    </div>
  );
}

function DateRange({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [from = "", to = ""] = value.split(",");
  return (
    <div className="flex items-center gap-1">
      <Input
        type="date"
        className="h-8 w-36"
        value={from}
        onChange={(e) => onChange(`${e.target.value},${to}`)}
      />
      <span className="text-xs">to</span>
      <Input
        type="date"
        className="h-8 w-36"
        value={to}
        onChange={(e) => onChange(`${from},${e.target.value}`)}
      />
    </div>
  );
}

/* Is this raw value kept by the condition? (a ticked box in the Excel filter) */
const keeps = (op: string, value: string, raw: string) => {
  const list = splitList(value).map((v) => v.toLowerCase());
  const first = value.trim().toLowerCase();
  const text = raw.trim().toLowerCase();
  switch (op) {
    case "in":
    case "eq":
      return list.includes(text);
    case "nin":
    case "neq":
      return !list.includes(text);
    case "contains":
      return text.includes(first);
    case "ncontains":
      return !text.includes(first);
    case "starts":
      return text.startsWith(first);
    case "ends":
      return text.endsWith(first);
    case "empty":
      return text === "";
    case "nempty":
      return text !== "";
    default:
      return false;
  }
};

const filterSummary = (op: string, value: string) => {
  const values = splitList(value).join(", ");
  switch (op) {
    case "in":
    case "eq":
      return values;
    case "nin":
    case "neq":
      return `All except ${values}`;
    case "contains":
      return `Has "${value}"`;
    case "ncontains":
      return `Does not have "${value}"`;
    case "starts":
      return `Starts with "${value}"`;
    case "ends":
      return `Ends with "${value}"`;
    case "empty":
      return "(blank)";
    case "nempty":
      return "All except (blank)";
    default:
      return `${op} ${value}`;
  }
};

/* Column values with tick boxes, like an Excel filter. What is ticked is saved
   as "is" (few ticked) or "all except" (few unticked) so new values follow the bigger side */
function ExcelFilter({
  source,
  field,
  op,
  value,
  onChange,
}: {
  source: string;
  field: string;
  op: string;
  value: string;
  onChange: (op: string, value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<CeFieldValue[] | null>(null);
  const [extra, setExtra] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => setOptions(null), [source, field]);

  useEffect(() => {
    if (!open || options) return;
    loadValues(source, field)
      .then(setOptions)
      .catch(() => setOptions([]));
  }, [open, options, source, field]);

  const counts = new Map((options ?? []).map((o) => [o.value, o.count]));
  const all = [
    ...new Set([
      ...(options ?? []).map((o) => o.value),
      ...extra,
      ...(op === "in" || op === "eq" ? splitList(value) : []),
    ]),
  ];
  const ticked = new Set(all.filter((v) => keeps(op, value, v)));

  const apply = (next: Set<string>) => {
    const on = all.filter((v) => next.has(v));
    const off = all.filter((v) => !next.has(v));
    if (on.length === 1 && on[0] === "") onChange("empty", "");
    else if (off.length === 1 && off[0] === "") onChange("nempty", "");
    else if (off.length > 0 && off.length < on.length)
      onChange("nin", off.filter((v) => v !== "").join(","));
    else onChange("in", on.filter((v) => v !== "").join(","));
  };

  const toggle = (v: string) => {
    const next = new Set(ticked);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    apply(next);
  };

  const term = search.trim().toLowerCase();
  const visible = all.filter((v) => (v || "(blank)").toLowerCase().includes(term));
  const allVisibleTicked = visible.length > 0 && visible.every((v) => ticked.has(v));
  const toggleVisible = () => {
    const next = new Set(ticked);
    visible.forEach((v) => (allVisibleTicked ? next.delete(v) : next.add(v)));
    apply(next);
  };

  const typed = search.trim();
  const label = value || op === "empty" || op === "nempty" ? filterSummary(op, value) : "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-8 min-w-40 max-w-80 items-center gap-1 rounded-md border border-input bg-background px-2 text-left text-xs hover:bg-accent"
        >
          <span className={cn("truncate", !label && "text-muted-foreground")}>
            {label || "Select values"}
          </span>
          <ChevronsUpDown className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 space-y-2 p-2" align="start">
        <Input
          className="h-8"
          placeholder="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {options == null ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="max-h-72 overflow-y-auto text-xs">
            {visible.length > 0 && (
              <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 font-semibold hover:bg-accent">
                <Checkbox checked={allVisibleTicked} onCheckedChange={toggleVisible} />
                {term ? "(Select all search results)" : "(Select all)"}
              </label>
            )}
            {visible.map((v) => (
              <label
                key={v || "__blank"}
                className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-accent"
              >
                <Checkbox checked={ticked.has(v)} onCheckedChange={() => toggle(v)} />
                <span className="truncate">{v || "(blank)"}</span>
                {counts.has(v) && (
                  <span className="ml-auto text-muted-foreground">
                    {counts.get(v)!.toLocaleString()}
                  </span>
                )}
              </label>
            ))}
            {typed.length > 0 && !all.some((v) => v.toLowerCase() === typed.toLowerCase()) && (
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded px-1 py-1 text-left hover:bg-accent"
                onClick={() => {
                  setExtra((l) => [...l, typed]);
                  const next = new Set(ticked);
                  next.add(typed);
                  const on = [...next].filter((v) => v !== "");
                  onChange("in", op === "in" || op === "eq" ? on.join(",") : typed);
                  setSearch("");
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                Add "{typed}"
              </button>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

/* Values from the raw file, picked like an Excel filter */
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
  const [options, setOptions] = useState<Option[] | null>(null);

  const load = () => {
    if (options) return;
    loadValues(source, field)
      .then((values) =>
        setOptions(
          values.map((v) => ({
            value: v.value,
            label: `${v.value || "(blank)"}  ·  ${v.count.toLocaleString()}`,
          })),
        ),
      )
      .catch(() => setOptions([]));
  };

  useEffect(() => setOptions(null), [source, field]);

  return (
    <PickList
      options={options ?? []}
      loading={options == null}
      onOpen={load}
      value={multi ? splitList(value) : value ? [value] : []}
      multi={multi}
      allowNew
      placeholder="Select value"
      onChange={(v) => onChange(v.join(","))}
    />
  );
}

/* Dropdown with search; multi = check boxes. allowNew lets the user add a value that is not listed */
function PickList({
  options,
  value,
  multi,
  allowNew,
  placeholder,
  loading,
  onOpen,
  onChange,
}: {
  options: Option[];
  value: string[];
  multi?: boolean;
  allowNew?: boolean;
  placeholder?: string;
  loading?: boolean;
  onOpen?: () => void;
  onChange: (value: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const all = uniqueOptions(value, options);
  const labelOf = (v: string) => all.find((o) => o.value === v)?.label.split("  ·  ")[0] ?? v;
  const isPicked = (v: string) => value.some((s) => s.toLowerCase() === v.toLowerCase());

  const pick = (v: string) => {
    if (!multi) {
      onChange([v]);
      setOpen(false);
      return;
    }
    onChange(
      isPicked(v) ? value.filter((s) => s.toLowerCase() !== v.toLowerCase()) : [...value, v],
    );
  };

  const typed = search.trim();
  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) onOpen?.();
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-8 w-full min-w-40 max-w-80 items-center gap-1 rounded-md border border-input bg-background px-2 text-left text-xs hover:bg-accent"
        >
          <span className={cn("truncate", value.length === 0 && "text-muted-foreground")}>
            {value.length > 0 ? value.map(labelOf).join(", ") : (placeholder ?? "Select")}
          </span>
          <ChevronsUpDown className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search..." value={search} onValueChange={setSearch} />
          <CommandList>
            {loading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <CommandEmpty>Nothing found.</CommandEmpty>
                <CommandGroup>
                  {allowNew &&
                    typed.length > 0 &&
                    !all.some((o) => o.value.toLowerCase() === typed.toLowerCase()) && (
                      <CommandItem value={`__typed ${typed}`} onSelect={() => pick(typed)}>
                        <Plus className="mr-2 h-3.5 w-3.5" />
                        Add "{typed}"
                      </CommandItem>
                    )}
                  {all.map((o) => (
                    <CommandItem
                      key={o.value}
                      value={o.label || "(blank)"}
                      onSelect={() => pick(o.value)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-3.5 w-3.5",
                          isPicked(o.value) ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <span className="truncate">{o.label || "(blank)"}</span>
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

type EditableType = CeType & { key: string };

const moveVisibleType = (list: EditableType[], key: string, step: number) => [
  ...list.filter((t) => t.source === "UPLOAD"),
  ...moveItem(
    list.filter((t) => t.source !== "UPLOAD"),
    key,
    step,
  ),
];

function TypesTab({
  plan,
  run,
  onSaved,
  withBusy,
}: {
  plan: CePlan;
  run: CeRunResult | null;
  onSaved: (plan: CePlan) => void;
  withBusy: WithBusy;
}) {
  const [items, setItems] = useState<EditableType[]>([]);
  const [uploadTypes, setUploadTypes] = useState<string[]>([]);

  useEffect(() => {
    setItems(plan.types.map((t) => ({ ...t, key: newKey() })));
  }, [plan]);

  useEffect(() => {
    commissionEngineService
      .getUploads(plan.id)
      .then((list) => setUploadTypes([...new Set(list.map((u) => u.uploadType))]))
      .catch(() => setUploadTypes([]));
  }, [plan.id]);

  /* Categories the rules can give, with their Excel names */
  const categoryOptions = (source: string): Option[] => {
    if (source === "UPLOAD")
      return uniqueOptions(
        uploadTypes.filter((t) => !METRIC_UPLOADS.includes(t)),
        AMOUNT_UPLOADS.map((t) => ({ value: t, label: t })),
      );
    const fromRules = plan.rules
      .filter((r) => r.source === source && r.category !== "EXCLUDE" && !r.category.includes("{"))
      .map((r) => r.category);
    return uniqueOptions(fromRules, source === "ADR" ? CATEGORY_GROUPS : []).map((o) => ({
      ...o,
      label: CATEGORY_NAMES[o.value] ?? o.label,
    }));
  };

  const update = (key: string, patch: Partial<EditableType>) =>
    setItems((list) => list.map((t) => (t.key === key ? { ...t, ...patch } : t)));

  const updateFilter = (key: string, index: number, patch: Partial<CeFilter>) =>
    setItems((list) =>
      list.map((t) =>
        t.key === key
          ? { ...t, filters: t.filters.map((f, i) => (i === index ? { ...f, ...patch } : f)) }
          : t,
      ),
    );

  const num = (v: string) => (v.trim() === "" ? null : Number(v));
  const reportOptions = uniqueOptions(
    items.map((t) => t.reportGroup),
    REPORT_COLUMNS.map((c) => ({ value: c, label: c })),
  );

  const onSave = () =>
    withBusy("Saving commission types...", async () => {
      if (items.some((t) => !t.name.trim() || !t.reportGroup || !t.categories)) {
        toast.error("Every type needs a name, a report column and what it pays.");
        return;
      }
      const payload = items.map(({ key: _key, ...t }) => t);
      await commissionEngineService.saveTypes(plan.id, payload);
      onSaved(await commissionEngineService.getPlan(plan.id));
      toast.success("Commission types saved");
    });

  return (
    <div className="space-y-3">
      <Card className="p-3 text-xs text-muted-foreground">
        Each box is one commission from the comp plan. Pick <b>Commission on</b> (what is paid) and{" "}
        <b>Rate depends on</b>, then fill the rates. <b>$ per line</b> pays a fixed amount for every
        line, <b>% of MRC</b> pays a percent of the line MRC (Sales for accessories).
      </Card>
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() =>
            setItems((l) => [...l, { ...emptyType((l.length + 1) * 10), key: newKey() }])
          }
        >
          <Plus className="mr-2 h-4 w-4" />
          Add type
        </Button>
        <Button onClick={onSave}>
          <Save className="mr-2 h-4 w-4" />
          Save
        </Button>
      </div>
      <div className="grid gap-3 xl:grid-cols-2">
        {/* Contest, spiff and write-ups come from the Upload tab; they stay saved but are not edited here */}
        {items
          .filter((t) => t.source !== "UPLOAD")
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((t) => {
            const basis = t.basis ?? "NONE";
            const unit = BASIS_UNIT[basis];
            const picks = toPicks(t.categories);
            /* "Only for" shows when the type pays on several categories or rows already have one (5 MRC, 10 MRC ...) */
            const criteriaOptions = uniqueOptions(
              t.filters.map((f) => f.criteria ?? ""),
              categoryOptions(t.source).filter((o) => picks.includes(o.value)),
            );
            const showCriteria = picks.length > 1 || t.filters.some((f) => f.criteria);
            return (
              <Card key={t.key}>
                <CardContent className="space-y-3 p-3 text-xs">
                  <div className="flex items-start gap-2">
                    <MoveButtons
                      onUp={() => setItems((l) => moveVisibleType(l, t.key, -1))}
                      onDown={() => setItems((l) => moveVisibleType(l, t.key, 1))}
                    />
                    <div className="grid flex-1 grid-cols-2 gap-2">
                      <Field label="Name">
                        <Input
                          className="h-8"
                          value={t.name}
                          onChange={(e) => update(t.key, { name: e.target.value })}
                        />
                      </Field>
                      <Field label="Excel column">
                        <PickList
                          options={reportOptions}
                          value={t.reportGroup ? [t.reportGroup] : []}
                          allowNew
                          placeholder="Select column"
                          onChange={(v) => update(t.key, { reportGroup: v[0] ?? "" })}
                        />
                      </Field>
                      <Field label="File">
                        <Choice
                          value={t.source}
                          options={TYPE_SOURCES}
                          onChange={(v) => update(t.key, { source: v, categories: "" })}
                        />
                      </Field>
                      <Field label={t.source === "UPLOAD" ? "Uploaded file type" : "Commission on"}>
                        <PickList
                          options={categoryOptions(t.source)}
                          value={picks}
                          multi
                          allowNew={t.source === "UPLOAD"}
                          placeholder="Select"
                          onChange={(v) => update(t.key, { categories: v.join(",") })}
                        />
                      </Field>
                      {t.source !== "UPLOAD" && (
                        <Field label="Rate depends on">
                          <Choice
                            value={basis}
                            options={BASIS_OPTIONS}
                            onChange={(v) => update(t.key, { basis: v === "NONE" ? null : v })}
                          />
                        </Field>
                      )}
                    </div>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        {unit && <TableHead className="h-8">From ({unit})</TableHead>}
                        {unit && <TableHead className="h-8">To ({unit})</TableHead>}
                        <TableHead className="h-8">Rate</TableHead>
                        <TableHead className="h-8">Pay as</TableHead>
                        {showCriteria && <TableHead className="h-8">Only for</TableHead>}
                        <TableHead className="h-8 w-8" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {t.filters.map((f, i) => (
                        <TableRow key={i}>
                          {unit && (
                            <TableCell className="p-1">
                              <Input
                                className="h-8 w-20"
                                value={f.minValue ?? ""}
                                onChange={(e) =>
                                  updateFilter(t.key, i, { minValue: num(e.target.value) })
                                }
                              />
                            </TableCell>
                          )}
                          {unit && (
                            <TableCell className="p-1">
                              <Input
                                className="h-8 w-20"
                                value={f.maxValue ?? ""}
                                onChange={(e) =>
                                  updateFilter(t.key, i, { maxValue: num(e.target.value) })
                                }
                              />
                            </TableCell>
                          )}
                          <TableCell className="p-1">
                            <Input
                              className="h-8 w-20"
                              value={f.commissionPayout}
                              onChange={(e) =>
                                updateFilter(t.key, i, {
                                  commissionPayout: Number(e.target.value) || 0,
                                })
                              }
                            />
                          </TableCell>
                          <TableCell className="p-1">
                            <Choice
                              value={String(f.payTypeId)}
                              options={[
                                { value: "1", label: "$ per line" },
                                {
                                  value: "2",
                                  label: t.source === "SDR" ? "% of Sales" : "% of MRC",
                                },
                              ]}
                              onChange={(v) => updateFilter(t.key, i, { payTypeId: Number(v) })}
                            />
                          </TableCell>
                          {showCriteria && (
                            <TableCell className="p-1">
                              <Choice
                                value={f.criteria ?? "__all"}
                                options={[{ value: "__all", label: "All" }, ...criteriaOptions]}
                                onChange={(v) =>
                                  updateFilter(t.key, i, { criteria: v === "__all" ? null : v })
                                }
                              />
                            </TableCell>
                          )}
                          <TableCell className="p-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() =>
                                update(t.key, { filters: t.filters.filter((_, x) => x !== i) })
                              }
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => update(t.key, { filters: [...t.filters, emptyFilter()] })}
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Add row
                    </Button>
                    <div className="flex flex-wrap items-center gap-4">
                      <label className="flex items-center gap-2">
                        <Switch
                          checked={t.inGross}
                          onCheckedChange={(v) => update(t.key, { inGross: v })}
                        />
                        Add to Commission
                      </label>
                      <label className="flex items-center gap-2">
                        <Switch
                          checked={t.inBox}
                          onCheckedChange={(v) => update(t.key, { inBox: v })}
                        />
                        Count in Total BOX
                      </label>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setItems((l) => l.filter((x) => x.key !== t.key))}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
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

function Choice({
  value,
  options,
  onChange,
}: {
  value: string;
  options: Option[];
  onChange: (v: string) => void;
}) {
  return (
    <Select
      value={value === "" ? "__empty" : value}
      onValueChange={(v) => onChange(v === "__empty" ? "" : v)}
    >
      <SelectTrigger className="h-8">
        <SelectValue placeholder="-" />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value || "__empty"} value={o.value || "__empty"}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function UploadTab({ planId, withBusy }: { planId: number; withBusy: WithBusy }) {
  const [uploads, setUploads] = useState<CeUpload[]>([]);
  const [uploadType, setUploadType] = useState("FEATURE_RETENTION");
  const [filter, setFilter] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setUploads(await commissionEngineService.getUploads(planId));
  }, [planId]);

  useEffect(() => {
    load().catch((e) => toast.error((e as Error).message));
  }, [load]);

  const totals = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    uploads.forEach((u) => {
      const t = map.get(u.uploadType) ?? { count: 0, total: 0 };
      map.set(u.uploadType, { count: t.count + 1, total: t.total + u.value });
    });
    return [...map.entries()];
  }, [uploads]);

  const typeOptions = uniqueOptions(
    totals.map(([type]) => type),
    [
      { value: "FEATURE_RETENTION", label: "FEATURE_RETENTION (feature retention per NTID)" },
      { value: "RETENTION_95", label: "RETENTION_95 (95 day retention per NTID)" },
      { value: "CONTEST", label: "CONTEST (amount per NTID)" },
      { value: "OTHER_SPIFF", label: "OTHER_SPIFF (amount per NTID)" },
      { value: "WRITEUP", label: "WRITEUP (chargeback amount per NTID)" },
    ],
  );

  const onUpload = (file: File) =>
    withBusy("Uploading...", async () => {
      toast.success(await commissionEngineService.uploadFile(planId, uploadType.trim(), file));
      await load();
    });

  const shown = uploads.filter((u) => !filter || u.uploadType === filter);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="font-semibold">Upload a file for this month</div>
          <p className="text-xs text-muted-foreground">
            Excel / CSV with an <b>NTID</b> column and a <b>Value</b> (or Amount) column. Market and
            Note are optional. A new file replaces the same type for this month. Retention files
            replace the bot data.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-80">
              <PickList
                options={typeOptions}
                value={uploadType ? [uploadType] : []}
                allowNew
                placeholder="Select file type"
                onChange={(v) => setUploadType((v[0] ?? "").toUpperCase())}
              />
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onUpload(f);
                e.target.value = "";
              }}
            />
            <Button
              variant="outline"
              onClick={() => fileRef.current?.click()}
              disabled={!uploadType.trim()}
            >
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
              {totals.map(([type, t]) => (
                <TableRow
                  key={type}
                  className={cn("cursor-pointer", filter === type && "bg-muted")}
                  onClick={() => setFilter(filter === type ? null : type)}
                >
                  <TableCell>{type}</TableCell>
                  <TableCell className="text-right">{t.count}</TableCell>
                  <TableCell className="text-right">{money(t.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-2 p-4">
          <div className="font-semibold">{filter ?? "All uploads"}</div>
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableBody>
                {shown.slice(0, 300).map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="text-xs">{u.uploadType}</TableCell>
                    <TableCell className="text-xs">{u.ntid}</TableCell>
                    <TableCell className="text-xs">{u.market}</TableCell>
                    <TableCell className="text-right text-xs">{u.value}</TableCell>
                    <TableCell className="w-10">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() =>
                          withBusy("Deleting...", async () => {
                            await commissionEngineService.deleteUpload(planId, u.id);
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
            <div className="col-span-2 text-xs text-muted-foreground">
              Commission types, rows and rules are copied from {copyFrom.name}. Change them after
              creating.
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            disabled={!copyFrom}
            onClick={() => onCreate(year, month, copyFrom ? copyFrom.id : null)}
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
