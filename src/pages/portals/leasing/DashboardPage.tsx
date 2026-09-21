import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DataTable, type Column } from "@/components/data-table";
import {
  BarChart3,
  AlertTriangle,
  XCircle,
  Building2,
  DollarSign,
  Landmark,
  Receipt,
  PiggyBank,
  Loader2,
} from "lucide-react";
import { leasingService, type LeaseRecord, type TotalRent } from "@/services/portals/leasing";

interface Kpi {
  title: string;
  value: number;
  list: LeaseRecord[] | null;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

function KpiCard({ kpi, onClick }: { kpi: Kpi; onClick: (list: LeaseRecord[] | null, title: string) => void }) {
  const Icon = kpi.icon;
  return (
    <Card
      className={`p-4 border-l-4 transition hover:shadow-md ${kpi.list ? "cursor-pointer" : ""}`}
      style={{ borderLeftColor: kpi.color }}
      onClick={() => onClick(kpi.list, kpi.title)}
    >
      <div className="flex items-start justify-between">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${kpi.color}22`, color: kpi.color }}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="text-2xl font-bold font-display" style={{ color: kpi.color }}>
          {kpi.value}
        </div>
      </div>
      <p className="mt-3 text-sm font-medium text-muted-foreground">{kpi.title}</p>
      {kpi.list && (
        <span className="text-xs font-medium" style={{ color: kpi.color }}>
          View details &rarr;
        </span>
      )}
    </Card>
  );
}

interface FinanceCard {
  title: string;
  amount: number;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value || 0);
}

export default function LeasingDashboardPage() {
  const [leases, setLeases] = useState<LeaseRecord[]>([]);
  const [rentTotals, setRentTotals] = useState<TotalRent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filteredList, setFilteredList] = useState<LeaseRecord[] | null>(null);
  const [filteredTitle, setFilteredTitle] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const [leaseData, rentData] = await Promise.all([
          leasingService.getAllLeasing(),
          leasingService.getMonthlyRentFigure(),
        ]);
        if (active) {
          setLeases(leaseData);
          setRentTotals(rentData);
        }
      } catch (error) {
        console.error("Error loading leasing dashboard:", error);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const kpis = useMemo<Kpi[]>(() => {
    const today = new Date();
    const activeLeases = leases.filter((l) => !l.isDeleted).length;

    const expired = leases.filter((l) => {
      const date = l.expiry_Due || l.createdAt;
      return date && new Date(date) < today;
    });

    const expiringSoon = leases.filter((l) => {
      const date = l.expiry_Due || l.createdAt;
      if (!date) return false;
      const diffDays = (new Date(date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays > 0 && diffDays <= 30;
    });

    const totalMarkets = new Set(leases.map((l) => l.marketName).filter(Boolean)).size;

    return [
      { title: "Active Leases", value: activeLeases, list: null, icon: BarChart3, color: "#0d6efd" },
      { title: "Expiring Soon", value: expiringSoon.length, list: expiringSoon, icon: AlertTriangle, color: "#f59e0b" },
      { title: "Expired", value: expired.length, list: expired, icon: XCircle, color: "#dc3545" },
      { title: "Total Markets", value: totalMarkets, list: null, icon: Building2, color: "#7c3aed" },
    ];
  }, [leases]);

  const financeCards = useMemo<FinanceCard[]>(() => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const match = rentTotals.find(
      (r) => r.month === currentMonth && r.year === String(currentYear),
    );

    return [
      { title: "Rent", amount: match?.total_rent ?? 0, icon: DollarSign, gradient: "linear-gradient(135deg,#3b82f6,#2563eb)" },
      { title: "CAM Charges", amount: match?.total_cam ?? 0, icon: Landmark, gradient: "linear-gradient(135deg,#4ade80,#16a34a)" },
      { title: "Adjustments", amount: match?.total_adjustment ?? 0, icon: Receipt, gradient: "linear-gradient(135deg,#fb923c,#ea580c)" },
      { title: "Total Payment", amount: match?.total_payment ?? 0, icon: PiggyBank, gradient: "linear-gradient(135deg,#8b5cf6,#7c3aed)" },
    ];
  }, [rentTotals]);

  const filteredCols: Column<LeaseRecord>[] = [
    { key: "techId", header: "TECH ID", accessor: (r) => r.techId },
    { key: "storeName", header: "STORE", accessor: (r) => r.storeName ?? "-" },
    { key: "marketName", header: "MARKET", accessor: (r) => r.marketName ?? "-" },
    { key: "expiry", header: "EXPIRY", accessor: (r) => r.expiry_Due ?? "-" },
    { key: "status", header: "STATUS", accessor: (r) => (r.leaseStatus ?? (r.isDeleted ? "Inactive" : "Active")) },
  ];

  if (loading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm">Loading leasing dashboard...</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 animate-fade-in pb-8">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Leasing Overview</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Quick summary of your leasing portfolio performance.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((kpi) => (
          <KpiCard
            key={kpi.title}
            kpi={kpi}
            onClick={(list, title) => {
              if (list) {
                setFilteredList(list);
                setFilteredTitle(title);
              }
            }}
          />
        ))}
      </div>

      <div>
        <h2 className="font-display text-lg font-semibold mb-3">Financial Summary</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {financeCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card
                key={card.title}
                className="relative overflow-hidden p-5 border-0 text-white"
                style={{ backgroundImage: card.gradient }}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white/90">{card.title}</div>
                    <div className="text-xs text-white/70">
                      {new Date().getMonth() + 1}/{new Date().getFullYear()}
                    </div>
                  </div>
                </div>
                <div className="mt-3 text-2xl font-bold font-display">${formatCurrency(card.amount)}</div>
              </Card>
            );
          })}
        </div>
      </div>

      <Dialog open={filteredList !== null} onOpenChange={(open) => !open && setFilteredList(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{filteredTitle}</DialogTitle>
            <DialogDescription>{filteredList?.length ?? 0} lease(s) matching this filter.</DialogDescription>
          </DialogHeader>
          {filteredList && (
            <DataTable<LeaseRecord>
              rows={filteredList}
              columns={filteredCols}
              rowKey={(r) => r.techId}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
