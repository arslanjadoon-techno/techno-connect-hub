/**
 * Mirrors TechnoComm.DTO.LeaseJoined exactly (camelCased - ASP.NET's default
 * System.Text.Json naming policy). One row = one store's full lease record,
 * joined across lease_data / OwnerAccountInformation / landlord /
 * property_management / financial_static_figures / TechnoDevDb.Stores.
 */
export interface LeaseRecord {
  techId: string;
  storeName?: string | null;
  marketName?: string | null;
  // Backend column is varchar, not numeric - comes through as a string despite the name.
  securityDeposit?: string | null;
  leaseIncrementPercentage?: string | null;
  contactNumber?: string | null;
  landlordCoi?: string | null;
  metroCoi?: string | null;
  bankInformation?: string | null;
  entityName?: string | null;
  guarantor?: string | null;
  ownerEmail?: string | null;
  createdAt?: string | null;
  lease_Term?: string | null;
  start_Date?: string | null;
  expiry_Due?: string | null;
  hvac?: string | null;
  exclusivity?: string | null;
  termination?: string | null;
  relocation?: string | null;
  rightToSublease?: string | null;
  isDeleted?: boolean | null;
  deletedAt?: string | null;
  optionPeriod?: boolean | null;
  optionPeriodDuration?: string | null;

  // OwnerAccountInformation
  ownerAccountNumber?: string | null;
  ownerRoutingNumber?: string | null;
  ownerStreetAddress?: string | null;
  ownerAptOrSuiteNumber?: string | null;
  ownerCity?: string | null;
  ownerState?: string | null;
  ownerZipCode?: string | null;
  ownerAccountHolderName?: string | null;
  ownerName?: string | null;
  ownerAccountTitle?: string | null;
  ownerPaymentMode?: string | null;
  ownerBankName?: string | null;
  ownerCheckAddress?: string | null;
  landlordId?: number | null;

  // landlord
  landLordName?: string | null;
  landLordContactNumber?: string | null;
  landLordEmail?: string | null;
  landLordRemarks?: string | null;
  landLordAddress?: string | null;
  landLordIndividualOrCompany?: string | null;
  landLordPointOfContact?: string | null;

  // TechnoDevDb.Stores
  storeEmail?: string | null;
  storePhoneNumber?: string | null;
  storeAddress?: string | null;

  // property_management
  propertyMgtName?: string | null;
  propertyMgtPointOfContact?: string | null;
  propertyMgtEmail?: string | null;
  propertyMgtPhoneNumber?: string | null;
  propertyMgtAddress?: string | null;

  // financial_static_figures
  security_deposit?: number | null;
  tier?: string | null;
  assignmentDate?: string | null;
  marketManager?: string | null;
  leaseSignedBy?: string | null;
  noticePeriodBeforeTermination?: string | null;
  optionNoticeDate?: string | null;
  subLease?: string | null;
  takeOverDate?: string | null;
  commencementDateRent?: string | null;
  guarantyType?: string | null;
  rightToTermination?: string | null;
  leaseStatus?: string | null;

  [key: string]: unknown;
}

export interface TotalRent {
  month?: number | null;
  year?: string | null;
  total_payment?: number | null;
  total_rent?: number | null;
  total_cam?: number | null;
  total_adjustment?: number | null;
}

export interface TotalRentPerTechId {
  month?: number | null;
  year?: string | null;
  total_rent?: number | null;
  total_cam?: number | null;
  total_adjustment?: number | null;
  total_payment?: number | null;
  remarks?: string | null;
  acc_remarks?: string | null;
  acc_figures?: number | null;
  paid?: boolean | null;
}

export interface UpcomingRentChange {
  techId?: string | null;
  storeName?: string | null;
  marketName?: string | null;
  tier?: string | null;
  currentMonthlyRent?: number | null;
  currentCamCharges?: number | null;
  currentOtherCharges?: number | null;
  newMonthlyRent?: number | null;
  newCamCharges?: number | null;
  newOtherCharges?: number | null;
  effectiveDate: string;
}

export interface LeaseDoc {
  fileId: number;
  techId: string;
  fileName: string;
  fileUrl: string;
  sortOrder?: number | null;
  [key: string]: unknown;
}

export interface MissingDocsRequest {
  techId: string;
  missingDocs: string[];
}

export interface RentPaidSummary {
  year: string;
  month: number;
  countRentPaid: number;
  countRentNotPaid: number;
  sumRentPaid: number;
  sumRentNotPaid: number;
}

export interface LeasingOwnersAccount {
  id?: number;
  [key: string]: unknown;
}

export interface ReportTemplate {
  id?: number;
  name: string;
  fields: string[];
}

/** Raw shape returned by GET /GetRentalPaymentDetails?year=&month= - one row per lease per month. */
export interface RentalPaymentDetail {
  techId: string;
  market?: string | null;
  storeName?: string | null;
  base_rent?: number | null;
  year?: string | number | null;
  month?: number | null;
  adjustment?: number | null;
  cam_charges?: number | null;
  other_charges?: number | null;
  cam_Reconciliation_Charges?: number | null;
  security_deposit_assignmentfee?: number | null;
  credit_available?: number | null;
  total_accounting_figure?: number | null;
  remarks?: string | null;
  accounting_remarks?: string | null;
  paid?: boolean | null;
  pay_date?: string | null;
  accountNumber?: string | null;
  routingNumber?: string | null;
  streetAddress?: string | null;
  accountTitle?: string | null;
  propertyOwnerName?: string | null;
  paymentMode?: string | null;
  paidBy?: string | null;
  subjectOfPayment?: string | null;
  paymentConfirmation?: string | null;
  bankName?: string | null;
  checkAddress?: string | null;
}

export interface FinancialMonthlyFiguresUpdate {
  TechId: string;
  base_rent: number;
  year: string | number;
  month: number;
  adjustment: number;
  cam_charges: number;
  other_charges: number;
  cam_Reconciliation_Charges: number;
  security_deposit_assignmentfee: number;
  credit_available: number;
  total_accounting_figure?: number;
  accounting_remarks?: string;
  paid: boolean;
  pay_date?: string | null;
  remarks?: string;
}

export interface NewLeaseAgreement {
  techId: string;
  propertyType?: string;
  monthlyRent: string | number;
  camCharges: string | number;
  adjustments?: string | number;
  otherCharges?: string | number;
  comments?: string;
  startDate: string;
  endDate: string;
}

export interface LeaseRentAgreement {
  id?: number;
  techId: string;
  startDate: string;
  endDate?: string | null;
  monthlyRent?: number | null;
  camCharges?: number | null;
  otherCharges?: number | null;
  comments?: string | null;
  [key: string]: unknown;
}
