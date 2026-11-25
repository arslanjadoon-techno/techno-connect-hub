import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface ReconDateRangePickerProps {
  value: DateRange | undefined;
  onChange: (range: DateRange | undefined) => void;
  placeholder?: string;
  className?: string;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function subtractDays(date: Date, days: number): Date {
  const next = startOfDay(date);
  next.setDate(next.getDate() - days);
  return next;
}

function formatDateLabel(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ReconDateRangePicker({
  value,
  onChange,
  placeholder = "Filter by date range",
  className,
}: ReconDateRangePickerProps) {
  const [open, setOpen] = useState(false);

  const label = value?.from
    ? value.to && startOfDay(value.to).getTime() !== startOfDay(value.from).getTime()
      ? `${formatDateLabel(value.from)} – ${formatDateLabel(value.to)}`
      : formatDateLabel(value.from)
    : placeholder;

  const applyPreset = (from: Date, to: Date) => {
    onChange({ from: startOfDay(from), to: startOfDay(to) });
    setOpen(false);
  };

  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            "h-9 min-w-[215px] justify-between gap-2 px-3 font-normal transition-colors",
            value?.from
              ? "border-primary/40 bg-primary/5 text-foreground hover:bg-primary/10"
              : "text-muted-foreground hover:text-foreground",
            className,
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            <CalendarIcon
              className={cn(
                "h-4 w-4 shrink-0",
                value?.from ? "text-primary" : "text-muted-foreground",
              )}
            />
            <span className="truncate tabular-nums text-xs sm:text-sm">{label}</span>
          </span>
          {value?.from && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange(undefined);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  onChange(undefined);
                }
              }}
              className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Clear date range"
              title="Clear date range"
            >
              <X className="h-3 w-3" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 shadow-lg" align="start">
        <div className="flex flex-wrap items-center gap-1.5 border-b border-border bg-muted/30 px-3 py-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2.5 text-xs"
            onClick={() => applyPreset(today, today)}
          >
            Today
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2.5 text-xs"
            onClick={() => applyPreset(subtractDays(today, 6), today)}
          >
            Last 7 Days
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2.5 text-xs"
            onClick={() => applyPreset(subtractDays(today, 29), today)}
          >
            Last 30 Days
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2.5 text-xs"
            onClick={() => applyPreset(monthStart, today)}
          >
            This Month
          </Button>
          {value?.from && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="ml-auto h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => {
                onChange(undefined);
                setOpen(false);
              }}
            >
              Clear
            </Button>
          )}
        </div>
        <Calendar
          mode="range"
          numberOfMonths={2}
          selected={value}
          onSelect={onChange}
          initialFocus
          className="pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );
}
