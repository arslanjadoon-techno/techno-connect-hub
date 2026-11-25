import { HttpClient } from "@/services/http";
import { MARKET_API_PATHS, RECON_API_BASE_URL, RECON_API_PATHS } from "@/lib/config";
import type { GetSalesReportParams, SalesReportApiRecord, SalesReportRow } from "./types";

function formatDateOnly(value: string | null | undefined): string {
  if (!value) return "";
  const trimmed = String(value).trim();
  if (!trimmed) return "";
  return trimmed.split("T")[0]?.split(" ")[0] ?? trimmed;
}

function toSafeNumber(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function mapSalesReportApiRecord(record: SalesReportApiRecord): SalesReportRow {
  const customer = String(record.customerNumber ?? record.customer ?? "").trim();
  const cashPaid = toSafeNumber(record.cashPaid);
  const creditPaid = toSafeNumber(record.creditPaid);
  const debitPaid = toSafeNumber(record.debitPaid);

  return {
    id: record.id,
    market: String(record.marketId ?? record.market ?? "").trim(),
    storeCode: customer,
    customer,
    company: String(record.company ?? "").trim(),
    invDate: formatDateOnly(record.invoiceDate),
    tangibleQty: toSafeNumber(record.tangibleQuantity),
    tangibleRev: toSafeNumber(record.tangibleRevenue),
    tangibleCost: toSafeNumber(record.tangibleCost),
    tangibleProfit: toSafeNumber(record.tangibleProfit),
    serialQty: toSafeNumber(record.serialQuantity),
    serialRev: toSafeNumber(record.serialRevenue),
    serialCost: toSafeNumber(record.serialCost),
    serialProfit: toSafeNumber(record.serialProfit),
    serviceQty: toSafeNumber(record.serviceQuantity),
    serviceRev: toSafeNumber(record.serviceRevenue),
    serviceCost: toSafeNumber(record.serviceCost),
    serviceProfit: toSafeNumber(record.serviceProfit),
    paymentQty: toSafeNumber(record.paymentQuantity),
    paymentRev: toSafeNumber(record.paymentRevenue),
    paymentCost: toSafeNumber(record.paymentCost),
    paymentProfit: toSafeNumber(record.paymentProfit),
    pettyCash: toSafeNumber(record.pettyCash),
    totalTax: toSafeNumber(record.totalTax),
    totalPpTax: toSafeNumber(record.totalPpTax),
    cashPaid,
    creditPaid,
    debitPaid,
    financePaid: toSafeNumber(record.financePaid),
    otherPaid: toSafeNumber(record.otherPaid),
    totalRevenue: toSafeNumber(record.totalRevenue),
    cashSale: record.cashSale != null ? toSafeNumber(record.cashSale) : cashPaid,
    cardSale: record.cardSale != null ? toSafeNumber(record.cardSale) : creditPaid + debitPaid,
  };
}

/**
 * Service class for Recon portal Sales Report API integration.
 * Endpoint: GET /api/recon/GetSalesReport
 */
export class SalesReportService {
  private readonly http = new HttpClient(RECON_API_BASE_URL);

  async getSalesReports(params: GetSalesReportParams = {}): Promise<SalesReportRow[]> {
    const query: Record<string, string | undefined> = {};

    if (params.fromDate) {
      query.fromDate = params.fromDate;
    }
    if (params.toDate) {
      query.toDate = params.toDate;
    }
    if (params.market && params.market.toLowerCase() !== "all") {
      query.market = params.market;
    }

    const response = await this.http.get<SalesReportApiRecord[]>(
      RECON_API_PATHS.getSalesReport,
      query,
    );
    const records = Array.isArray(response.data) ? response.data : [];
    return records.map(mapSalesReportApiRecord);
  }

  async getMarkets(): Promise<string[]> {
    try {
      const response = await this.http.get<Array<{ id: number; name?: string }>>(
        MARKET_API_PATHS.getAll,
      );
      if (!Array.isArray(response.data)) return [];
      return Array.from(
        new Set(response.data.map((m) => String(m?.name ?? "").trim()).filter(Boolean)),
      ).sort((a, b) => a.localeCompare(b));
    } catch {
      return [];
    }
  }
}

export const salesReportService = new SalesReportService();
