import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Search,
  Calendar,
  DollarSign,
  ClipboardList,
  MapPin,
  Repeat,
  ExternalLink,
  Loader2,
} from "lucide-react";
import {
  leasingService,
  type LeaseRecord,
  type TotalRentPerTechId,
  type LeaseRentAgreement,
} from "@/services/portals/leasing";

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null;

const fmtCurrency = (v?: number | null) =>
  v != null ? `$${Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : null;

const getDaysLeft = (d?: string | null) =>
  d ? Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;

function QACard({
  icon: Icon,
  question,
  answer,
  highlight,
}: {
  icon: React.ComponentType<{ className?: string }>;
  question: string;
  answer: string | null | undefined;
  highlight?: boolean;
}) {
  const missing = answer == null || answer === "" || answer === "N/A";
  return (
    <div
      className={`flex flex-col gap-1.5 rounded-lg border p-3 ${
        highlight ? "border-primary/30 bg-primary/5" : "border-border bg-card"
      }`}
    >
      <div className="flex items-center gap-1.5 text-primary">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {question}
        </span>
      </div>
      <span className={`text-sm ${missing ? "italic text-muted-foreground" : "font-semibold"}`}>
        {missing ? "Not available" : answer}
      </span>
    </div>
  );
}

function ExpiryBadge({ expiryDate }: { expiryDate?: string | null }) {
  const days = getDaysLeft(expiryDate);
  if (days === null) return null;
  const variant =
    days < 0 || days <= 30
      ? "border-destructive/30 bg-destructive/10 text-destructive"
      : days <= 90
        ? "border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400"
        : "border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400";
  return (
    <Badge variant="outline" className={`text-xs font-semibold ${variant}`}>
      {days < 0 ? "Expired" : `${days}d left`}
    </Badge>
  );
}

export default function LeasingViewPage() {
  const navigate = useNavigate();
  const [allData, setAllData] = useState<LeaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<LeaseRecord | null>(null);
  const [currentRent, setCurrentRent] = useState<TotalRentPerTechId | null>(null);
  const [currentAgreement, setCurrentAgreement] = useState<LeaseRentAgreement | null>(null);
  const [nextAgreement, setNextAgreement] = useState<LeaseRentAgreement | null>(null);
  const [rentLoading, setRentLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setAllData(await leasingService.getAllLeasing());
    } catch {
      setAllData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleLeaseSelect = useCallback(async (lease: LeaseRecord) => {
    setSelected(lease);
    setOpen(false);
    setCurrentRent(null);
    setCurrentAgreement(null);
    setNextAgreement(null);
    if (!lease.techId) return;

    setRentLoading(true);
    const today = new Date();
    try {
      const [billingRows, agreements] = await Promise.all([
        leasingService.getMonthlyRentFigureByTechId(lease.techId),
        leasingService.getLeaseRentAgreementByTechId(lease.techId),
      ]);

      const current =
        billingRows.find((r) => Number(r.year) === today.getFullYear() && Number(r.month) === today.getMonth() + 1) ??
        billingRows[billingRows.length - 1] ??
        null;
      setCurrentRent(current);

      const sorted = agreements
        .filter((a) => a.techId === lease.techId)
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

      const currAgt =
        sorted.find((a) => new Date(a.startDate) <= today && (!a.endDate || new Date(a.endDate) >= today)) ??
        sorted[sorted.length - 1] ??
        null;
      const nextAgt = sorted.find((a) => new Date(a.startDate) > today) ?? null;

      setCurrentAgreement(currAgt);
      setNextAgreement(nextAgt);
    } catch {
      setCurrentRent(null);
      setCurrentAgreement(null);
      setNextAgreement(null);
    } finally {
      setRentLoading(false);
    }
  }, []);

  const options = useMemo(
    () => allData.map((item) => ({ label: `${item.techId} — ${item.storeName || ""}`, lease: item })),
    [allData],
  );

  const d = selected;
  const optionPeriodAnswer =
    d?.optionPeriod === true ? `Yes${d?.optionPeriodDuration ? ` — ${d.optionPeriodDuration}` : ""}` : d?.optionPeriod === false ? "No" : null;
  const relocationAnswer = d?.relocation
    ? ["yes", "true", "1"].includes(String(d.relocation).toLowerCase())
      ? "Yes"
      : d.relocation
    : null;

  return (
    <div className="w-full space-y-4 animate-fade-in pb-8">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Leasing View</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Search by Tech ID or Store Name to get a quick lease summary.
        </p>
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex h-10 w-full max-w-lg items-center gap-2 rounded-md border border-input bg-background px-3 text-sm text-muted-foreground hover:bg-accent"
          >
            <Search className="h-4 w-4 text-primary" />
            {selected ? `${selected.techId} — ${selected.storeName || ""}` : "Search by Tech ID or Store Name..."}
            {loading && <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin" />}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search leases..." />
            <CommandList>
              <CommandEmpty>No leases found.</CommandEmpty>
              <CommandGroup>
                {options.map((opt) => (
                  <CommandItem
                    key={opt.lease.techId}
                    value={opt.label}
                    onSelect={() => handleLeaseSelect(opt.lease)}
                  >
                    {opt.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selected && d && (
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-2 border-b p-4">
            <div>
              <h2 className="text-lg font-bold capitalize">{d.storeName?.toLowerCase() || d.techId}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <Badge variant="outline" className="text-[11px]">{d.techId}</Badge>
                {d.marketName && <Badge variant="outline" className="text-[11px]">{d.marketName}</Badge>}
                {d.tier && <Badge variant="outline" className="text-[11px]">{d.tier}</Badge>}
                <ExpiryBadge expiryDate={d.expiry_Due} />
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                navigate(`/leasing/leasing-detail/${d.techId}`);
                window.scrollTo(0, 0);
              }}
              className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" /> View Full Details
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
            <QACard icon={Calendar} question="Lease Expiration Date" answer={fmtDate(d.expiry_Due)} highlight />
            <QACard icon={Calendar} question="Lease Start Date" answer={fmtDate(d.start_Date)} />
            <QACard icon={ClipboardList} question="Term of the Lease" answer={d.lease_Term} />
            <QACard
              icon={DollarSign}
              question="Security Deposit Amount"
              answer={fmtCurrency(d.securityDeposit ?? d.security_deposit)}
            />
            <QACard icon={Repeat} question="Option Period" answer={optionPeriodAnswer} />
            <QACard icon={Calendar} question="Option Notice Date" answer={fmtDate(d.optionNoticeDate)} />
            <QACard
              icon={DollarSign}
              question="Next Rent Increase Amount"
              answer={rentLoading ? "Loading..." : fmtCurrency(nextAgreement?.monthlyRent)}
            />
            <QACard
              icon={Calendar}
              question="Next Rent Increase Date"
              answer={rentLoading ? "Loading..." : fmtDate(nextAgreement?.startDate)}
            />
            <QACard
              icon={DollarSign}
              question="Current Base Rent"
              answer={rentLoading ? "Loading..." : fmtCurrency(currentRent?.total_rent)}
            />
            <QACard
              icon={DollarSign}
              question="NNN (Triple Net) Amount"
              answer={rentLoading ? "Loading..." : fmtCurrency(currentAgreement?.camCharges)}
            />
            <QACard
              icon={ClipboardList}
              question="Assignment Fees"
              answer={d.assignmentDate ? `Assignment Date: ${fmtDate(d.assignmentDate)}` : null}
            />
            <QACard icon={Repeat} question="Relocation Clause" answer={relocationAnswer} />
            <QACard icon={MapPin} question="Location Address of Leased Property" answer={d.storeName} />
          </div>
        </Card>
      )}

      {!selected && !loading && (
        <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
          <Search className="h-10 w-10 opacity-30" />
          <p className="text-sm">Search for a lease above to view its quick summary.</p>
        </div>
      )}
    </div>
  );
}
