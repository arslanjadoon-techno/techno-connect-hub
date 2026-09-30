import { formatCompactNumber, formatLongDate, formatMoney } from "../../../pages/portals/reporting/lib/report-utils";
import type { TransactionRow } from "../../../pages/portals/reporting/types";
import LoadingIndicator from "./LoadingIndicator";
import ReportPanel from "./ReportPanel";
import { Button } from "@/components/ui/button";

type DetailTableProps = {
  rows?: TransactionRow[];
  page: number;
  pageSize: number;
  totalRows: number;
  hasNextPage?: boolean;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
};

const headers = [
  { label: "Market", width: "w-[12%]" },
  { label: "Door Code", width: "w-[13%]" },
  { label: "Store Name", width: "w-[16%]" },
  { label: "Posted Date", width: "w-[18%]" },
  { label: "Transaction Date", width: "w-[20%]" },
  { label: "Program Name", width: "w-[13%]" },
  { label: "Transaction Type", width: "w-[18%]" },
  { label: "Amount", width: "w-[10%]" },
];

export default function DetailTable({
  rows,
  page,
  pageSize,
  totalRows,
  hasNextPage = false,
  isLoading = false,
  onPageChange,
}: DetailTableProps) {
  const safeRows = rows ?? [];
  const knownTotalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const totalPages = hasNextPage ? page + 1 : knownTotalPages;
  const showPagination = page > 1 || hasNextPage || totalRows > pageSize;

  return (
    <ReportPanel title="Detail" className="flex h-[460px] flex-col sm:h-[500px]">
      <div className="relative mx-2 mt-3 flex-1 overflow-hidden rounded-lg border border-[#7600bc] shadow-sm sm:mx-4">
        <div className="h-full overflow-auto">
          <table className="retention-report-table isolate w-full min-w-[920px] border-separate border-spacing-0 text-[11px]">
            <thead className="sticky top-0 z-20">
              <tr
                className="h-9"
                style={{
                  backgroundColor: "var(--primary)",
                  color: "#ffffff",
                }}
              >
                {headers.map((header) => (
                  <th
                    key={header.label}
                    className={`${header.width} sticky top-0 z-30 px-3 text-nowrap text-left font-semibold`}
                    style={{
                      backgroundColor: "var(--primary)",
                      color: "#ffffff",
                    }}
                  >
                    {header.label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {safeRows.map((row, index) => (
                <tr
                  key={`${row.id}-${index}`}
                  className={`text-foreground transition-colors duration-200 hover:bg-primary/10 ${
                    index % 2 === 0 ? "bg-card" : "bg-muted/50"
                  }`}
                >
                  <td className="h-8 border-r border-border px-3">
                    {row.market}
                  </td>
                  <td className="border-r border-border px-3">
                    {row.doorCode}
                  </td>
                  <td className="border-r border-[#e5daf7] px-3">
                    {row.storeName}
                  </td>
                  <td className="border-r border-[#e5daf7] px-3">
                    {formatLongDate(row.postedDate)}
                  </td>
                  <td className="border-r border-[#e5daf7] px-3">
                    {formatLongDate(row.transactionDate)}
                  </td>
                  <td className="border-r border-[#e5daf7] px-3">
                    {row.programName}
                  </td>
                  <td className="border-r border-[#e5daf7] px-3">
                    {row.transactionType}
                  </td>
                  <td className="px-3 text-right font-semibold">
                    {formatMoney(row.amount)}
                  </td>
                </tr>
              ))}

              {safeRows.length === 0 && (
                <tr>
                  <td
                    colSpan={headers.length}
                    className="h-24 bg-card text-center text-sm font-medium text-muted-foreground"
                  >
                    {isLoading ? (
                      <LoadingIndicator
                        label="Loading detail rows"
                        size="md"
                        layout="center"
                      />
                    ) : (
                      "No matching detail rows"
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {isLoading && safeRows.length > 0 ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-[1px]">
            <div className="rounded-lg border border-[#eadcf2] bg-white px-5 py-4 shadow-lg shadow-[#7600bc]/10">
              <LoadingIndicator label={`Loading page ${page}`} size="md" />
            </div>
          </div>
        ) : null}
      </div>

      {showPagination && (
        <div className="mx-2 my-3 flex flex-col gap-2 border-t border-[#e5daf7] pt-3 text-xs sm:mx-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-[#6a5a75]">
            Page {page} of {hasNextPage ? `${page}+` : totalPages} -{" "}
            {formatCompactNumber(totalRows)} rows loaded
          </span>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page === 1 || isLoading}
              className="border-primary px-3 text-primary hover:bg-primary/10 disabled:opacity-70"
            >
              Previous
            </Button>

            <Button
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={isLoading || (!hasNextPage && page === totalPages)}
              className="bg-primary px-3 text-primary-foreground hover:bg-primary/90"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </ReportPanel>
  );
}
