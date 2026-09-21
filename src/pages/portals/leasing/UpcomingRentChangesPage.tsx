import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Download, TrendingUp, TrendingDown, Minus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { leasingService, type UpcomingRentChange } from "@/services/portals/leasing";

interface Row extends UpcomingRentChange {
  curTotal: number;
  newTotal: number;
  diff: number;
  pct: number | null;
}

const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const nextMonthName = () => {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toLocaleString("en-US", { month: "long", year: "numeric" });
};

const total = (r: UpcomingRentChange, prefix: "current" | "new") =>
  (prefix === "current"
    ? (r.currentMonthlyRent ?? 0) + (r.currentCamCharges ?? 0) + (r.currentOtherCharges ?? 0)
    : (r.newMonthlyRent ?? 0) + (r.newCamCharges ?? 0) + (r.newOtherCharges ?? 0));

export default function UpcomingRentChangesPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<UpcomingRentChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    leasingService
      .getUpcomingRentChanges()
      .then(setData)
      .catch((err) => console.error("UpcomingRentChanges:", err))
      .finally(() => setLoading(false));
  }, []);

  const rows = useMemo<Row[]>(() => {
    const q = search.toLowerCase().trim();
    return data
      .map((r) => {
        const curTotal = total(r, "current");
        const newTotal = total(r, "new");
        const diff = newTotal - curTotal;
        const pct = curTotal > 0 ? Number(((diff / curTotal) * 100).toFixed(1)) : null;
        return { ...r, curTotal, newTotal, diff, pct };
      })
      .filter(
        (r) =>
          !q ||
          r.storeName?.toLowerCase().includes(q) ||
          r.techId?.toLowerCase().includes(q) ||
          r.marketName?.toLowerCase().includes(q),
      );
  }, [data, search]);

  const goToLease = (techId?: string | null) => {
    if (!techId) return;
    navigate(`/leasing/leasing-detail/${techId}`);
    window.scrollTo(0, 0);
  };

  return (
    <div className="w-full space-y-4 animate-fade-in pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Rent Changes &mdash; {nextMonthName()}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {loading ? "Loading..." : `${data.length} store${data.length !== 1 ? "s" : ""} with rent changes effective next month`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search store, market, ID..."
              className="h-9 w-64 pl-8"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.message("Excel export coming soon for this page.")}
          >
            <Download className="mr-1.5 h-4 w-4" /> Export Excel
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {["Store", "Tech ID", "Market", "Tier", "Current Total", "New Total", "Change", "Change %", "Effective Date", ""].map((h) => (
                  <th key={h} className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={10} className="py-12 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" /></td></tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-sm text-muted-foreground">
                    {data.length === 0 ? `No rent changes scheduled for ${nextMonthName()}` : "No results match your search"}
                  </td>
                </tr>
              ) : (
                rows.map((r, i) => {
                  const isUp = r.diff > 0;
                  const isDown = r.diff < 0;
                  const Icon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;
                  const tone = isUp
                    ? "border-destructive/30 bg-destructive/10 text-destructive"
                    : isDown
                      ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400"
                      : "border-border bg-muted text-muted-foreground";
                  return (
                    <tr key={i} className="cursor-pointer whitespace-nowrap hover:bg-muted/30" onClick={() => goToLease(r.techId)}>
                      <td className="px-3 py-2 capitalize">{r.storeName?.toLowerCase() ?? "—"}</td>
                      <td className="px-3 py-2 font-medium">{r.techId}</td>
                      <td className="px-3 py-2 capitalize">{r.marketName?.toLowerCase() ?? "—"}</td>
                      <td className="px-3 py-2">{r.tier ?? "—"}</td>
                      <td className="px-3 py-2">${fmt(r.curTotal)}</td>
                      <td className="px-3 py-2 font-semibold">${fmt(r.newTotal)}</td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className={`gap-1 ${tone}`}>
                          <Icon className="h-3 w-3" /> ${fmt(Math.abs(r.diff))}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className={tone}>
                          {r.pct !== null ? `${isUp ? "+" : ""}${r.pct}%` : "N/A"}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{fmtDate(r.effectiveDate)}</td>
                      <td className="px-3 py-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            goToLease(r.techId);
                          }}
                        >
                          View &rarr;
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {rows.length > 0 && (
          <p className="border-t px-3 py-2 text-xs text-muted-foreground">
            Showing {rows.length} of {data.length} stores
          </p>
        )}
      </Card>
    </div>
  );
}
