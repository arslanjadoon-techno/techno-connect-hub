import type { BarDatum } from "../../../pages/portals/reporting/types";
import { formatMoney } from "../../../pages/portals/reporting/lib/report-utils";
import ReportPanel from "./ReportPanel";

type HorizontalBarChartProps = {
  title: string;
  bars: BarDatum[];
  axisLabel: string;
  height?: string;
};

export default function HorizontalBarChart({ title, bars, axisLabel }: HorizontalBarChartProps) {
  const maxValue = Math.max(...bars.map((bar) => bar.value), 1);

  // Dynamic height based on number of bars
  const chartHeight = Math.max(420, bars.length * 28 + 80);

  return (
    <ReportPanel
      title={title}
      className="relative overflow-hidden rounded-xl border border-[#7600bc] "
    >
      <div className="overflow-x-auto">
        <div
          className="grid min-w-[620px] grid-cols-[105px_1fr] gap-3 px-5 pt-5 pb-14 sm:min-w-0"
          style={{ height: chartHeight }}
        >
          {/* Y Axis */}
          <div className="flex items-center justify-center">
            <div className="-rotate-90 whitespace-nowrap text-xs font-semibold tracking-wide text-[#6a5a75]">
              {axisLabel}
            </div>
          </div>

          <div className="relative">
            {/* Grid Lines */}
            <div className="absolute inset-y-0 left-0 right-6 grid grid-cols-4">
              {[0, 1, 2, 3].map((tick) => (
                <span key={tick} className="border-l border-dashed border-[#efe7f5]" />
              ))}
            </div>

            {/* Bars */}
            <div className="relative space-y-2 pr-6">
              {bars.length === 0 ? (
                <div className="pt-20 text-center text-sm text-[#7d7283]">
                  No data available for the selected filters.
                </div>
              ) : (
                bars.map((bar, index) => (
                  <div
                    key={`${bar.label}-${index}`}
                    className="grid grid-cols-[120px_1fr_80px] items-center gap-3"
                  >
                    <div className="truncate text-right text-[11px] font-medium text-[#544c5b]">
                      {bar.label}
                    </div>

                    <div className="h-4 overflow-hidden rounded-full bg-[#f6edf9]">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.max((bar.value / maxValue) * 100, 2)}%`,
                          backgroundImage: "var(--gradient-primary)",
                        }}
                      />
                    </div>

                    <div className="truncate text-[10px] font-semibold text-[#5d5565]">
                      {formatMoney(bar.value)}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* X-axis Scale */}
            <div className="absolute bottom-6 left-[120px] right-10 flex justify-between text-[10px] text-[#7b7380]">
              <span>$0</span>
              <span>{formatMoney(maxValue / 2)}</span>
              <span>{formatMoney(maxValue)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* X-axis Label */}
      <div className="pb-3 text-center text-xs font-semibold tracking-wide text-[#5d5565]">
        Amount
      </div>
    </ReportPanel>
  );
}
