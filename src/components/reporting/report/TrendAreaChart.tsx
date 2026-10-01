import {
  formatCompactNumber,
  formatLongDate,
  formatMoney,
} from "../../../pages/portals/reporting/lib/report-utils";
import type { TrendDatum } from "../../../pages/portals/reporting/types";
import LoadingIndicator from "./LoadingIndicator";
import ReportPanel from "./ReportPanel";

type TrendAreaChartProps = {
  points?: TrendDatum[];
  title?: string;
  isLoading?: boolean;
};

const width = 780;
const height = 300;
const padding = { top: 24, right: 54, bottom: 44, left: 64 };

export default function TrendAreaChart({
  points,
  title = "Posted Date Trend",
  isLoading = false,
}: TrendAreaChartProps) {
  const safePoints = points ?? [];
  const sortedPoints = [...safePoints].sort((a, b) => a.postedDate.localeCompare(b.postedDate));
  const hasTransactions = sortedPoints.some((point) => point.transactions > 0);
  const maxAmount = Math.max(...sortedPoints.map((point) => point.amount), 1);
  const maxTransactions = Math.max(...sortedPoints.map((point) => point.transactions), 1);
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const barGap = 8;
  const barWidth = Math.max(
    8,
    Math.min(34, innerWidth / Math.max(sortedPoints.length, 1) - barGap),
  );

  const coordinates = sortedPoints.map((point, index) => {
    const x =
      padding.left +
      (sortedPoints.length === 1
        ? innerWidth / 2
        : (index / (sortedPoints.length - 1)) * innerWidth);
    const amountHeight = (point.amount / maxAmount) * innerHeight;
    const transactionY =
      padding.top + innerHeight - (point.transactions / maxTransactions) * innerHeight;

    return {
      ...point,
      x,
      amountHeight,
      amountY: padding.top + innerHeight - amountHeight,
      transactionY,
    };
  });

  const transactionPath = hasTransactions
    ? coordinates
        .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.transactionY}`)
        .join(" ")
    : "";
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const labelInterval = Math.max(1, Math.ceil(coordinates.length / 7));

  return (
    <ReportPanel title={title} className="overflow-hidden">
      <div className="min-w-0 max-w-full overflow-x-auto px-2 pb-4 pt-2 sm:px-4">
        {isLoading ? (
          <div className="h-[320px]">
            <LoadingIndicator label={`Loading ${title}`} size="lg" layout="center" />
          </div>
        ) : coordinates.length === 0 ? (
          <div className="flex h-[320px] items-center justify-center text-sm text-[#7d7283]">
            No data available for the selected filters.
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="h-[280px] min-w-[620px] sm:h-[320px] sm:min-w-0"
            role="img"
            aria-label={
              hasTransactions
                ? "Posted date trend by amount and transactions"
                : "Posted date trend by amount"
            }
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
                    className="fill-[#6a5a75] text-[10px]"
                  >
                    {formatMoney(maxAmount * tick)}
                  </text>
                  {hasTransactions ? (
                    <text
                      x={width - padding.right + 10}
                      y={y + 4}
                      textAnchor="start"
                      className="fill-[#6a5a75] text-[10px]"
                    >
                      {formatCompactNumber(Math.round(maxTransactions * tick))}
                    </text>
                  ) : null}
                </g>
              );
            })}

            {coordinates.map((point, index) => (
              <g key={`${point.postedDate}-${index}`}>
                <rect
                  x={point.x - barWidth / 2}
                  y={point.amountY}
                  width={barWidth}
                  height={Math.max(point.amountHeight, 2)}
                  rx="3"
                  className="fill-[var(--primary)]"
                >
                  <title>
                    {formatLongDate(point.postedDate)} - {formatMoney(point.amount)}
                  </title>
                </rect>
                {index % labelInterval === 0 ? (
                  <text
                    x={point.x}
                    y={height - 16}
                    textAnchor="middle"
                    className="fill-[#5d5565] text-[10px]"
                  >
                    {point.postedDate.slice(0, 10).slice(5)}
                  </text>
                ) : null}
              </g>
            ))}

            {hasTransactions ? (
              <path
                d={transactionPath}
                fill="none"
                stroke="var(--primary-glow)"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
              />
            ) : null}

            {hasTransactions
              ? coordinates.map((point, index) => (
                  <circle
                    key={`${point.postedDate}-txn-${index}`}
                    cx={point.x}
                    cy={point.transactionY}
                    r="4"
                    className="fill-[var(--card)] stroke-[var(--primary-glow)]"
                    strokeWidth="2"
                  >
                    <title>
                      {formatLongDate(point.postedDate)} - {formatCompactNumber(point.transactions)}{" "}
                      transactions
                    </title>
                  </circle>
                ))
              : null}

            <text
              x={padding.left - 46}
              y={padding.top + innerHeight / 2}
              className="fill-[#6a5a75] text-[11px] font-semibold"
              transform={`rotate(-90 ${padding.left - 46} ${padding.top + innerHeight / 2})`}
              textAnchor="middle"
            >
              PD Amount
            </text>
            {hasTransactions ? (
              <text
                x={width - 14}
                y={padding.top + innerHeight / 2}
                className="fill-[#6a5a75] text-[11px] font-semibold"
                transform={`rotate(90 ${width - 14} ${padding.top + innerHeight / 2})`}
                textAnchor="middle"
              >
                Transactions
              </text>
            ) : null}
            <text
              x={padding.left + innerWidth / 2}
              y={height - 2}
              className="fill-[#6a5a75] text-[11px] font-semibold"
              textAnchor="middle"
            >
              Posted Date
            </text>

            <g transform={`translate(${padding.left}, 10)`}>
              <rect width="16" height="8" rx="2" className="fill-[var(--primary)]" />
              <text x="22" y="8" className="fill-[#6a5a75] text-[10px]">
                Amount
              </text>
              {hasTransactions ? (
                <>
                  <line
                    x1="82"
                    x2="102"
                    y1="4"
                    y2="4"
                    stroke="var(--primary-glow)"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  <text x="108" y="8" className="fill-[#6a5a75] text-[10px]">
                    Transactions
                  </text>
                </>
              ) : null}
            </g>
          </svg>
        )}
      </div>
    </ReportPanel>
  );
}
