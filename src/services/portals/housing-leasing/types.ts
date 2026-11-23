/**
 * Mirrors TechnoComm.DTO.HousingLeaseJoined exactly (camelCased - ASP.NET's
 * default System.Text.Json naming policy). One row = one housing unit's full
 * lease record, joined across HousingLeaseData / HousingOwnersAccount /
 * HousingLandlord / HousingPropertyManagement / HousingFinancialStaticFigures
 * / the pre-existing House registry (unitId == House.Id, joined live against
 * userManagementContext.Houses - no local HousingUnits table).
 *
 * Deliberately dropped vs. LeaseRecord (no backend equivalent - see
 * HousingLeasingController's GetHousingLeasingInfo select): marketManager,
 * marketManagerPhoneNumber, storeEmail, storePhoneNumber. storeAddress's
 * equivalent here is `address` (from House.Address).
 * Added: districtName (comes from the House's District nav property).
 */
export interface HousingLeaseRecord {
  unitId?: number | null;
  unitName?: string | null;
  marketName?: string | null;
  districtName?: string | null;
  address?: string | null;
  leaseIncrementPercentage?: string | null;
  contactNumber?: string | null;
  landlordCoi?: string | null;
  metroCoi?: string | null;
  bankInformation?: string | null;
  entityName?: string | null;
  ownerEmail?: string | null;
  createdAt?: string | null;
  lease_Term?: string | null;
  start_Date?: string | null;
  expiry_Due?: string | null;
  isDeleted?: boolean | null;
  deletedAt?: string | null;
  // Agreement Clauses, Housing-specific (not a copy of Leasing's commercial-lease
  // clauses) - free-text tag lists, comma-separated.
  appliancesByOwner?: string | null;
  appliancesByTenant?: string | null;

  // HousingOwnersAccount
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

  // HousingLandlord
  landLordName?: string | null;
  landLordContactNumber?: string | null;
  landLordEmail?: string | null;
  landLordRemarks?: string | null;
  landLordAddress?: string | null;
  landLordIndividualOrCompany?: string | null;
  landLordPointOfContact?: string | null;

  // HousingPropertyManagement
  propertyMgtName?: string | null;
  propertyMgtPointOfContact?: string | null;
  propertyMgtEmail?: string | null;
  propertyMgtPhoneNumber?: string | null;
  propertyMgtAddress?: string | null;

  // HousingFinancialStaticFigures
  security_deposit?: number | null;
  tier?: string | null;
  assignmentDate?: string | null;
  leaseSignedBy?: string | null;
  takeOverDate?: string | null;
  commencementDateRent?: string | null;
  leaseStatus?: string | null;
  // Only ever set/updated by the backend when leaseStatus is saved as
  // "InActive" - left untouched on every other save.
  leaseStatusDate?: string | null;

  [key: string]: unknown;
}

export interface HousingTotalRent {
  month?: number | null;
  year?: string | null;
  total_payment?: number | null;
  total_rent?: number | null;
  total_cam?: number | null;
  total_adjustment?: number | null;
}

export interface HousingTotalRentPerUnitId {
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

export interface HousingUpcomingRentChange {
  unitId?: number | null;
  unitName?: string | null;
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

/** Mirrors TechnoComm.Modal.HousingLeaseDocuments exactly (camelCased). */
export interface HousingLeaseDoc {
  id: number;
  unitId: number;
  documentUrl: string;
  fileType?: string | null;
  documentTitle?: string | null;
  documentType?: string | null;
  createdBy?: string | null;
  createdDate?: string | null;
  sortOrder?: number | null;
  [key: string]: unknown;
}

export interface HousingMissingDocsRequest {
  unitId: number;
  missingDocs: string[];
}

/** Mirrors TechnoComm.Modal.HousingLeaseExpirationRemarks exactly (camelCased). */
export interface HousingLeaseExpirationRemark {
  unitId?: number | null;
  remarksBy?: string | null;
  remarks?: string | null;
  remarksDate?: string | null;
  remarksEditDate?: string | null;
}

export interface HousingOwnersAccount {
  id?: number;
  [key: string]: unknown;
}

/** Raw shape returned by GET /GetRentalPaymentDetails?year=&month=&UnitId= - one row per lease per month. */
export interface HousingRentalPaymentDetail {
  unitId?: number | null;
  market?: string | null;
  unitName?: string | null;
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
  bankName?: string | null;
  checkAddress?: string | null;
}

export interface HousingFinancialMonthlyFiguresUpdate {
  UnitId: number;
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

export interface NewHousingLeaseAgreement {
  unitId: number;
  propertyType?: string;
  monthlyRent: string | number;
  camCharges: string | number;
  adjustments?: string | number;
  otherCharges?: string | number;
  comments?: string;
  startDate: string;
  endDate: string;
}

export interface HousingLeaseRentAgreement {
  id?: number;
  unitId: number;
  startDate: string;
  endDate?: string | null;
  monthlyRent?: number | null;
  camCharges?: number | null;
  otherCharges?: number | null;
  comments?: string | null;
  [key: string]: unknown;
}

/** Mirrors Leasing's ReportTemplate - against HousingReportTemplatesDBSet. */
export interface HousingReportTemplate {
  id?: number;
  name: string;
  fields: string[];
}

/**
 * Mirrors TechnoComm.Controllers.HousingOccupantJoined exactly (camelCased).
 * One row = one employee's stay in a unit. moveOutDate == null means they
 * currently live there - a "Shift" closes this row out and opens a new one
 * on the destination unit (see HousingLeasingService.shiftHousingOccupant),
 * so a unit's full occupant history is just every row with that unitId.
 */
export interface HousingOccupant {
  id: number;
  unitId: number;
  userId: number;
  employeeName?: string | null;
  employeeEmail?: string | null;
  moveInDate: string;
  moveOutDate?: string | null;
  status?: string | null;
  remarks?: string | null;
}

export interface AddHousingOccupantRequest {
  unitId: number;
  userId: number;
  moveInDate: string;
  remarks?: string | null;
}

export interface ShiftHousingOccupantRequest {
  occupantId: number;
  newUnitId: number;
  moveDate: string;
  remarks?: string | null;
}

export interface RemoveHousingOccupantRequest {
  occupantId: number;
  moveOutDate: string;
  remarks?: string | null;
}
