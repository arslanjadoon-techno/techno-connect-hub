import { loomisService } from "./loomis.service";
import { salesReportService } from "./sales-report.service";
import { cardPointerService } from "./card-pointer.service";
import type { GetLoomisParams, ReconSummaryDataset } from "./types";

function formatApiSlashDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}/${m}/${d}`;
}

/**
 * Service class for Recon portal Summary Report dashboard.
 * Aggregates Loomis, Sales Report, and CardPointer datasets from their respective services.
 */
export class SummaryReportService {
  async getSummaryDataset(params?: GetLoomisParams): Promise<ReconSummaryDataset> {
    const today = new Date();
    const weekAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6);
    const effectiveParams: GetLoomisParams = {
      fromDate: params?.fromDate ?? formatApiSlashDate(weekAgo),
      toDate: params?.toDate ?? formatApiSlashDate(today),
      market: params?.market,
    };

    const [loomisRows, salesRows, cardPointerRows] = await Promise.all([
      loomisService.getLoomisReports(effectiveParams).catch(() => []),
      salesReportService.getSalesReports(effectiveParams).catch(() => []),
      cardPointerService.getCardPointerTransactions(effectiveParams).catch(() => []),
    ]);

    return {
      loomisRows,
      salesRows,
      cardPointerRows,
      storeDirectory: {},
    };
  }
}

export const summaryReportService = new SummaryReportService();
