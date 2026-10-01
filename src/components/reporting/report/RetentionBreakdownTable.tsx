import { formatMoney } from "../../../pages/portals/reporting/lib/report-utils";
import type { RetentionTableRow } from "@/services/portals/reporting/retention-api";
import LoadingIndicator from "./LoadingIndicator";
import ReportPanel from "./ReportPanel";

type Props = { title: string; rows?: RetentionTableRow[]; isLoading?: boolean };

export default function RetentionBreakdownTable({ title, rows, isLoading = false }: Props) {
  const safeRows = rows ?? [];
  const days = Array.from(
    new Set(safeRows.flatMap((row) => Object.keys(row.byQualificationDay))),
  ).sort((a, b) => Number(a) - Number(b));
  const totals = days.reduce<Record<string, number>>((result, day) => {
    result[day] = safeRows.reduce((sum, row) => sum + (row.byQualificationDay[day] ?? 0), 0);
    return result;
  }, {});
  const activationTotal = safeRows.reduce((sum, row) => sum + row.activationAmount, 0);

  return (
    <ReportPanel title={title} className="overflow-hidden">
      <div className="max-h-[420px] overflow-auto p-2 sm:p-3">
        <table className="retention-report-table isolate w-full min-w-[760px] border-separate border-spacing-0 text-[9px] sm:text-[10px]">
          <thead className="relative z-20">
            <tr
              style={{
                backgroundColor: "var(--primary)",
                color: "#ffffff",
              }}
            >
              <th className="sticky left-0 top-0 z-40 min-w-[180px] px-2 py-2 text-left font-semibold">
                {title.replace(" Wise", "")}
              </th>
              <th className="sticky top-0 z-30 min-w-[90px] px-2 py-2 text-right font-semibold">
                Activation
              </th>
              {days.map((day) => (
                <th
                  key={day}
                  className="sticky top-0 z-30 min-w-[70px] px-2 py-2 text-right font-semibold"
                  style={{ backgroundColor: "var(--primary)", color: "#ffffff" }}
                >
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={days.length + 2} className="h-20">
                  <LoadingIndicator label={`Loading ${title}`} size="sm" layout="center" />
                </td>
              </tr>
            ) : null}
            {!isLoading && safeRows.length === 0 ? (
              <tr>
                <td
                  colSpan={days.length + 2}
                  className="h-20 bg-card text-center text-sm text-muted-foreground"
                >
                  No data available for the selected filters.
                </td>
              </tr>
            ) : null}
            {!isLoading &&
              safeRows.map((row, index) => (
                <tr
                  key={`${row.label}-${index}`}
                  className={`${index % 2 === 0 ? "bg-card" : "bg-muted/50"} text-foreground transition-colors hover:bg-primary/10`}
                >
                  <td
                    className={`sticky left-0 z-10 whitespace-nowrap border-r border-border px-2 py-1.5 font-medium text-foreground ${index % 2 === 0 ? "bg-card" : "bg-muted/50"}`}
                  >
                    {row.label}
                  </td>
                  <td className="border-r border-border px-2 py-1.5 text-right tabular-nums">
                    {formatMoney(row.activationAmount)}
                  </td>
                  {days.map((day) => (
                    <td
                      key={day}
                      className="border-r border-border px-2 py-1.5 text-right tabular-nums"
                    >
                      {formatMoney(row.byQualificationDay[day] ?? 0)}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
          {!isLoading && safeRows.length > 0 ? (
            <tfoot>
              <tr className="bg-primary/15 font-bold text-foreground">
                <td className="sticky left-0 z-10 bg-primary/15 px-2 py-2">Total</td>
                <td className="px-2 py-2 text-right tabular-nums">
                  {formatMoney(activationTotal)}
                </td>
                {days.map((day) => (
                  <td key={day} className="px-2 py-2 text-right tabular-nums">
                    {formatMoney(totals[day])}
                  </td>
                ))}
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
    </ReportPanel>
  );
}
