import { ChartColumn, Filter, RotateCcw, X } from "lucide-react";
import type { Filters } from "../../../pages/portals/reporting/types";
import DateRangeFilter from "./DateRangeFilter";
import MarketStoreFilter from "./MarketStoreFilter";
import SelectFilter from "../dashboard/SelectFilter";
import { Button } from "@/components/ui/button";

type FilterPanelProps = {
  title?: string;
  filters: Filters;
  markets: string[];
  storesByMarket: Record<string, string[]>;
  programs: string[];
  transactionTypes: string[];
  compTypes: string[];
  disputes: string[];
  resultCount: number;
  showProgramFilter?: boolean;
  showTransactionTypeFilter?: boolean;
  showCompTypeFilter?: boolean;
  showDisputeFilter?: boolean;
  showResultCount?: boolean;
  compTypeLabel?: string;
  onChange: (filters: Filters) => void;
  onApply: () => void;
  onReset: () => void;
  onClose: () => void;
};

export default function FilterPanel({
  title = "Filters",
  filters,
  markets,
  storesByMarket,
  programs,
  transactionTypes,
  compTypes,
  disputes,
  resultCount,
  showProgramFilter = true,
  showTransactionTypeFilter = true,
  showCompTypeFilter = true,
  showDisputeFilter = true,
  showResultCount = true,
  compTypeLabel = "Comp Type",
  onChange,
  onApply,
  onReset,
  onClose,
}: FilterPanelProps) {
  function updateFilter<Key extends keyof Filters>(key: Key, value: Filters[Key]) {
    onChange({ ...filters, [key]: value });
  }

  function updateMarketStoreFilters(markets: string[], stores: string[]) {
    onChange({ ...filters, markets, stores });
  }

  return (
    <aside className="flex w-full min-w-0 shrink-0 flex-col rounded-lg border-2 border-[#7600bc] bg-[#fbfbfb] p-2 shadow-[0_0_0_1px_#ffd1e5_inset] xl:sticky xl:top-[58px] xl:max-h-[calc(100vh-70px)] xl:w-[260px] xl:overflow-hidden">
      <div
        className="mb-3 flex h-10 shrink-0 items-center justify-between rounded-md px-3 shadow-md"
        style={{ backgroundImage: "var(--gradient-primary)" }}
      >
        <h2 className="text-xs font-semibold tracking-wide text-white">{title}</h2>

        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            onClick={onReset}
            className="
            cursor-pointer
            inline-flex
            h-7
            items-center
            gap-1.5
            rounded-[6px]
            border border-white/30
            bg-white/15
            px-2.5
            text-[11px]
            font-semibold
            text-white
            backdrop-blur-md
            shadow-[inset_0_1px_1px_rgba(255,255,255,0.35),0_2px_8px_rgba(0,0,0,0.18)]
            transition-all
            duration-200
            hover:bg-white/20
            hover:border-white/50
            hover:shadow-[inset_0_1px_2px_rgba(255,255,255,0.45),0_4px_12px_rgba(0,0,0,0.22)]
            active:scale-95
            active:bg-white/10
            
          "
            title="Reset filters"
          >
            <RotateCcw size={12} />
            Reset
          </Button>

          <Button
            type="button"
            onClick={onClose}
            className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-[6px] border border-white/30 bg-white/15 text-white transition hover:bg-white/25"
            title="Hide filters"
            aria-label="Hide filters"
          >
            <X size={14} />
          </Button>
        </div>
      </div>

      {showResultCount ? (
        <div className="mb-3 flex items-center gap-2 rounded-md border border-[#7600bc] bg-white px-3 py-2 text-[11px] font-medium text-[#4a4250] shadow-sm">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#f5e8ff]">
            <ChartColumn size={14} className="text-[#7600bc]" />
          </div>

          <span>
            Showing <span className="font-bold text-[#7600bc]">{resultCount}</span> rows
          </span>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="grid gap-3 sm:grid-cols-2 sm:[&>*:last-child]:col-span-2 xl:flex xl:flex-col xl:[&>*:last-child]:col-span-1">
          <DateRangeFilter
            label="Posted Date"
            start={filters.postedStart}
            end={filters.postedEnd}
            onStartChange={(value) => updateFilter("postedStart", value)}
            onEndChange={(value) => updateFilter("postedEnd", value)}
          />

          <DateRangeFilter
            label="Transaction Date"
            start={filters.transactionStart}
            end={filters.transactionEnd}
            onStartChange={(value) => updateFilter("transactionStart", value)}
            onEndChange={(value) => updateFilter("transactionEnd", value)}
          />

          {showProgramFilter ? (
            <SelectFilter
              label="Program Name"
              value={filters.programName}
              options={programs}
              onChange={(value) => updateFilter("programName", value)}
            />
          ) : null}

          {showTransactionTypeFilter ? (
            <SelectFilter
              label="Transaction Type"
              value={filters.transactionType}
              options={transactionTypes}
              onChange={(value) => updateFilter("transactionType", value)}
            />
          ) : null}

          {showCompTypeFilter ? (
            <SelectFilter
              label={compTypeLabel}
              value={filters.compType}
              options={compTypes}
              onChange={(value) => updateFilter("compType", value)}
            />
          ) : null}

          {showDisputeFilter ? (
            <SelectFilter
              label="Dispute"
              value={filters.dispute}
              options={disputes}
              onChange={(value) => updateFilter("dispute", value)}
            />
          ) : null}

          <MarketStoreFilter
            markets={markets}
            storesByMarket={storesByMarket}
            selectedMarkets={filters.markets}
            selectedStores={filters.stores}
            onMarketsChange={(value) => updateFilter("markets", value)}
            onStoresChange={(value) => updateFilter("stores", value)}
            onSelectionChange={updateMarketStoreFilters}
          />
        </div>
      </div>

      <Button
        type="button"
        onClick={onApply}
        className="mt-3 inline-flex h-10 w-full shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md px-4 text-xs font-bold text-white shadow-md transition hover:brightness-110 active:scale-[0.98]"
        style={{ backgroundImage: "var(--gradient-primary)" }}
      >
        <Filter size={14} />
        Apply Filter
      </Button>
    </aside>
  );
}
