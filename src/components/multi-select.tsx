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

  const selectedLabels = options.filter((o) => value.includes(o.value));

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
          className={`w-full justify-between font-normal h-auto min-h-9 py-1.5 ${className ?? ""}`}
        >
          <div className="flex flex-wrap gap-1 items-center">
            {selectedLabels.length === 0 && (
              <span className="text-muted-foreground text-sm">{placeholder}</span>
            )}
            {selectedLabels.slice(0, 4).map((o) => (
              <Badge key={o.value} variant="secondary" className="gap-1 text-[11px]">
                {o.label}
                <span
                  role="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle(o.value);
                  }}
                  className="hover:text-destructive cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </span>
              </Badge>
            ))}
            {selectedLabels.length > 4 && (
              <Badge variant="secondary" className="text-[11px]">
                +{selectedLabels.length - 4}
              </Badge>
            )}
          </div>
          <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <div className="flex items-center border-b px-2 py-1.5">
          <Search className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search..."
            className="w-full bg-transparent text-xs outline-none"
          />
        </div>
        <div className="max-h-60 overflow-y-auto p-1">
          {filtered.length === 0 && (
            <div className="px-3 py-4 text-center text-xs text-muted-foreground">No options</div>
          )}
          {filtered.map((o) => {
            const checked = value.includes(o.value);
            return (
              <label
                key={o.value}
                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer text-sm"
              >
                <Checkbox checked={checked} onCheckedChange={() => toggle(o.value)} />
                <span className="flex-1 truncate">{o.label}</span>
              </label>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
