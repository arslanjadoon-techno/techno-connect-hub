import { useState, useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronDown, X } from "lucide-react";

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface Props {
  options: MultiSelectOption[];
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Select...",
  disabled,
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const filtered = useMemo(
    () => options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase())),
    [options, q],
  );

  const toggle = (val: string) => {
    if (value.includes(val)) onChange(value.filter((v) => v !== val));
    else onChange([...value, val]);
  };

  // Find labels for all selected values, falling back to value itself if not found
  const selectedItems = useMemo(() => {
    return value.map((val) => {
      const match = options.find((o) => o.value === val);
      return { value: val, label: match?.label || val };
    });
  }, [value, options]);

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQ("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={`w-full justify-between font-normal h-auto min-h-9 py-1.5 px-3 bg-white dark:bg-zinc-950 transition-colors ${className ?? ""}`}
        >
          <div className="flex flex-wrap gap-1 items-center flex-1 mr-2 text-left">
            {selectedItems.length === 0 && (
              <span className="text-muted-foreground text-xs">{placeholder}</span>
            )}
            {selectedItems.slice(0, 3).map((item) => (
              <Badge
                key={item.value}
                variant="secondary"
                className="gap-1 text-[11px] font-medium py-0.5 px-2"
              >
                <span className="truncate max-w-[140px]">{item.label}</span>
                <span
                  role="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle(item.value);
                  }}
                  className="hover:text-destructive cursor-pointer ml-0.5"
                  title="Remove"
                >
                  <X className="h-3 w-3" />
                </span>
              </Badge>
            ))}
            {selectedItems.length > 3 && (
              <Badge variant="secondary" className="text-[11px] py-0.5 px-1.5 font-semibold">
                +{selectedItems.length - 3}
              </Badge>
            )}
          </div>
          <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] min-w-[260px] p-0 shadow-md"
        align="start"
      >
        <div className="flex items-center border-b px-2 py-1.5">
          <Search className="h-3.5 w-3.5 mr-2 text-muted-foreground shrink-0" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search..."
            className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground"
          />
        </div>
        {filtered.length > 1 && (
          <div className="flex items-center justify-between px-2.5 py-1 text-[11px] border-b text-muted-foreground bg-muted/30">
            <button
              type="button"
              onClick={() => {
                const allVals = Array.from(new Set([...value, ...filtered.map((o) => o.value)]));
                onChange(allVals);
              }}
              className="hover:text-primary font-medium transition-colors"
            >
              Select All ({filtered.length})
            </button>
            {value.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const filteredVals = new Set(filtered.map((o) => o.value));
                  onChange(value.filter((v) => !filteredVals.has(v)));
                }}
                className="hover:text-destructive font-medium transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        )}
        <div className="max-h-60 overflow-y-auto p-1">
          {filtered.length === 0 && (
            <div className="px-3 py-4 text-center text-xs text-muted-foreground">
              No options found
            </div>
          )}
          {filtered.map((o) => {
            const checked = value.includes(o.value);
            return (
              <label
                key={o.value}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-accent cursor-pointer text-xs transition-colors"
              >
                <Checkbox checked={checked} onCheckedChange={() => toggle(o.value)} />
                <span className="flex-1 truncate text-foreground">{o.label}</span>
              </label>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
