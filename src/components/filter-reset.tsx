import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Stylish reset control shown next to filter rows.
 * Disabled (dimmed) when no filter is currently active.
 */
export function FilterReset({
  onReset,
  active = true,
  className,
  label = "Reset",
}: {
  onReset: () => void;
  active?: boolean;
  className?: string;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onReset}
      disabled={!active}
      className={cn(
        "group inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-xs font-semibold transition-all",
        active
          ? "border-primary/40 bg-primary/10 text-primary hover:-translate-y-0.5 hover:bg-primary hover:text-primary-foreground hover:shadow-[var(--shadow-elegant)]"
          : "cursor-not-allowed border-border bg-muted/40 text-muted-foreground opacity-60",
        className,
      )}
      title="Reset filters"
    >
      <RotateCcw
        className={cn("h-3.5 w-3.5 transition-transform", active && "group-hover:-rotate-180")}
      />
      {label}
    </button>
  );
}
