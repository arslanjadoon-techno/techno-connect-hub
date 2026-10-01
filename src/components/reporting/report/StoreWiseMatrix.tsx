import { formatMoney } from "../../../pages/portals/reporting/lib/report-utils";
import type { MatrixDatum } from "../../../pages/portals/reporting/types";
import LoadingIndicator from "./LoadingIndicator";
import ReportPanel from "./ReportPanel";

type StoreWiseMatrixProps = {
  items?: MatrixDatum[];
  isLoading?: boolean;
};

export default function StoreWiseMatrix({ items, isLoading = false }: StoreWiseMatrixProps) {
  const safeItems = items ?? [];
  const stores = Array.from(new Set(safeItems.map((item) => item.store))).sort();
  const transactionTypes = Array.from(
    new Set(safeItems.map((item) => item.transactionType)),
  ).sort();
  const amounts = new Map(
    safeItems.map((item) => [`${item.transactionType}\u0000${item.store}`, item.amount]),
  );
  const storeTotals = new Map<string, number>();
  const transactionTotals = new Map<string, number>();

  safeItems.forEach((item) => {
    storeTotals.set(item.store, (storeTotals.get(item.store) ?? 0) + item.amount);
    transactionTotals.set(
      item.transactionType,
      (transactionTotals.get(item.transactionType) ?? 0) + item.amount,
    );
  });

  return (
    <ReportPanel title="Store Wise PD Matrix" className="overflow-hidden">
      {isLoading ? (
        <div className="h-[240px]">
          <LoadingIndicator label="Loading Store Wise PD Matrix" size="lg" layout="center" />
        </div>
      ) : safeItems.length === 0 ? (
        <div className="p-8 text-center text-sm text-[#6a5a75]">
          No matrix data found for the applied filters.
        </div>
      ) : (
        <div className="max-h-[620px] overflow-auto">
          <table className="isolate min-w-max border-separate border-spacing-0 text-[11px]">
            <thead className="sticky top-0 z-20 bg-muted text-foreground">
              <tr>
                <th className="sticky left-0 z-30 min-w-[190px] border-b border-r border-border bg-muted px-3 py-2 text-left">
                  Transaction Type
                </th>
                {stores.map((store) => (
                  <th
                    key={store}
                    className="max-w-[150px] border-b border-r border-border px-3 py-2 text-right"
                    title={store}
                  >
                    <span className="block truncate">{store}</span>
                  </th>
                ))}
                <th className="border-b border-border bg-muted px-3 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {transactionTypes.map((transactionType, index) => (
                <tr key={transactionType} className="odd:bg-card even:bg-muted/50">
                  <th
                    className={`sticky left-0 z-10 border-b border-r border-border px-3 py-2 text-left font-semibold text-foreground ${index % 2 === 0 ? "bg-card" : "bg-muted/50"}`}
                  >
                    {transactionType}
                  </th>
                  {stores.map((store) => {
                    const amount = amounts.get(`${transactionType}\u0000${store}`) ?? 0;
                    return (
                      <td
                        key={store}
                        className="border-b border-r border-border px-3 py-2 text-right tabular-nums text-muted-foreground"
                      >
                        {amount === 0 ? "—" : formatMoney(amount)}
                      </td>
                    );
                  })}
                  <td className="border-b border-border bg-muted px-3 py-2 text-right font-bold tabular-nums text-primary">
                    {formatMoney(transactionTotals.get(transactionType) ?? 0)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="sticky bottom-0 z-20 bg-muted font-bold text-foreground">
              <tr>
                <th className="sticky left-0 z-30 border-r border-t border-border bg-muted px-3 py-2 text-left">
                  Total
                </th>
                {stores.map((store) => (
                  <td
                    key={store}
                    className="border-r border-t border-border px-3 py-2 text-right tabular-nums"
                  >
                    {formatMoney(storeTotals.get(store) ?? 0)}
                  </td>
                ))}
                <td className="border-t border-border px-3 py-2 text-right tabular-nums text-primary">
                  {formatMoney(safeItems.reduce((total, item) => total + item.amount, 0))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </ReportPanel>
  );
}
