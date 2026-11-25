export interface GetLoomisParams {
  fromDate?: string;
  toDate?: string;
  market?: string;
}

export interface LoomisApiRecord {
  id: number;
  market?: string | null;
  storeCode?: string | null;
  account?: string | null;
  bank?: string | null;
  bankName?: string | null;
  customer?: string | null;
  location?: string | null;
  locationFriendlyName?: string | null;
  safe?: string | null;
  safeFriendlyName?: string | null;
  serial?: string | null;
  businessDate?: string | null;
  transmittedOn?: string | null;
  validatedChangePurchaseManualDropsTotal?: number | null;
  validatedManualDropsTotal?: number | null;
  validatedDropsTotal?: number | null;
  validatedDropsBeforePickup?: number | null;
  validatedDropsAfterPickup?: number | null;
  changePurchaseTotal?: number | null;
  loomisPickup?: number | null;
  pickupOn?: string | null;
  pickupVerified?: boolean | null;
  pickupVerifiedOn?: string | null;
  reconDate?: string | null;
}

export interface LoomisReportRow {
  id: number;
  market: string;
  storeCode: string;
  account: string;
  storeName: string;
  bankName: string;
  customer: string;
  location: string;
  locationFriendlyName: string;
  safe: string;
  safeFriendlyName: string;
  serial: string;
  /** Raw business date and time in 24-hour format (YYYY-MM-DD HH:mm:ss). */
  businessDate: string;
  /** Transmission timestamp in 24-hour format (YYYY-MM-DD HH:mm:ss) or null. */
  transmittedOn: string | null;
  validatedCpMd: number;
  validatedMd: number;
  validatedDrops: number;
  vdBeforePickup: number;
  vdAfterPickup: number;
  changePurchaseTotal: number;
  loomisPickup: number;
  pickupOn: string | null;
  pickupVerified: boolean;
  pickupVerifiedOn: string | null;
  reconDate: string;
}

export interface SalesReportRow {
  id: number;
  market: string;
  customer: string;
  company: string;
  invDate: string;
  tangibleQty: number;
  tangibleRev: number;
  tangibleCost: number;
  tangibleProfit: number;
  serialQty: number;
  serialRev: number;
  serialCost: number;
  serialProfit: number;
  serviceQty: number;
  serviceRev: number;
  serviceCost: number;
  serviceProfit: number;
  paymentQty: number;
  paymentRev: number;
  paymentCost: number;
  paymentProfit: number;
  pettyCash: number;
  totalTax: number;
  totalPpTax: number;
  cashPaid: number;
  creditPaid: number;
  debitPaid: number;
  financePaid: number;
  otherPaid: number;
  totalRevenue: number;
  cashSale: number;
  cardSale: number;
}

export type CardPointerStatus = string;

export interface GetCardPointParams {
  fromDate?: string;
  toDate?: string;
  market?: string;
}

export interface CardPointApiRecord {
  transactionNumber?: string | null;
  market?: string | null;
  storeCode?: string | null;
  location?: string | null;
  transactionDate?: string | null;
  method?: string | null;
  cardHolderName?: string | null;
  brand?: string | null;
  lastFourDigits?: string | null;
  amount?: number | null;
  authCode?: string | null;
  status?: string | null;
}

export interface CardPointerRow {
  id: string;
  date: string;
  market: string;
  storeCode: string;
  location: string;
  storeName: string;
  transactionNo: string;
  method: string;
  name: string;
  brand: string;
  last4: string;
  amount: number;
  authCode: string;
  status: CardPointerStatus;
}

export interface ReconStoreDirectoryInfo {
  responsible: string;
  address: string;
}

export interface ReconSummaryStoreRow {
  responsible: string;
  salesDate: string;
  market: string;
  storeName: string;
  address: string;
  company: string;
  salesCash: number;
  salesCard: number;
  totalRevenue: number;
  tangibleRev: number;
  serialRev: number;
  serviceRev: number;
  paymentRev: number;
  loomisDrops: number;
  loomisPickup: number;
  loomisVerifiedCount: number;
  loomisRecordCount: number;
  cardPointerSettledAmount: number;
  cardPointerAllAmount: number;
  cardPointerTxnCount: number;
  cardPointerIssueCount: number;
  cashVariance: number;
  cardVariance: number;
  netVariance: number;
  latestDate: string;
}

export interface ReconSummaryDataset {
  loomisRows: LoomisReportRow[];
  salesRows: SalesReportRow[];
  cardPointerRows: CardPointerRow[];
  storeDirectory: Record<string, ReconStoreDirectoryInfo>;
}
