import type { RetentionTrendDatum } from "@/services/portals/reporting/retention-api";
import { formatCompactNumber } from "../../../pages/portals/reporting/lib/report-utils";
import LoadingIndicator from "./LoadingIndicator";
import ReportPanel from "./ReportPanel";

type Props = { points: RetentionTrendDatum[]; isLoading?: boolean };
const width = 780;
const height = 320;
const padding = { top: 34, right: 24, bottom: 52, left: 62 };

function compactMoney(value: number) {
  return formatCompactNumber(value);
}

export default function RetentionTrendChart({
  points,
  isLoading = false,
}: Props) {
  const sorted = [...points].sort(
    (a, b) => a.qualificationDay - b.qualificationDay,
  );
  const bars =
    sorted.length > 0
      ? [
          { label: "Activation", value: sorted[0].activationAmount },
          ...sorted.map((point) => ({
            label: String(point.qualificationDay),
            value: point.retentionAmount,
          })),
        ]
      : [];
  const maxValue = Math.max(...bars.map((bar) => bar.value), 1);
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const slotWidth = innerWidth / Math.max(bars.length, 1);
  const barWidth = Math.min(46, slotWidth * 0.72);
  const ticks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <ReportPanel title="Retention Trend" className="overflow-hidden">
      <div className="min-w-0 max-w-full overflow-x-auto px-2 pb-4 pt-2 sm:px-4">
        {isLoading ? (
          <div className="h-[320px]">
            <LoadingIndicator
              label="Loading retention trend"
              size="lg"
              layout="center"
            />
          </div>
        ) : bars.length === 0 ? (
          <div className="flex h-[320px] items-center justify-center text-sm text-[#7d7283]">
            No trend data available for the selected filters.
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="h-[280px] min-w-[620px] sm:h-[320px] sm:min-w-0"
            role="img"
            aria-label="Retention cumulative trend by qualification day"
          >
            {ticks.map((tick) => {
              const y = padding.top + innerHeight - tick * innerHeight;
              return (
                <g key={tick}>
                  <line
                    x1={padding.left}
                    x2={width - padding.right}
                    y1={y}
                    y2={y}
                    stroke="var(--border)"
                    strokeDasharray="5 5"
                  />
                  <text
                    x={padding.left - 10}
                    y={y + 4}
                    textAnchor="end"
                    className="fill-[var(--muted-foreground)] text-[10px]"
                  >
                    {compactMoney(maxValue * tick)}
                  </text>
                </g>
              );
            })}
            {bars.map((bar, index) => {
              const barHeight = (bar.value / maxValue) * innerHeight;
              const x =
                padding.left + index * slotWidth + (slotWidth - barWidth) / 2;
              const y = padding.top + innerHeight - barHeight;
              return (
                <g key={`${bar.label}-${index}`}>
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={Math.max(barHeight, 2)}
                    className={`${index === 0 ? "fill-[var(--primary)]" : "fill-[var(--primary-glow)]"} cursor-pointer transition-opacity hover:opacity-75`}
                  >
                    <title>
                      {bar.label === "Activation"
                        ? "Activation"
                        : `Qualification Day ${bar.label}`}{" "}
                      - {formatCompactNumber(bar.value)}
                    </title>
                  </rect>
                  <text
                    x={x + barWidth / 2}
                    y={Math.max(y - 7, 12)}
                    textAnchor="middle"
                    className="fill-[var(--muted-foreground)] text-[10px]"
                  >
                    {compactMoney(bar.value)}
                  </text>
                  <text
                    x={x + barWidth / 2}
                    y={height - 18}
                    textAnchor="middle"
                    className="fill-[var(--foreground)] text-[10px]"
                  >
                    {bar.label}
                  </text>
                </g>
              );
            })}
            <text
              x={padding.left + innerWidth / 2}
              y={height - 2}
              textAnchor="middle"
              className="fill-[var(--muted-foreground)] text-[11px] font-semibold"
            >
              Days
            </text>
            <text
              x="14"
              y={padding.top + innerHeight / 2}
              textAnchor="middle"
              className="fill-[var(--muted-foreground)] text-[11px] font-semibold"
              transform={`rotate(-90 14 ${padding.top + innerHeight / 2})`}
            >
              Matrix Amount - Cumulative
            </text>
          </svg>
        )}
      </div>
    </ReportPanel>
  );
}
