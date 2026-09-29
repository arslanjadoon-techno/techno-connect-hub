import type { BarDatum } from "../../../pages/portals/reporting/types";
import { formatMoney } from "../../../pages/portals/reporting/lib/report-utils";
import ReportPanel from "./ReportPanel";

type MonthlyChartProps = {
  bars: BarDatum[];
};

export default function MonthlyChart({ bars }: MonthlyChartProps) {
  const maxValue = Math.max(...bars.map((bar) => bar.value), 1);

  return (
    <ReportPanel
      title="Month Wise - Amount"
      className="overflow-hidden rounded-xl "
    >
      <div className="overflow-x-auto">
        <div className="grid h-[310px] min-w-[520px] grid-cols-[70px_1fr] px-5 pt-5 pb-10 sm:min-w-0">
          {/* Y Axis */}
          <div className="flex items-center justify-center">
            <div className="-rotate-90 whitespace-nowrap text-xs font-semibold tracking-wide text-[#6a5a75]">
              PD Amount
            </div>
          </div>

          {/* Chart */}
          <div className="relative border-l border-[#efe7f5] pl-5">
            {/* Horizontal Grid Lines */}
            <div className="absolute inset-0 grid grid-rows-5">
              {[0, 1, 2, 3, 4].map((tick) => (
                <div
                  key={tick}
                  className="border-t border-dashed border-[#efe7f5]"
                />
              ))}
            </div>

            {bars.length === 0 ? (
              <div className="relative z-10 flex h-full items-center justify-center text-sm text-[#7d7283]">
                No data available for the selected filters.
              </div>
            ) : (
              <div className="relative z-10 flex h-full items-end justify-evenly gap-4">
                {bars.map((bar, index) => (
                  <div
                    key={`${bar.label}-${index}`}
                    className="flex w-[52px] flex-col items-center"
                  >
                    {/* Value */}
                    <div className="mb-2 text-[10px] font-semibold text-[#5d5565]">
                      {formatMoney(bar.value)}
                    </div>

                    {/* Bar */}
                    <div className="flex h-[190px] items-end">
                      <div
                        className="w-8 rounded-t-lg shadow-md transition-all duration-700"
                        style={{
                          height: `${Math.max((bar.value / maxValue) * 190, 6)}px`,
                          backgroundImage: "var(--gradient-primary)",
                        }}
                      />
                    </div>

                    {/* Label */}
                    <div className="mt-3 text-[10px] font-medium text-[#5d5565]">
                      {bar.label}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* X Axis */}
            <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-xs font-semibold tracking-wide text-[#6a5a75]">
              Month
            </div>
          </div>
        </div>
      </div>
    </ReportPanel>
  );
}
