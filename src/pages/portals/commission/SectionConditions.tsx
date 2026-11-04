import { useEffect, useState } from "react";
import { ChevronsUpDown, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { dailyCommissionFilterService } from "@/services/portals/commission/daily-commission-filter.service";

export type EditableCondition = {
  key: string;
  column: string;
  values: string[];
};

/* One request per column for the whole page */
const valueCache = new Map<string, Promise<string[]>>();
const loadValues = (column: string) => {
  if (!valueCache.has(column))
    valueCache.set(column, dailyCommissionFilterService.getDailyCommissionColumnValues(column));
  return valueCache.get(column)!;
};

let columnsPromise: Promise<string[]> | null = null;
const loadColumns = () => {
  columnsPromise ??= dailyCommissionFilterService.getDailyCommissionConditionColumns();
  return columnsPromise;
};

let keySeed = 0;
export const newConditionKey = () => `c${++keySeed}`;

/* "Which lines?": every column must match, any ticked value of a column matches */
export default function SectionConditions({
  conditions,
  onChange,
}: {
  conditions: EditableCondition[];
  onChange: (conditions: EditableCondition[]) => void;
}) {
  const [columns, setColumns] = useState<string[]>([]);

  useEffect(() => {
    loadColumns()
      .then(setColumns)
      .catch(() => setColumns([]));
  }, []);

  const update = (key: string, patch: Partial<EditableCondition>) =>
    onChange(conditions.map((c) => (c.key === key ? { ...c, ...patch } : c)));

  return (
    <div className="space-y-2 border-b p-3">
      <div className="text-sm font-medium">Which lines?</div>
      {conditions.map((c) => (
        <div key={c.key} className="flex flex-wrap items-center gap-2">
          <ColumnPicker
            columns={columns}
            value={c.column}
            onChange={(column) => update(c.key, { column, values: [] })}
          />
          {c.column && (
            <ValuesPicker
              column={c.column}
              values={c.values}
              onChange={(values) => update(c.key, { values })}
            />
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onChange(conditions.filter((x) => x.key !== c.key))}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        variant="ghost"
        size="sm"
        onClick={() =>
          onChange([...conditions, { key: newConditionKey(), column: "", values: [] }])
        }
      >
        <Plus className="mr-1 h-4 w-4" />
        Add condition
      </Button>
    </div>
  );
}

/* Raw ADR column, picked from a searchable list */
function ColumnPicker({
  columns,
  value,
  onChange,
}: {
  columns: string[];
  value: string;
  onChange: (column: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const term = search.trim().toLowerCase();
  const visible = columns.filter((col) => col.toLowerCase().includes(term));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-8 w-40 items-center gap-1 rounded-md border border-input bg-background px-2 text-left text-xs hover:bg-accent"
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value || "Column"}
          </span>
          <ChevronsUpDown className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 space-y-2 p-2" align="start">
        <Input
          className="h-8"
          placeholder="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="max-h-72 overflow-y-auto text-xs">
          {visible.map((col) => (
            <button
              key={col}
              type="button"
              className={cn(
                "w-full rounded px-2 py-1 text-left hover:bg-accent",
                col === value && "bg-accent font-medium",
              )}
              onClick={() => {
                onChange(col);
                setSearch("");
                setOpen(false);
              }}
            >
              {col}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* Values of the raw ADR column, ticked like an Excel filter */
function ValuesPicker({
  column,
  values,
  onChange,
}: {
  column: string;
  values: string[];
  onChange: (values: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<string[] | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setOptions(null);
    loadValues(column)
      .then(setOptions)
      .catch(() => setOptions([]));
  }, [column]);

  /* Ticked values not in today's data (a new plan code) stay in the list */
  const all = [...new Set([...(options ?? []), ...values])];
  const ticked = new Set(values);
  const term = search.trim().toLowerCase();
  const visible = all.filter((v) => v.toLowerCase().includes(term));
  const allVisibleTicked = visible.length > 0 && visible.every((v) => ticked.has(v));
  const typed = search.trim();

  const toggle = (v: string) => {
    const next = new Set(ticked);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    onChange(all.filter((x) => next.has(x)));
  };

  const toggleVisible = () => {
    const next = new Set(ticked);
    visible.forEach((v) => (allVisibleTicked ? next.delete(v) : next.add(v)));
    onChange(all.filter((x) => next.has(x)));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-8 min-w-48 max-w-96 items-center gap-1 rounded-md border bg-background px-2 text-left text-xs hover:bg-accent",
            values.length === 0 ? "border-destructive" : "border-input",
          )}
        >
          <span className={cn("truncate", values.length === 0 && "text-muted-foreground")}>
            {values.length === 0 ? "Select values" : values.join(", ")}
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
                key={v}
                className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-accent"
              >
                <Checkbox checked={ticked.has(v)} onCheckedChange={() => toggle(v)} />
                <span className="truncate">{v}</span>
              </label>
            ))}
            {typed.length > 0 && !all.some((v) => v.toLowerCase() === typed.toLowerCase()) && (
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded px-1 py-1 text-left hover:bg-accent"
                onClick={() => {
                  onChange([...values, typed]);
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
