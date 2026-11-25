import { HttpClient } from "@/services/http";
import { MARKET_API_PATHS, RECON_API_BASE_URL, RECON_API_PATHS } from "@/lib/config";
import type { GetLoomisParams, LoomisApiRecord, LoomisReportRow } from "./types";

function formatRaw24hDateTime(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  return trimmed
    .replace("T", " ")
    .replace(/\.\d+Z?$/, "")
    .replace(/Z$/, "");
}

function toSafeNumber(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function mapLoomisApiRecord(record: LoomisApiRecord): LoomisReportRow {
  const businessDate = formatRaw24hDateTime(record.businessDate) ?? "";
  const transmittedOn = formatRaw24hDateTime(record.transmittedOn);
  const locationFriendlyName = String(record.locationFriendlyName ?? "").trim();
  const safeFriendlyName = String(record.safeFriendlyName ?? "").trim();
  const storeCode = String(record.storeCode ?? "").trim();
  const reconDate =
    formatRaw24hDateTime(record.reconDate)?.slice(0, 10) ??
    (businessDate ? businessDate.slice(0, 10) : "");

  return {
    id: record.id,
    market: String(record.market ?? "").trim(),
    storeCode,
    account: String(record.account ?? "").trim(),
    storeName:
      locationFriendlyName || safeFriendlyName || storeCode || `Safe ${record.safe ?? record.id}`,
    bankName: String(record.bank ?? record.bankName ?? "").trim(),
    customer: String(record.customer ?? "").trim(),
    location: String(record.location ?? "").trim(),
    locationFriendlyName,
    safe: String(record.safe ?? "").trim(),
    safeFriendlyName,
    serial: String(record.serial ?? "").trim(),
    businessDate,
    transmittedOn,
    validatedCpMd: toSafeNumber(record.validatedChangePurchaseManualDropsTotal),
    validatedMd: toSafeNumber(record.validatedManualDropsTotal),
    validatedDrops: toSafeNumber(record.validatedDropsTotal),
    vdBeforePickup: toSafeNumber(record.validatedDropsBeforePickup),
    vdAfterPickup: toSafeNumber(record.validatedDropsAfterPickup),
    changePurchaseTotal: toSafeNumber(record.changePurchaseTotal),
    loomisPickup: toSafeNumber(record.loomisPickup),
    pickupOn: formatRaw24hDateTime(record.pickupOn),
    pickupVerified: Boolean(record.pickupVerified),
    pickupVerifiedOn: formatRaw24hDateTime(record.pickupVerifiedOn),
    reconDate,
  };
}

/**
 * Service class for Recon portal Loomis report API integration.
 * Endpoint: GET /api/recon/GetLoomis
 */
export class LoomisService {
  private readonly http = new HttpClient(RECON_API_BASE_URL);

  async getLoomisReports(params: GetLoomisParams = {}): Promise<LoomisReportRow[]> {
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

    const response = await this.http.get<LoomisApiRecord[]>(RECON_API_PATHS.getLoomis, query);
    const records = Array.isArray(response.data) ? response.data : [];
    return records.map(mapLoomisApiRecord);
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

export const loomisService = new LoomisService();
