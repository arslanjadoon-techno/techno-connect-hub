import {
  formatCompactNumber,
  formatMoney,
} from "../../../pages/portals/reporting/lib/report-utils";
import type { SummaryDatum } from "../../../pages/portals/reporting/types";
import LoadingIndicator from "./LoadingIndicator";
import ReportPanel from "./ReportPanel";

type LollipopRankChartProps = {
  title: string;
  items?: SummaryDatum[];
  emptyText?: string;
  labelHeader?: string;
  isLoading?: boolean;
};

export default function LollipopRankChart({
  title,
  items,
  emptyText = "No data available for the selected filters.",
  labelHeader = "Market",
  isLoading = false,
}: LollipopRankChartProps) {
  const safeItems = items ?? [];
  const hasTransactions = safeItems.some((item) => item.transactions > 0);
  const maxAmount = safeItems.reduce((max, item) => Math.max(max, item.amount), 1);
  const maxTransactions = safeItems.reduce((max, item) => Math.max(max, item.transactions), 1);
  const columns = hasTransactions ? "grid-cols-[32px_1fr_92px_92px]" : "grid-cols-[32px_1fr_92px]";

  return (
    <ReportPanel title={title} className="overflow-hidden">
      <div className="min-w-0 max-w-full min-h-[360px] overflow-x-auto px-3 pb-5 pt-4 sm:px-4 [&>*]:min-w-[440px] sm:[&>*]:min-w-0">
        <div
          className={`mb-3 grid ${columns} gap-3 border-b border-[#eadcf2] pb-2 text-[10px] font-bold uppercase text-[#6a5a75]`}
        >
          <span>Rank</span>
          <span>{labelHeader}</span>
          <span className="text-right">Amount</span>
          {hasTransactions ? <span className="text-right">Txn</span> : null}
        </div>

        {isLoading ? (
          <div className="h-[285px]">
            <LoadingIndicator label={`Loading ${title}`} size="lg" layout="center" />
          </div>
        ) : safeItems.length === 0 ? (
          <div className="flex h-[285px] items-center justify-center text-sm text-[#7d7283]">
            {emptyText}
          </div>
        ) : (
          <div className="grid max-h-[285px] gap-3 overflow-y-auto pr-1">
            {safeItems.map((item, index) => {
              const amountWidth = Math.max((item.amount / maxAmount) * 100, 3);
              const transactionWidth = Math.max((item.transactions / maxTransactions) * 100, 3);

              return (
                <div
                  key={`${item.label}-${index}`}
                  className={`grid ${columns} items-center gap-3`}
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[#f4ecff] text-[11px] font-bold text-[#7600bc]">
                    {index + 1}
                  </div>

                  <div className="min-w-0">
                    <div className="mb-1 truncate text-[12px] font-bold text-[#3f3548]">
                      {item.label}
                    </div>
                    <div className="h-3 overflow-hidden rounded-sm bg-[#edf2f7]">
                      <div
                        className="h-full rounded-sm bg-primary"
                        style={{ width: `${amountWidth}%` }}
                      />
                    </div>
                    {hasTransactions ? (
                      <div className="mt-1 h-1.5 overflow-hidden rounded-sm bg-[#f5e7ef]">
                        <div
                          className="h-full rounded-sm bg-primary-glow"
                          style={{ width: `${transactionWidth}%` }}
                        />
                      </div>
                    ) : null}
                  </div>

                  <div className="text-right text-[11px] font-bold text-[#3f3548]">
                    {formatMoney(item.amount)}
                  </div>
                  {hasTransactions ? (
                    <div className="text-right text-[11px] font-semibold text-[#6a5a75]">
                      {formatCompactNumber(item.transactions)}
                    </div>
                  ) : null}
                </div>
              );
            })}

            <div className="mt-2 flex items-center gap-5 border-t border-[#eadcf2] pt-3 text-[10px] font-semibold text-[#6a5a75]">
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-6 rounded-sm bg-primary" />
                Amount
              </span>
              {hasTransactions ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-6 rounded-sm bg-primary-glow" />
                  Transactions
                </span>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </ReportPanel>
  );
}
