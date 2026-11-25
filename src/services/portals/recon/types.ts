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
