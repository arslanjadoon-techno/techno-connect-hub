import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/data-table";
import { Home, ExternalLink, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { housingLeasingService } from "@/services/portals/housing-leasing";
import { housesService } from "@/services/portals/commission";
import { useCanWrite } from "@/lib/housing-leasing-permissions";

// Mirrors the local `House` interface in commission/HousesPage.tsx - the
// @/lib/api/client House type only declares the legacy flat stateName/
// districtName/marketName fields, not the nested state/district/market
// objects the backend actually returns alongside them.
interface House {
  id: number;
  address: string;
  number: string;
  phone: string;
  stateId: number;
  stateName?: string;
  districtId: number;
  districtName?: string;
  marketId: number;
  marketName?: string;
  state?: { id: number; name: string };
  district?: { id: number; name: string };
  market?: { id: number; name: string };
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Lists houses from the pre-existing House registry (/api/houses/*, shared
 * with the Commission portal's Houses page) rather than owning a separate
 * add/edit UI of its own. A house with no Housing lease record yet is
 * flagged "No Lease" - clicking "Manage Lease" still works for it, since
 * HousingLeasingDetailedPage / PostHousingLeasingInfo create the lease row
 * on first save (see that page for details).
 *
 * "Add Property" links out to the Commission portal's Houses page
 * (/commission/houses) instead of embedding a duplicate add-house form here -
 * that page already owns the full State -> District -> Market cascading
 * create/edit flow, and nothing else in this codebase duplicates another
 * portal's registry form inline, so re-implementing it here would just be a
 * second, divergent copy of the same logic.
 */
export default function ManagePropertiesPage() {
  const navigate = useNavigate();
  const canWrite = useCanWrite("housingleasing.show_manage_properties");

  const [houses, setHouses] = useState<House[]>([]);
  const [leasedUnitIds, setLeasedUnitIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [housesRes, leases] = await Promise.all([
        housesService.getAll(),
        housingLeasingService.getAllHousingLeasing({ force: true }),
      ]);
      setHouses(housesRes.success ? housesRes.data : []);
      setLeasedUnitIds(
        new Set(
          leases
            .map((l) => l.unitId)
            .filter((id): id is number => id != null),
        ),
      );
      if (!housesRes.success) {
        toast.error(housesRes.message || "Failed to load houses");
      }
    } catch (error) {
      console.error("Error fetching houses:", error);
      toast.error("Failed to load houses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const unitLabel = (h: House) => h.number || h.address || `#${h.id}`;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return houses;
    return houses.filter((h) =>
      [h.number, h.address, h.phone, h.state?.name ?? h.stateName, h.district?.name ?? h.districtName, h.market?.name ?? h.marketName]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [houses, search]);

  const columns: Column<House>[] = [
    {
      key: "unit",
      header: "Property",
      accessor: (r) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Home className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className="font-medium">{unitLabel(r)}</div>
            <div className="text-xs text-muted-foreground">{r.id}</div>
          </div>
        </div>
      ),
      searchValue: (r) => unitLabel(r),
    },
    { key: "address", header: "Address", accessor: (r) => r.address || "—" },
    {
      key: "state",
      header: "State",
      accessor: (r) => r.state?.name ?? r.stateName ?? "—",
    },
    {
      key: "district",
      header: "District",
      accessor: (r) => r.district?.name ?? r.districtName ?? "—",
    },
    {
      key: "market",
      header: "Market",
      accessor: (r) => r.market?.name ?? r.marketName ?? "—",
    },
    {
      key: "leaseStatus",
      header: "Lease",
      accessor: (r) =>
        leasedUnitIds.has(r.id) ? (
          <Badge
            variant="outline"
            className="border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400"
          >
            Has Lease
          </Badge>
        ) : (
          <Badge variant="outline" className="border-border bg-muted text-muted-foreground">
            No Lease
          </Badge>
        ),
    },
    {
      key: "actions",
      header: "",
      accessor: (r) => (
        <Button
          size="sm"
          variant="outline"
          className="h-7"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/housing-leasing/detail/${r.id}`);
            window.scrollTo(0, 0);
          }}
        >
          Manage Lease <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      ),
    },
  ];

  return (
    <div className="w-full space-y-4 animate-fade-in pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Home className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-xl font-semibold">Manage Properties</h1>
            <p className="text-sm text-muted-foreground">
              Properties available for employee housing leases, sourced from the Houses
              registry
            </p>
          </div>
        </div>
        {canWrite && (
          <Button size="sm" onClick={() => navigate("/commission/houses")}>
            <ExternalLink className="mr-1.5 h-4 w-4" /> Add Property
          </Button>
        )}
      </div>

      <Card className="p-4 flex flex-wrap gap-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by address, phone, market, district..."
          className="h-9 min-w-[260px] flex-1"
        />
      </Card>

      <Card className="p-4">
        {loading ? (
          <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm">Loading properties...</p>
          </div>
        ) : (
          <DataTable<House>
            rows={filtered}
            columns={columns}
            hideSearch
            stickyHeader
            rowKey={(r) => String(r.id)}
            onRowClick={(r) => {
              navigate(`/housing-leasing/detail/${r.id}`);
              window.scrollTo(0, 0);
            }}
          />
        )}
      </Card>
    </div>
  );
}
