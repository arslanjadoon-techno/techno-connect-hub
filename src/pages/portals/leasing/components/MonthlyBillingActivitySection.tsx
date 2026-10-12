import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { leasingService, type TotalRentPerTechId } from "@/services/portals/leasing";

const money = (v?: number | null) =>
  v == null || Number.isNaN(Number(v)) ? "—" : Number(v).toFixed(2);

const HEADERS = [
  "Year",
  "Month",
  "Base Rent",
  "CAM Charges",
  "Adjustment",
  "Total",
  "Paid",
  "Remarks",
  "Accounting Fig.",
  "Lease & Acc. Delta",
  "Accounting Remarks",
];

export default function MonthlyBillingActivitySection({ techId }: { techId: string }) {
  const [rows, setRows] = useState<TotalRentPerTechId[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const data = await leasingService.getMonthlyRentFigureByTechId(techId);
        if (active) setRows(data);
      } catch (error) {
        console.error("Error loading monthly billing activity:", error);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [techId]);

  return (
    <Card className="p-4">
      <h2 className="mb-3 text-base font-bold">Monthly Billing Activity</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {HEADERS.map((h) => (
                <th
                  key={h}
                  className="whitespace-nowrap px-3 py-2 text-center text-xs font-semibold text-muted-foreground"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td colSpan={HEADERS.length} className="py-8 text-center text-muted-foreground">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={HEADERS.length}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  No billing records found.
                  <div className="mt-1 text-xs">Billing activity will appear here once generated.</div>
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={i} className="text-center">
                  <td className="whitespace-nowrap px-3 py-2">{row.year ?? "N/A"}</td>
                  <td className="whitespace-nowrap px-3 py-2">{row.month ?? "N/A"}</td>
                  <td className="whitespace-nowrap px-3 py-2">{money(row.total_rent)}</td>
                  <td className="whitespace-nowrap px-3 py-2">{row.total_cam ?? 0}</td>
                  <td className="whitespace-nowrap px-3 py-2">{money(row.total_adjustment)}</td>
                  <td className="whitespace-nowrap px-3 py-2">{money(row.total_payment)}</td>
                  <td className="whitespace-nowrap px-3 py-2">{row.paid ? "Yes" : "No"}</td>
                  <td className="whitespace-nowrap px-3 py-2">{row.remarks ?? "---"}</td>
                  <td className="whitespace-nowrap px-3 py-2">{money(row.acc_figures)}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {row.acc_figures != null
                      ? `${money(row.acc_figures)} - ${money(row.total_payment)}`
                      : "---"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">{row.acc_remarks ?? "---"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
