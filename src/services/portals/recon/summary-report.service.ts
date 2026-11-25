import { loomisService } from "./loomis.service";
import { salesReportService } from "./sales-report.service";
import { cardPointerService } from "./card-pointer.service";
import type { ReconSummaryDataset } from "./types";

/**
 * Service class for Recon portal Summary Report dashboard.
 * Aggregates Loomis, Sales Report, and CardPointer datasets from their respective services.
 */
export class SummaryReportService {
  async getSummaryDataset(): Promise<ReconSummaryDataset> {
    const [loomisRows, salesRows, cardPointerRows] = await Promise.all([
      loomisService.getLoomisReports(),
      salesReportService.getSalesReports(),
      cardPointerService.getCardPointerTransactions(),
    ]);

    return {
      loomisRows,
      salesRows,
      cardPointerRows,
    };
  }
}

export const summaryReportService = new SummaryReportService();
