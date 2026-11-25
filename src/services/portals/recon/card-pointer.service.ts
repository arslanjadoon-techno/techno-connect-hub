import { HttpClient } from "@/services/http";
import { MARKET_API_PATHS, RECON_API_BASE_URL, RECON_API_PATHS } from "@/lib/config";
import type { CardPointApiRecord, CardPointerRow, GetCardPointParams } from "./types";

function formatRaw24hDateTime(value: string | null | undefined): string {
  if (!value) return "";
  const trimmed = String(value).trim();
  if (!trimmed) return "";
  return trimmed
    .replace("T", " ")
    .replace(/\.\d+Z?$/, "")
    .replace(/Z$/, "");
}

function toSafeNumber(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function mapCardPointApiRecord(record: CardPointApiRecord, index: number): CardPointerRow {
  const transactionNo = String(record.transactionNumber ?? "").trim();
  const location = String(record.location ?? "").trim();
  const storeCode = String(record.storeCode ?? "").trim();

  return {
    id: transactionNo ? `${transactionNo}-${index}` : `cp-${index}`,
    date: formatRaw24hDateTime(record.transactionDate),
    market: String(record.market ?? "").trim(),
    storeCode,
    location,
    storeName: location || storeCode || "—",
    transactionNo,
    method: String(record.method ?? "").trim(),
    name: String(record.cardHolderName ?? "").trim(),
    brand: String(record.brand ?? "").trim(),
    last4: String(record.lastFourDigits ?? "").trim(),
    amount: toSafeNumber(record.amount),
    authCode: String(record.authCode ?? "").trim(),
    status: String(record.status ?? "").trim(),
  };
}

/**
 * Service class for Recon portal CardPoint API integration.
 * Endpoint: GET /api/recon/GetCardPoint
 */
export class CardPointerService {
  private readonly http = new HttpClient(RECON_API_BASE_URL);

  async getCardPointerTransactions(params: GetCardPointParams = {}): Promise<CardPointerRow[]> {
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

    const response = await this.http.get<CardPointApiRecord[]>(RECON_API_PATHS.getCardPoint, query);
    const records = Array.isArray(response.data) ? response.data : [];
    return records.map(mapCardPointApiRecord);
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

export const cardPointerService = new CardPointerService();
