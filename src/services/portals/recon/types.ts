export interface LoomisReportRow {
  id: number;
  storeName: string;
  bankName: string;
  customer: string;
  location: string;
  safe: string;
  serial: string;
  /** Raw business date and time in 24-hour format (YYYY-MM-DD HH:mm:ss). */
  businessDate: string;
  /** Transmission timestamp in 24-hour format (YYYY-MM-DD HH:mm:ss). */
  transmittedOn: string;
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
  mdTotal: number;
  manualRemovals: number;
  manualTransfers: number;
  tubeVend: number;
  tubeLoad: number;
  dispense: number;
  cashDispense: number;
  coinDispense: number;
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
