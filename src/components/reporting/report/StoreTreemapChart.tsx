import {
  formatCompactNumber,
  formatMoney,
} from "../../../pages/portals/reporting/lib/report-utils";
import type { SummaryDatum } from "../../../pages/portals/reporting/types";
import LoadingIndicator from "./LoadingIndicator";
import ReportPanel from "./ReportPanel";

type StoreTreemapChartProps = {
  items?: SummaryDatum[];
  isLoading?: boolean;
};

export default function StoreTreemapChart({ items, isLoading = false }: StoreTreemapChartProps) {
  const safeItems = items ?? [];
  const hasTransactions = safeItems.some((item) => item.transactions > 0);
  const maxAmount = safeItems.reduce((max, item) => Math.max(max, item.amount), 1);
  const columns = hasTransactions ? "grid-cols-[1fr_86px_76px_76px]" : "grid-cols-[1fr_92px_76px]";

  return (
    <ReportPanel title="Store Wise PD Compensation" className="overflow-hidden">
      <div className="min-w-0 max-w-full min-h-[360px] overflow-x-auto px-3 pb-5 pt-4 sm:px-4 [&>*]:min-w-[400px] sm:[&>*]:min-w-0">
        <div
          className={`mb-3 grid ${columns} gap-3 border-b border-border pb-2 text-[10px] font-bold uppercase text-muted-foreground`}
        >
          <span>Store</span>
          <span className="text-right">Amount</span>
          {/* <span className="text-right">Share</span> */}
          {hasTransactions ? <span className="text-right">Avg / Txn</span> : null}
        </div>

        {isLoading ? (
          <div className="h-[285px]">
            <LoadingIndicator
              label="Loading Store Wise PD Compensation"
              size="lg"
              layout="center"
            />
          </div>
        ) : safeItems.length === 0 ? (
          <div className="flex h-[285px] items-center justify-center text-sm text-[#7d7283]">
            No data available for the selected filters.
          </div>
        ) : (
          <div className="grid max-h-[285px] gap-3 overflow-y-auto pr-1">
            {safeItems.map((item, index) => {
              const amountWidth = Math.max((item.amount / maxAmount) * 100, 3);

              const average = item.amount / Math.max(item.transactions, 1);

              return (
                <div
                  key={`${item.label}-${index}`}
                  className={`grid ${columns} items-center gap-3`}
                >
                  <div className="min-w-0">
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <span className="truncate text-[12px] font-bold text-[#3f3548]">
                        {item.label}
                      </span>
                      {hasTransactions ? (
                        <span className="shrink-0 text-[10px] font-semibold text-[#6a5a75]">
                          {formatCompactNumber(item.transactions)} txn
                        </span>
                      ) : null}
                    </div>
                    <div className="h-3 overflow-hidden rounded-sm bg-muted">
                      <div
                        className="h-full rounded-sm bg-primary"
                        style={{ width: `${amountWidth}%` }}
                      />
                    </div>
                  </div>

                  <div className="text-right text-[11px] font-bold text-[#3f3548]">
                    {formatMoney(item.amount)}
                  </div>
                  {/* <div className="text-right text-[11px] font-semibold text-[#6a5a75]">
                    {share.toFixed(1)}%
                  </div> */}
                  {hasTransactions ? (
                    <div className="text-right text-[11px] font-semibold text-[#6a5a75]">
                      {formatMoney(average)}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ReportPanel>
  );
}
