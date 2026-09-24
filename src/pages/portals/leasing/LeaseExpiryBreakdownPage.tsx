import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Loader2 } from "lucide-react";
import { leasingService, type LeaseRecord } from "@/services/portals/leasing";

interface LeaseWithDaysLeft extends LeaseRecord {
  daysLeft: number;
}

const getDaysLeft = (date: string) => {
  const today = new Date();
  const expiry = new Date(date);
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

const TABS = [
  {
    key: "critical",
    label: "0-30 Days",
    tone: "border-destructive/30 bg-destructive/10 text-destructive",
  },
  {
    key: "high",
    label: "31-90 Days",
    tone: "border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400",
  },
  {
    key: "medium",
    label: "90-180 Days",
    tone: "border-sky-300 bg-sky-50 text-sky-800 dark:bg-sky-950/30 dark:text-sky-400",
  },
  {
    key: "low",
    label: "181-365 Days",
    tone: "border-blue-300 bg-blue-50 text-blue-800 dark:bg-blue-950/30 dark:text-blue-400",
  },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function groupLeases(list: LeaseRecord[]): Record<TabKey, LeaseWithDaysLeft[]> {
  const groups: Record<TabKey, LeaseWithDaysLeft[]> = {
    critical: [],
    high: [],
    medium: [],
    low: [],
  };
  for (const item of list) {
    const date = item.expiry_Due || item.createdAt;
    if (!date) continue;
    const days = getDaysLeft(date);
    if (days < 0 && item.lease_Term?.toLowerCase() === "month to month") continue;
    const lease: LeaseWithDaysLeft = { ...item, daysLeft: days };
    if (days <= 30) groups.critical.push(lease);
    else if (days <= 90) groups.high.push(lease);
    else if (days <= 180) groups.medium.push(lease);
    else if (days <= 365) groups.low.push(lease);
  }
  return groups;
}

export default function LeaseExpiryBreakdownPage() {
  const navigate = useNavigate();
  const [leases, setLeases] = useState<LeaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TabKey>("critical");

  useEffect(() => {
    let active = true;
    leasingService
      .getAllLeasing()
      .then((data) => active && setLeases(data))
      .catch((err) => console.error("LeaseExpiryBreakdownPage:", err))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const groups = useMemo(() => groupLeases(leases), [leases]);
  const selectedList = useMemo(
    () => [...groups[selected]].sort((a, b) => a.daysLeft - b.daysLeft),
    [groups, selected],
  );
  const activeTab = TABS.find((t) => t.key === selected)!;

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-6 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading lease data...</span>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 animate-fade-in pb-8">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <div>
          <h1 className="font-display text-xl font-semibold">Lease Expiry Breakdown</h1>
          <p className="text-xs text-muted-foreground">Next 12 months</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setSelected(tab.key)}
            className={`flex items-center justify-between rounded-lg border-l-4 border bg-card p-3 text-left transition ${
              selected === tab.key ? "ring-1 ring-primary" : ""
            }`}
            style={{ borderLeftColor: undefined }}
          >
            <span className="text-sm font-medium">{tab.label}</span>
            <Badge variant="outline" className={tab.tone}>
              {groups[tab.key].length}
            </Badge>
          </button>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {["Store Name", "Market", "Expiry Date", "Days Left", "Tier", "Action"].map((h) => (
                  <th
                    key={h}
                    className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {selectedList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                    No leases in this category
                  </td>
                </tr>
              ) : (
                selectedList.map((row, i) => (
                  <tr key={i} className="hover:bg-muted/30">
                    <td className="px-3 py-2 capitalize">{row.storeName?.toLowerCase() ?? "—"}</td>
                    <td className="px-3 py-2 capitalize">{row.marketName?.toLowerCase() ?? "—"}</td>
                    <td className="px-3 py-2">
                      {new Date(row.expiry_Due || row.createdAt || "").toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className={activeTab.tone}>
                        {row.daysLeft}d
                      </Badge>
                    </td>
                    <td className="px-3 py-2">{row.tier ?? "—"}</td>
                    <td className="px-3 py-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          navigate(`/leasing/leasing-detail/${row.techId}`);
                          window.scrollTo(0, 0);
                        }}
                      >
                        View &rarr;
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
