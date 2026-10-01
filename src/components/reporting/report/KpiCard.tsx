import {
  formatCompactNumber,
  formatMoney,
} from "../../../pages/portals/reporting/lib/report-utils";
import type { KpiSummary } from "../../../pages/portals/reporting/types";
import LoadingIndicator from "./LoadingIndicator";
import ReportPanel from "./ReportPanel";

type KpiCardProps = {
  summary?: KpiSummary;
  isLoading?: boolean;
  showTransactions?: boolean;
};

export default function KpiCard({
  summary,
  isLoading = false,
  showTransactions = true,
}: KpiCardProps) {
  const safeSummary = summary ?? { pdAmount: 0, pdTransactions: 0 };

  return (
    <ReportPanel>
      <div className={`grid min-h-[126px] gap-3 p-4 ${showTransactions ? "sm:grid-cols-2" : ""}`}>
        <div className="min-w-0 flex flex-col justify-center rounded-[6px] border border-[#e5daf7] bg-[#fbf8ff] px-3 py-4 sm:px-5">
          <div className="break-words text-[clamp(1.65rem,7vw,2.375rem)] font-light leading-none text-[#7600bc]">
            {isLoading ? (
              <LoadingIndicator label="Loading amount" size="sm" />
            ) : (
              formatMoney(safeSummary.pdAmount)
            )}
          </div>
          <div className="mt-2 text-[12px] font-bold text-[#4a4250]">PD Amount</div>
        </div>

        {showTransactions ? (
          <div className="min-w-0 flex flex-col justify-center rounded-[6px] border border-[#f7c6d8] bg-[#fff8fb] px-3 py-4 sm:px-5">
            <div className="break-words text-[clamp(1.65rem,7vw,2.375rem)] font-light leading-none text-[#c7116a]">
              {isLoading ? (
                <LoadingIndicator label="Loading transactions" size="sm" />
              ) : (
                formatCompactNumber(safeSummary.pdTransactions)
              )}
            </div>
            <div className="mt-2 text-[12px] font-bold text-[#4a4250]">PD Transactions</div>
          </div>
        ) : null}
      </div>
    </ReportPanel>
  );
}
