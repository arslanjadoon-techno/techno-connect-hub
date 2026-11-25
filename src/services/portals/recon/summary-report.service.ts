import { loomisService } from "./loomis.service";
import { salesReportService } from "./sales-report.service";
import { cardPointerService } from "./card-pointer.service";
import type { GetLoomisParams, ReconStoreDirectoryInfo, ReconSummaryDataset } from "./types";

const SAMPLE_STORE_DIRECTORY: Record<string, ReconStoreDirectoryInfo> = {
  "Phoenix Central #1042": {
    responsible: "Marcus Vance",
    address: "2140 N Central Ave, Phoenix, AZ 85004",
  },
  "Mesa Fiesta #1087": {
    responsible: "Elena Rodriguez",
    address: "1325 S Alma School Rd, Mesa, AZ 85210",
  },
  "Tucson Mall #1104": {
    responsible: "Devon Brooks",
    address: "4500 N Oracle Rd, Tucson, AZ 85705",
  },
  "Scottsdale Fashion #1129": {
    responsible: "Nadia Patel",
    address: "7014 E Camelback Rd, Scottsdale, AZ 85251",
  },
  "Glendale Westgate #1153": {
    responsible: "Carlos Mendez",
    address: "6770 N Sunrise Blvd, Glendale, AZ 85305",
  },
  "Los Angeles Downtown #2011": {
    responsible: "Jordan Kim",
    address: "735 S Figueroa St, Los Angeles, CA 90017",
  },
  "Pasadena Rose #2034": {
    responsible: "Hannah Abbott",
    address: "280 E Colorado Blvd, Pasadena, CA 91101",
  },
  "Long Beach Pike #2068": {
    responsible: "Tariq Al-Mansoor",
    address: "95 S Pine Ave, Long Beach, CA 90802",
  },
  "Anaheim Plaza #2095": {
    responsible: "Sofia Morales",
    address: "510 N Euclid St, Anaheim, CA 92801",
  },
  "Chandler Crossroads #1180": {
    responsible: "Ethan Gallagher",
    address: "2940 E Germann Rd, Chandler, AZ 85286",
  },
  "Tempe Marketplace #1202": {
    responsible: "Priya Nair",
    address: "2000 E Rio Salado Pkwy, Tempe, AZ 85281",
  },
  "Burbank Empire #2118": {
    responsible: "Lucas Bennett",
    address: "1731 N Victory Pl, Burbank, CA 91502",
  },
  "Santa Monica Promenade #2140": {
    responsible: "Maya Lin",
    address: "1345 3rd Street Promenade, Santa Monica, CA 90401",
  },
  "Peoria Arrowhead #1228": {
    responsible: "Omar Farooq",
    address: "7700 W Arrowhead Towne Ctr, Peoria, AZ 85382",
  },
  "Torrance Del Amo #2166": {
    responsible: "Rachel Foster",
    address: "3525 W Carson St, Torrance, CA 90503",
  },
};

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
  async getSummaryDataset(loomisParams?: GetLoomisParams): Promise<ReconSummaryDataset> {
    const today = new Date();
    const weekAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6);
    const effectiveLoomisParams: GetLoomisParams = {
      fromDate: loomisParams?.fromDate ?? formatApiSlashDate(weekAgo),
      toDate: loomisParams?.toDate ?? formatApiSlashDate(today),
      market: loomisParams?.market,
    };

    const [loomisRows, salesRows, cardPointerRows] = await Promise.all([
      loomisService.getLoomisReports(effectiveLoomisParams).catch(() => []),
      salesReportService.getSalesReports(),
      cardPointerService.getCardPointerTransactions(effectiveLoomisParams).catch(() => []),
    ]);

    return {
      loomisRows,
      salesRows,
      cardPointerRows,
      storeDirectory: { ...SAMPLE_STORE_DIRECTORY },
    };
  }
}

export const summaryReportService = new SummaryReportService();
