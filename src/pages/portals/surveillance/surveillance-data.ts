import { MMKV } from "@/lib/mmkv-storage";
import type {
  SurveillanceRequest,
  SurveillanceReport,
  SurveillanceAuditRow,
  SurveillanceAssignableAgent,
  SurveillanceValidationItem,
  SavedAuditRowRecord,
  ActiveSurveillanceDraftSession,
  CreateSurveillanceRequestPayload,
  CreateSurveillanceReportPayload,
  ValidateAndAssignPayload,
  RejectValidationPayload,
} from "@/services/portals/surveillance/types";

function makeAuditRow(
  partial: Partial<SurveillanceAuditRow> &
    Pick<SurveillanceAuditRow, "id" | "date" | "storeName" | "time" | "salesRep" | "transType">,
): SurveillanceAuditRow {
  return {
    invoice: "",
    cashTime: "",
    bdiTime: "",
    nb: "",
    b: "",
    invoiceAmount: "",
    totalTaken: "",
    cash: "",
    card: "",
    difference: "$0.00",
    receipt: "",
    splitPayments: "",
    fraudTransactions: "",
    refundInvoice: "",
    missOpportunity: "",
    paymentFraud: "",
    aalSwap: "",
    mim: "",
    notes: "",
    pitchNb: "",
    pitchQuality: "",
    pitchNotes: "",
    showingPhone: "",
    accOffered: "",
    maximize: "",
    flipping: "",
    bundleNb: "",
    bundleStartB: "",
    bundleEndB: "",
    bundleAccGiven: "",
    portIn: "",
    nonUp: "",
    smartPayMentioned: "",
    aalBillSame: "",
    onlineRejectedPayment: "",
    nameOfRepLeaving: "",
    timeLeft: "",
    timeReturned: "",
    backRoomTimeIn: "",
    backRoomTimeOut: "",
    offline: "",
    ...partial,
  };
}

export interface StaticStoreOption {
  id: string;
  name: string;
  number: string;
  market: string;
  district: string;
  address: string;
}

export const AVAILABLE_STORES: StaticStoreOption[] = [
  {
    id: "store-101",
    name: "Store #101 - Uptown Dallas",
    number: "101",
    market: "Dallas North",
    district: "District 1",
    address: "2401 McKinney Ave, Dallas, TX",
  },
  {
    id: "store-102",
    name: "Store #102 - Galleria Mall",
    number: "102",
    market: "Dallas North",
    district: "District 1",
    address: "13350 Dallas Pkwy, Dallas, TX",
  },
  {
    id: "store-107",
    name: "Store #107 - Plano Legacy",
    number: "107",
    market: "Dallas North",
    district: "District 1",
    address: "5800 Legacy Dr, Plano, TX",
  },
  {
    id: "store-103",
    name: "Store #103 - Downtown Houston",
    number: "103",
    market: "Houston Central",
    district: "District 2",
    address: "1200 Louisiana St, Houston, TX",
  },
  {
    id: "store-104",
    name: "Store #104 - The Woodlands",
    number: "104",
    market: "Houston Central",
    district: "District 2",
    address: "1201 Lake Woodlands Dr, The Woodlands, TX",
  },
  {
    id: "store-105",
    name: "Store #105 - Domain Austin",
    number: "105",
    market: "Austin Metro",
    district: "District 3",
    address: "11410 Century Oaks Terrace, Austin, TX",
  },
  {
    id: "store-108",
    name: "Store #108 - South Congress",
    number: "108",
    market: "Austin Metro",
    district: "District 3",
    address: "1608 S Congress Ave, Austin, TX",
  },
  {
    id: "store-106",
    name: "Store #106 - Riverwalk Center",
    number: "106",
    market: "San Antonio",
    district: "District 4",
    address: "849 E Commerce St, San Antonio, TX",
  },
];

/**
 * Sample static data for Page 1: Request Reports (/surveillance/requests).
 * Strictly uses the 2 statuses: "Pending" and "Completed".
 */
export const INITIAL_REQUEST_REPORTS: SurveillanceRequest[] = [
  {
    id: "SRV-REQ-101",
    storeId: "store-101",
    storeName: "Store #101 - Uptown Dallas",
    storeNumber: "101",
    marketName: "Dallas North",
    districtName: "District 1",
    incidentDate: "2026-10-18",
    shift: "Evening Shift (16:00 - 00:00)",
    investigationType: "Cash Drawer Shortage",
    priority: "high",
    title: "Discrepancy of $340 at Register #2 end of shift",
    requestedBy: "David Kim",
    requestedById: "u-2",
    requesterRole: "Market Manager",
    requesterEmail: "david.kim@techno-communications.com",
    requesterPhone: "+1 (214) 555-0192",
    requesterDepartment: "Regional Store Operations",
    areasToReview: ["POS 1 Register", "POS 2 Register", "Backroom / Safe"],
    notes:
      "Closing drawer count was short $340. Cashier stated multiple bill jams occurred around 20:30. Please inspect camera feeds focusing on the register and safe transfers.",
    status: "Pending",
    createdAt: "2026-10-18T22:15:00Z",
    approvedBy: "System Admin",
    approvedAt: "2026-10-19T09:30:00Z",
    linkedReportId: "SRV-REP-202",
    preparedBy: "Michael Sterling",
    preparedById: "agt-102",
    preparedByEmail: "m.sterling@techno-communications.com",
    preparedByPhone: "+1 (214) 555-0821",
    preparedByRole: "Asset Protection Auditor",
    preparedByDepartment: "Surveillance & Loss Prevention",
    preparedAt: "2026-10-20T14:10:00Z",
    reportStatus: "Pending Review",
  },
  {
    id: "SRV-REQ-102",
    storeId: "store-103",
    storeName: "Store #103 - Downtown Houston",
    storeNumber: "103",
    marketName: "Houston Central",
    districtName: "District 2",
    incidentDate: "2026-10-25",
    shift: "Morning Shift (08:00 - 16:00)",
    investigationType: "Inventory Discrepancy",
    priority: "high",
    title: "High-value accessory shelf missing 4 flagship wireless earbuds",
    requestedBy: "Marcus Vance",
    requestedById: "u-5",
    requesterRole: "District Manager",
    requesterEmail: "marcus.vance@techno-communications.com",
    requesterPhone: "+1 (713) 555-0144",
    requesterDepartment: "District 2 Operations",
    areasToReview: ["Sales Floor", "Display Counter", "Customer Entrance"],
    notes:
      "Auditor noticed empty acrylic pegs on front row. Need review of customer traffic between 11:00 and 14:00.",
    status: "Pending",
    createdAt: "2026-10-25T14:40:00Z",
  },
  {
    id: "SRV-REQ-103",
    storeId: "store-105",
    storeName: "Store #105 - Domain Austin",
    storeNumber: "105",
    marketName: "Austin Metro",
    districtName: "District 3",
    incidentDate: "2026-10-16",
    shift: "Full Shift Audit",
    investigationType: "Suspicious Activity",
    priority: "medium",
    title: "Full shift register & back delivery gate security verification",
    requestedBy: "Sarah Jenkins",
    requestedById: "u-4",
    requesterRole: "State Manager",
    requesterEmail: "sarah.jenkins@techno-communications.com",
    requesterPhone: "+1 (512) 555-0188",
    requesterDepartment: "Texas State Leadership",
    areasToReview: ["Backroom / Safe", "Customer Entrance", "POS Registers"],
    notes:
      "Night security officer flagged two individuals repeatedly checking back dock door handle; also verify full morning-to-afternoon register logs.",
    status: "Completed",
    createdAt: "2026-10-15T23:50:00Z",
    approvedBy: "Sarah Jenkins",
    approvedAt: "2026-10-16T08:00:00Z",
    linkedReportId: "SRV-REP-201",
    preparedBy: "Alex Rivera",
    preparedById: "agt-101",
    preparedByEmail: "alex.rivera@techno-communications.com",
    preparedByPhone: "+1 (512) 555-0177",
    preparedByRole: "Surveillance Lead Specialist",
    preparedByDepartment: "Surveillance & Asset Protection",
    preparedAt: "2026-10-16T11:45:00Z",
    reportStatus: "Approved",
    reportApprovedBy: "Sarah Jenkins",
    reportApprovedAt: "2026-10-16T15:20:00Z",
    managerRating: 5,
    managerComments:
      "Thorough review and precise footage timestamps. Excellent work providing actionable recommendations for dock security.",
  },
  {
    id: "SRV-REQ-104",
    storeId: "store-106",
    storeName: "Store #106 - Riverwalk Center",
    storeNumber: "106",
    marketName: "San Antonio",
    districtName: "District 4",
    incidentDate: "2026-10-23",
    shift: "Afternoon Shift (12:00 - 20:00)",
    investigationType: "Employee Operational Audit",
    priority: "high",
    title: "Split payment discrepancy across multiple AAL activations",
    requestedBy: "Sarah Jenkins",
    requestedById: "u-4",
    requesterRole: "State Manager",
    requesterEmail: "sarah.jenkins@techno-communications.com",
    requesterPhone: "+1 (512) 555-0188",
    requesterDepartment: "Texas State Leadership",
    areasToReview: ["Customer Entrance", "Sales Floor", "POS Registers"],
    notes:
      "Three consecutive AAL activations recorded mixed cash/card tenders with missing printed receipts. Assigned to auditor for investigation.",
    status: "Pending",
    createdAt: "2026-10-24T10:30:00Z",
    approvedBy: "System Admin",
    approvedAt: "2026-10-24T11:15:00Z",
    preparedBy: "Michael Sterling",
    preparedById: "agt-102",
    preparedByEmail: "m.sterling@techno-communications.com",
    preparedByPhone: "+1 (214) 555-0821",
    preparedByRole: "Asset Protection Auditor",
    preparedByDepartment: "Surveillance & Loss Prevention",
  },
  {
    id: "SRV-REQ-106",
    storeId: "store-104",
    storeName: "Store #104 - The Woodlands",
    storeNumber: "104",
    marketName: "Houston Central",
    districtName: "District 2",
    incidentDate: "2026-10-14",
    shift: "Morning Shift (09:00 - 17:00)",
    investigationType: "Operational Compliance",
    priority: "low",
    title: "Quarterly REVVL Tab promo pitch & safe drop compliance audit",
    requestedBy: "David Kim",
    requestedById: "u-2",
    requesterRole: "Market Manager",
    requesterEmail: "david.kim@techno-communications.com",
    requesterPhone: "+1 (214) 555-0192",
    requesterDepartment: "Regional Store Operations",
    areasToReview: ["Sales Floor", "POS Registers", "Backroom / Safe"],
    notes:
      "Routine verification of promotional tablet pitch adherence and dual-custody safe drop procedures.",
    status: "Completed",
    createdAt: "2026-10-14T09:15:00Z",
    approvedBy: "David Kim",
    approvedAt: "2026-10-14T10:00:00Z",
    linkedReportId: "SRV-REP-204",
    preparedBy: "Omar Farooq",
    preparedById: "agt-104",
    preparedByEmail: "omar.farooq@techno-communications.com",
    preparedByPhone: "+1 (713) 555-0248",
    preparedByRole: "Surveillance Analyst",
    preparedByDepartment: "Surveillance & Asset Protection",
    preparedAt: "2026-10-14T16:40:00Z",
    reportStatus: "Approved",
    reportApprovedBy: "David Kim",
    reportApprovedAt: "2026-10-15T09:05:00Z",
    managerRating: 4,
    managerComments: "Clear transaction breakdown and accurate verification of safe drop logs.",
  },
  {
    id: "SRV-REQ-107",
    storeId: "store-102",
    storeName: "Store #102 - Galleria Mall",
    storeNumber: "102",
    marketName: "Dallas North",
    districtName: "District 1",
    incidentDate: "2026-10-26",
    shift: "Afternoon Shift (12:00 - 18:00)",
    investigationType: "Security Compliance",
    priority: "medium",
    title: "Backroom inventory door propped open during afternoon shift",
    requestedBy: "Elena Rostova",
    requestedById: "u-6",
    requesterRole: "District Manager",
    requesterEmail: "elena.rostova@techno-communications.com",
    requesterPhone: "+1 (214) 555-0133",
    requesterDepartment: "District 1 Operations",
    areasToReview: ["Backroom / Safe", "Sales Floor"],
    notes:
      "District walkthrough noted backroom security door left unlatched. Requesting full afternoon review of backroom entry/exit compliance.",
    status: "Pending",
    createdAt: "2026-10-26T15:05:00Z",
  },
];

/**
 * Sample static data for Page 3: Surveillance Reports (/surveillance/reports).
 * Represents validated requests assigned to surveillance agents/auditors.
 */
export const INITIAL_SURVEILLANCE_REQUESTS: SurveillanceRequest[] = [
  {
    id: "SRV-REQ-303",
    storeId: "store-106",
    storeName: "Store #106 - Riverwalk Center",
    storeNumber: "106",
    marketName: "San Antonio",
    districtName: "District 4",
    incidentDate: "2026-10-23",
    shift: "Afternoon Shift (12:00 - 20:00)",
    investigationType: "Payment Discrepancy",
    priority: "high",
    title: "Split payment discrepancy across multiple AAL activations",
    requestedBy: "Sarah Jenkins",
    requestedById: "u-4",
    requesterRole: "State Manager",
    requesterEmail: "sarah.jenkins@techno-communications.com",
    requesterPhone: "+1 (512) 555-0188",
    requesterDepartment: "Texas State Leadership",
    areasToReview: ["POS Registers", "Sales Floor"],
    notes:
      "Three consecutive AAL activations recorded mixed cash/card tenders with missing printed receipts. Cross-check all Mix Payment tenders between 13:00 and 18:00 against BDI activation timestamps.",
    status: "Report Requested",
    createdAt: "2026-10-24T10:30:00Z",
  },
  {
    id: "SRV-REQ-302",
    storeId: "store-105",
    storeName: "Store #105 - Domain Austin",
    storeNumber: "105",
    marketName: "Austin Metro",
    districtName: "District 3",
    incidentDate: "2026-10-22",
    shift: "Shift Handover (15:00 - 16:00)",
    investigationType: "Cash Handover Dispute",
    priority: "medium",
    title: "Full-day audit following sales rep shift handover dispute",
    requestedBy: "David Kim",
    requestedById: "u-2",
    requesterRole: "Market Manager",
    requesterEmail: "david.kim@techno-communications.com",
    requesterPhone: "+1 (214) 555-0192",
    requesterDepartment: "Regional Store Operations",
    areasToReview: ["POS Registers", "Backroom / Safe"],
    notes:
      "Morning and evening reps reported conflicting cash drawer starting balances at 15:30 shift change. Audit full shift handover window and verify physical drawer count.",
    status: "Report Requested",
    createdAt: "2026-10-23T09:20:00Z",
  },
  {
    id: "SRV-REQ-101",
    storeId: "store-101",
    storeName: "Store #101 - Uptown Dallas",
    storeNumber: "101",
    marketName: "Dallas North",
    districtName: "District 1",
    incidentDate: "2026-10-18",
    shift: "Evening Shift (16:00 - 00:00)",
    investigationType: "Cash Drawer Shortage",
    priority: "high",
    title: "Discrepancy of $340 at Register #2 end of shift",
    requestedBy: "David Kim",
    requestedById: "u-2",
    requesterRole: "Market Manager",
    requesterEmail: "david.kim@techno-communications.com",
    requesterPhone: "+1 (214) 555-0192",
    requesterDepartment: "Regional Store Operations",
    areasToReview: ["POS 1 Register", "POS 2 Register", "Backroom / Safe"],
    notes:
      "Closing drawer count was short $340. Cashier stated multiple bill jams occurred around 20:30. Please inspect camera feeds focusing on the register and safe transfers.",
    status: "Report Received",
    createdAt: "2026-10-18T22:15:00Z",
    approvedBy: "System Admin",
    approvedAt: "2026-10-19T09:30:00Z",
    linkedReportId: "SRV-REP-202",
    preparedBy: "Michael Sterling",
    preparedById: "agt-102",
    preparedByEmail: "m.sterling@techno-communications.com",
    preparedByPhone: "+1 (214) 555-0821",
    preparedByRole: "Asset Protection Auditor",
    preparedByDepartment: "Surveillance & Loss Prevention",
    preparedAt: "2026-10-20T14:10:00Z",
    reportStatus: "Pending Review",
  },
  {
    id: "SRV-REQ-103",
    storeId: "store-105",
    storeName: "Store #105 - Domain Austin",
    storeNumber: "105",
    marketName: "Austin Metro",
    districtName: "District 3",
    incidentDate: "2026-10-16",
    shift: "Closing Shift (20:00 - 23:00)",
    investigationType: "Suspicious Activity",
    priority: "medium",
    title: "Full shift register & back delivery gate security verification",
    requestedBy: "Sarah Jenkins",
    requestedById: "u-4",
    requesterRole: "State Manager",
    requesterEmail: "sarah.jenkins@techno-communications.com",
    requesterPhone: "+1 (512) 555-0188",
    requesterDepartment: "Texas State Leadership",
    areasToReview: ["Backroom / Safe", "Customer Entrance"],
    notes:
      "Night security officer flagged two individuals repeatedly checking back dock door handle.",
    status: "Approved",
    createdAt: "2026-10-15T23:50:00Z",
    approvedBy: "Sarah Jenkins",
    approvedAt: "2026-10-16T08:00:00Z",
    linkedReportId: "SRV-REP-201",
    preparedBy: "Alex Rivera",
    preparedById: "agt-101",
    preparedByEmail: "alex.rivera@techno-communications.com",
    preparedByPhone: "+1 (512) 555-0177",
    preparedByRole: "Surveillance Lead Specialist",
    preparedByDepartment: "Surveillance & Asset Protection",
    preparedAt: "2026-10-16T11:45:00Z",
    reportStatus: "Approved",
    reportApprovedBy: "Sarah Jenkins",
    reportApprovedAt: "2026-10-16T15:20:00Z",
    managerRating: 5,
    managerComments:
      "Thorough review and precise footage timestamps. Excellent work providing actionable recommendations for dock security.",
  },
  {
    id: "SRV-REQ-105",
    storeId: "store-102",
    storeName: "Store #102 - Galleria Mall",
    storeNumber: "102",
    marketName: "Dallas North",
    districtName: "District 1",
    incidentDate: "2026-10-12",
    shift: "Afternoon Shift (12:00 - 17:00)",
    investigationType: "Safety Incident",
    priority: "medium",
    title: "Slip and fall incident claim in entrance vestibule",
    requestedBy: "Elena Rostova",
    requestedById: "u-6",
    requesterRole: "District Manager",
    requesterEmail: "elena.rostova@techno-communications.com",
    requesterPhone: "+1 (214) 555-0133",
    requesterDepartment: "District 1 Operations",
    areasToReview: ["Customer Entrance", "Sales Floor"],
    notes:
      "Customer claimed floor mat was misaligned. Store staff reported warning cones were already in place.",
    status: "Rejected",
    createdAt: "2026-10-12T16:20:00Z",
    linkedReportId: "SRV-REP-203",
    preparedBy: "Jessica Taylor",
    preparedById: "agt-103",
    preparedByEmail: "j.taylor@techno-communications.com",
    preparedByPhone: "+1 (210) 555-0163",
    preparedByRole: "Field Security Inspector",
    preparedByDepartment: "Internal Audit",
    preparedAt: "2026-10-12T18:10:00Z",
    reportStatus: "Rejected",
    reportApprovedBy: "System Admin",
    reportApprovedAt: "2026-10-13T09:15:00Z",
    rejectionReason:
      "Submitted footage timestamps did not include the 15-minute window prior to the reported incident.",
    managerComments:
      "Submitted footage timestamps did not include the 15-minute window prior to the reported incident.",
  },
];

export const INITIAL_SURVEILLANCE_REPORTS: SurveillanceReport[] = [
  {
    id: "SRV-REP-201",
    requestId: "SRV-REQ-103",
    investigatorName: "Alex Rivera",
    investigatorId: "agt-101",
    investigatorEmail: "alex.rivera@techno-communications.com",
    investigatorPhone: "+1 (512) 555-0177",
    investigatorRole: "Surveillance Lead Specialist",
    investigatorDepartment: "Surveillance & Asset Protection",
    submittedAt: "2026-10-16T11:45:00Z",
    status: "Approved",
    marketName: "Austin Metro",
    rows: [
      makeAuditRow({
        id: "r201-1",
        date: "10/16/2026",
        marketName: "Austin Metro",
        storeName: "Store #105 - Domain Austin",
        time: "9:35:00 AM",
        salesRep: "Abdul Razzak",
        transType: "Store Opened",
        difference: "$0.00",
        rowHighlight: "opening",
      }),
      makeAuditRow({
        id: "r201-2",
        date: "10/16/2026",
        marketName: "Austin Metro",
        storeName: "Store #105 - Domain Austin",
        invoice: "140511",
        cashTime: "10:01:00 AM",
        time: "9:59:00 AM",
        bdiTime: "10:02:00 AM",
        salesRep: "Abdul Razzak",
        transType: "Bill Payment",
        nb: "NB",
        invoiceAmount: "$146.00",
        totalTaken: "$146.00",
        card: "$146.00",
        difference: "$0.00",
        receipt: "YES",
        showingPhone: "YES",
        smartPayMentioned: "YES",
      }),
      makeAuditRow({
        id: "r201-3",
        date: "10/16/2026",
        marketName: "Austin Metro",
        storeName: "Store #105 - Domain Austin",
        time: "10:03:00 AM",
        salesRep: "Dakshay Raval",
        transType: "Client",
        nb: "NB",
        difference: "$0.00",
        pitchNb: "YES",
        pitchQuality: "AVG",
        showingPhone: "YES",
        accOffered: "YES",
      }),
      makeAuditRow({
        id: "r201-4",
        date: "10/16/2026",
        marketName: "Austin Metro",
        storeName: "Store #105 - Domain Austin",
        invoice: "140512",
        cashTime: "10:14:00 AM",
        time: "10:12:00 AM",
        bdiTime: "10:15:00 AM",
        salesRep: "Dakshay Raval",
        transType: "Bill Payment",
        b: "B",
        invoiceAmount: "$122.60",
        totalTaken: "$122.00",
        cash: "$122.00",
        difference: "($0.60)",
        receipt: "YES",
        notes: "Minor coin rounding variance observed at register.",
        attachments: [
          {
            id: "att-r201-4",
            name: "Reg1_1014_CoinTray.jpg",
            size: 312400,
            type: "image/jpeg",
          },
        ],
      }),
      makeAuditRow({
        id: "r201-5",
        date: "10/16/2026",
        marketName: "Austin Metro",
        storeName: "Store #105 - Domain Austin",
        invoice: "140519",
        cashTime: "12:08:00 PM",
        time: "12:04:00 PM",
        bdiTime: "12:22:00 PM",
        salesRep: "Abdul Razzak",
        transType: "REVVL Tab / ACT Pay",
        nb: "NB",
        invoiceAmount: "$62.57",
        totalTaken: "$65.00",
        cash: "$65.00",
        difference: "$2.43",
        receipt: "YES",
        splitPayments: "YES",
        mim: "YES",
        pitchNb: "YES",
        pitchQuality: "AVG",
        showingPhone: "YES",
        accOffered: "YES",
        maximize: "YES",
        bundleAccGiven: "YES",
        attachments: [
          {
            id: "att-r201-16",
            name: "RevvlTab_Bundle_1208.jpg",
            size: 428100,
            type: "image/jpeg",
          },
        ],
      }),
    ],
    date: "2026-10-16",
    storeName: "Store #105 - Domain Austin",
    invoiceNo: "140511 – 140519 (5 Rows)",
    cashTime: "10:01:00 AM",
    time: "9:35:00 AM",
    bdiTime: "10:02:00 AM",
    salesRep: "Abdul Razzak, Dakshay Raval",
    transType: "Full Shift Audit (5 Entries)",
    clientType: "Billable",
    invoiceAmount: "$331.17",
    totalTaken: "$333.00",
    paymentMode: "Split",
    difference: "$1.83",
    receipt: "Yes",
    splitPayments: "Yes",
    fraudTransactions: "No",
    refundInvoice: "No",
    missOpportunity: "No",
    paymentFraud: "No",
    aalSwap: "No",
    mim: "Yes",
    notes:
      "Full shift transaction log verified. All bill payments, activations, and REVVL tablet bundles reconciled.",
    pitchNb: "Yes",
    pitchQuality: "AVG",
    pitchNotes: "Sales reps consistently pitched tablet promotions on walk-ins.",
    showingPhone: "Yes",
    accOffered: "Yes",
    maximize: "Yes",
    flipping: "No",
    bundleNb: "Standard Bundle",
    bundleStartB: "Case",
    bundleEndB: "Tempered Glass",
    bundleAccGiven: "Yes",
    portIn: "No",
    nonUp: "No",
    smartPayMentioned: "Yes",
    aalBillSame: "Yes",
    onlineRejectedPayment: "No",
    nameOfRepLeaving: "None",
    timeLeft: "—",
    timeReturned: "—",
    backRoomTimeIn: "11:32:00 AM",
    backRoomTimeOut: "11:36:00 AM",
    offline: "No",
    attachments: [
      { id: "att-1", name: "Gate_Cam03_Shift_Log.jpg", size: 450200, type: "image/jpeg" },
      {
        id: "att-2",
        name: "Domain_Austin_Audit_Sheet.pdf",
        size: 1240000,
        type: "application/pdf",
      },
    ],
    managerRating: 5,
    managerComments:
      "Thorough review and precise footage timestamps. Excellent work providing complete row-by-row register reconciliation.",
    reviewedBy: "Sarah Jenkins",
    reviewedAt: "2026-10-16T15:20:00Z",
  },
  {
    id: "SRV-REP-202",
    requestId: "SRV-REQ-101",
    investigatorName: "Michael Sterling",
    investigatorId: "agt-102",
    investigatorEmail: "m.sterling@techno-communications.com",
    investigatorPhone: "+1 (214) 555-0821",
    investigatorRole: "Asset Protection Auditor",
    investigatorDepartment: "Surveillance & Loss Prevention",
    submittedAt: "2026-10-20T14:10:00Z",
    status: "Report Received",
    marketName: "Dallas North",
    rows: [
      makeAuditRow({
        id: "r202-1",
        date: "10/18/2026",
        marketName: "Dallas North",
        storeName: "Store #101 - Uptown Dallas",
        time: "4:00:00 PM",
        salesRep: "Marcus Young",
        transType: "Store Opened",
        difference: "$0.00",
        rowHighlight: "opening",
      }),
      makeAuditRow({
        id: "r202-2",
        date: "10/18/2026",
        marketName: "Dallas North",
        storeName: "Store #101 - Uptown Dallas",
        invoice: "78408",
        cashTime: "4:22:00 PM",
        time: "4:19:00 PM",
        bdiTime: "4:24:00 PM",
        salesRep: "Marcus Young",
        transType: "Bill Payment",
        nb: "NB",
        invoiceAmount: "$95.00",
        totalTaken: "$95.00",
        card: "$95.00",
        difference: "$0.00",
        receipt: "YES",
        pitchNb: "YES",
        pitchQuality: "GOOD",
        showingPhone: "YES",
        accOffered: "YES",
      }),
      makeAuditRow({
        id: "r202-4",
        date: "10/18/2026",
        marketName: "Dallas North",
        storeName: "Store #101 - Uptown Dallas",
        invoice: "78409",
        cashTime: "5:15:00 PM",
        time: "5:08:00 PM",
        bdiTime: "5:18:00 PM",
        salesRep: "Marcus Young",
        transType: "ACT Pay",
        b: "B",
        invoiceAmount: "$184.50",
        totalTaken: "$184.50",
        cash: "$100.00",
        card: "$84.50",
        difference: "$0.00",
        receipt: "YES",
        splitPayments: "YES",
        mim: "YES",
        showingPhone: "YES",
        accOffered: "YES",
        maximize: "YES",
        bundleNb: "3-Acc",
        bundleStartB: "Case, Glass",
        bundleEndB: "20W Adapter",
        bundleAccGiven: "YES",
        portIn: "YES",
        smartPayMentioned: "YES",
        attachments: [
          {
            id: "att-r202-4",
            name: "SplitPay_Receipt_78409.pdf",
            size: 215000,
            type: "application/pdf",
          },
        ],
      }),
      makeAuditRow({
        id: "r202-7",
        date: "10/18/2026",
        marketName: "Dallas North",
        storeName: "Store #101 - Uptown Dallas",
        invoice: "78412",
        cashTime: "8:25:00 PM",
        time: "8:29:00 PM",
        bdiTime: "8:31:00 PM",
        salesRep: "Elena Cole",
        transType: "Refunded ACC",
        b: "B",
        invoiceAmount: "$340.00",
        totalTaken: "$0.00",
        cash: "$0.00",
        difference: "($340.00)",
        receipt: "NO",
        fraudTransactions: "YES",
        refundInvoice: "INV-78412",
        paymentFraud: "YES",
        onlineRejectedPayment: "YES",
        notes:
          "Cashier reversed $340 cash payment after customer departed; cash removed from Register #2 drawer at 20:29:14.",
        pitchNb: "NO",
        pitchQuality: "POOR",
        nonUp: "YES",
        nameOfRepLeaving: "Elena Cole",
        timeLeft: "8:45:00 PM",
        timeReturned: "—",
        backRoomTimeIn: "8:34:00 PM",
        backRoomTimeOut: "8:39:00 PM",
        attachments: [
          {
            id: "att-r202-7a",
            name: "POS2_CashDrawer_2029_Angle.jpg",
            size: 520400,
            type: "image/jpeg",
          },
          {
            id: "att-r202-7b",
            name: "Register2_Journal_78412.pdf",
            size: 640000,
            type: "application/pdf",
          },
        ],
      }),
    ],
    date: "2026-10-18",
    storeName: "Store #101 - Uptown Dallas",
    invoiceNo: "78408 – 78412 (4 Rows)",
    cashTime: "20:25",
    time: "20:29",
    bdiTime: "20:31",
    salesRep: "Elena Cole, Marcus Young",
    transType: "Evening Shift Audit (4 Entries)",
    clientType: "Billable",
    invoiceAmount: "$619.50",
    totalTaken: "$279.50",
    paymentMode: "Cash",
    difference: "($340.00)",
    receipt: "No",
    splitPayments: "Yes",
    fraudTransactions: "Yes",
    refundInvoice: "Yes",
    missOpportunity: "Yes",
    paymentFraud: "Yes",
    aalSwap: "No",
    mim: "Yes",
    notes:
      "At 20:29:14 during transaction reversal of $340 (Invoice #78412), cashier opened cash drawer and removed three $100 bills and two $20 bills. Closing count discrepancy confirmed.",
    pitchNb: "No",
    pitchQuality: "Poor",
    pitchNotes: "Bypassed drawer counting protocol during 8:29 PM reversal.",
    showingPhone: "No",
    accOffered: "No",
    maximize: "No",
    flipping: "No",
    bundleNb: "None",
    bundleStartB: "—",
    bundleEndB: "—",
    bundleAccGiven: "No",
    portIn: "No",
    nonUp: "Yes",
    smartPayMentioned: "No",
    aalBillSame: "No",
    onlineRejectedPayment: "Yes",
    nameOfRepLeaving: "Elena Cole",
    timeLeft: "20:45",
    timeReturned: "—",
    backRoomTimeIn: "20:34",
    backRoomTimeOut: "20:39",
    offline: "No",
    attachments: [
      { id: "att-3", name: "POS2_CashDrawer_2029_Angle.jpg", size: 520400, type: "image/jpeg" },
      { id: "att-4", name: "Register2_Journal_Audit.pdf", size: 980000, type: "application/pdf" },
    ],
  },
  {
    id: "SRV-REP-203",
    requestId: "SRV-REQ-105",
    investigatorName: "Jessica Taylor",
    investigatorId: "agt-103",
    investigatorEmail: "j.taylor@techno-communications.com",
    investigatorPhone: "+1 (210) 555-0163",
    investigatorRole: "Field Security Inspector",
    investigatorDepartment: "Internal Audit",
    submittedAt: "2026-10-12T18:10:00Z",
    status: "Rejected",
    marketName: "Dallas North",
    reviewedBy: "System Admin",
    reviewedAt: "2026-10-13T09:15:00Z",
    managerComments:
      "Submitted footage timestamps did not include the 15-minute window prior to the reported incident.",
    rows: [
      makeAuditRow({
        id: "r203-1",
        date: "10/12/2026",
        marketName: "Dallas North",
        storeName: "Store #102 - Galleria Mall",
        invoice: "INV-64210",
        cashTime: "2:12 PM",
        time: "2:10:00 PM",
        bdiTime: "2:14 PM",
        salesRep: "Ryan Brooks",
        transType: "ACC",
        b: "B",
        invoiceAmount: "$49.00",
        totalTaken: "$49.00",
        card: "$49.00",
        difference: "$0.00",
        receipt: "YES",
        notes: "Vestibule camera reviewed at 2:10 PM; caution cone visible near mat edge.",
        pitchQuality: "GOOD",
        showingPhone: "YES",
        accOffered: "YES",
        attachments: [
          {
            id: "att-203-1",
            name: "Entrance_Vestibule_1410.jpg",
            size: 384200,
            type: "image/jpeg",
          },
        ],
      }),
    ],
    date: "2026-10-12",
    storeName: "Store #102 - Galleria Mall",
    invoiceNo: "INV-64210",
    cashTime: "14:12",
    time: "14:10",
    bdiTime: "14:14",
    salesRep: "Ryan Brooks",
    transType: "ACC",
    clientType: "Billable",
    invoiceAmount: "$49.00",
    totalTaken: "$49.00",
    paymentMode: "Card",
    difference: "$0.00",
    receipt: "Yes",
    splitPayments: "No",
    fraudTransactions: "No",
    refundInvoice: "No",
    missOpportunity: "No",
    paymentFraud: "No",
    aalSwap: "No",
    mim: "No",
    notes: "Vestibule camera reviewed at 2:10 PM; caution cone visible near mat edge.",
    pitchNb: "No",
    pitchQuality: "Good",
    pitchNotes: "Standard accessory checkout.",
    showingPhone: "Yes",
    accOffered: "Yes",
    maximize: "No",
    flipping: "No",
    bundleNb: "None",
    bundleStartB: "—",
    bundleEndB: "—",
    bundleAccGiven: "No",
    portIn: "No",
    nonUp: "No",
    smartPayMentioned: "No",
    aalBillSame: "Yes",
    onlineRejectedPayment: "No",
    nameOfRepLeaving: "None",
    timeLeft: "—",
    timeReturned: "—",
    backRoomTimeIn: "—",
    backRoomTimeOut: "—",
    offline: "No",
  },
  {
    id: "SRV-REP-204",
    requestId: "SRV-REQ-106",
    investigatorName: "Omar Farooq",
    investigatorId: "agt-104",
    investigatorEmail: "omar.farooq@techno-communications.com",
    investigatorPhone: "+1 (713) 555-0248",
    investigatorRole: "Surveillance Analyst",
    investigatorDepartment: "Surveillance & Asset Protection",
    submittedAt: "2026-10-14T16:40:00Z",
    status: "Approved",
    marketName: "Houston Central",
    managerRating: 4,
    managerComments: "Clear transaction breakdown and accurate verification of safe drop logs.",
    reviewedBy: "David Kim",
    reviewedAt: "2026-10-15T09:05:00Z",
    rows: [
      makeAuditRow({
        id: "r204-1",
        date: "10/14/2026",
        marketName: "Houston Central",
        storeName: "Store #104 - The Woodlands",
        time: "9:00:00 AM",
        salesRep: "Abdul Razzak",
        transType: "Store Opened",
        difference: "$0.00",
        rowHighlight: "opening",
      }),
      makeAuditRow({
        id: "r204-2",
        date: "10/14/2026",
        marketName: "Houston Central",
        storeName: "Store #104 - The Woodlands",
        invoice: "99210",
        cashTime: "11:12:00 AM",
        time: "11:05:00 AM",
        bdiTime: "11:15:00 AM",
        salesRep: "Abdul Razzak",
        transType: "REVVL Tab / ACT Pay",
        b: "B",
        invoiceAmount: "$118.00",
        totalTaken: "$118.00",
        card: "$118.00",
        difference: "$0.00",
        receipt: "YES",
        pitchNb: "YES",
        pitchQuality: "GOOD",
        showingPhone: "YES",
        accOffered: "YES",
        bundleAccGiven: "YES",
        notes: "Promotional REVVL tablet pitched and completed per guidelines.",
      }),
      makeAuditRow({
        id: "r204-3",
        date: "10/14/2026",
        marketName: "Houston Central",
        storeName: "Store #104 - The Woodlands",
        invoice: "99214",
        cashTime: "2:40:00 PM",
        time: "2:36:00 PM",
        bdiTime: "2:42:00 PM",
        salesRep: "Marcus Young",
        transType: "Bill Payment",
        nb: "NB",
        invoiceAmount: "$85.00",
        totalTaken: "$85.00",
        cash: "$85.00",
        difference: "$0.00",
        receipt: "YES",
        pitchNb: "YES",
        pitchQuality: "AVG",
        notes: "Dual-custody mid-shift safe drop verified on Backroom Cam #2.",
      }),
    ],
    date: "2026-10-14",
    storeName: "Store #104 - The Woodlands",
    invoiceNo: "99210 – 99214 (3 Rows)",
    cashTime: "11:12:00 AM",
    time: "9:00:00 AM",
    bdiTime: "11:15:00 AM",
    salesRep: "Abdul Razzak, Marcus Young",
    transType: "Operational Audit (3 Entries)",
    clientType: "Billable",
    invoiceAmount: "$203.00",
    totalTaken: "$203.00",
    paymentMode: "Split",
    difference: "$0.00",
    receipt: "Yes",
    splitPayments: "No",
    fraudTransactions: "No",
    refundInvoice: "No",
    missOpportunity: "No",
    paymentFraud: "No",
    aalSwap: "No",
    mim: "No",
    notes: "Promotional REVVL tablet pitch and dual-custody safe drop verified.",
    pitchNb: "Yes",
    pitchQuality: "Good",
    pitchNotes: "Consistent promotional offers across morning traffic.",
    showingPhone: "Yes",
    accOffered: "Yes",
    maximize: "Yes",
    flipping: "No",
    bundleNb: "Standard Bundle",
    bundleStartB: "Case",
    bundleEndB: "Screen Protector",
    bundleAccGiven: "Yes",
    portIn: "No",
    nonUp: "No",
    smartPayMentioned: "Yes",
    aalBillSame: "Yes",
    onlineRejectedPayment: "No",
    nameOfRepLeaving: "None",
    timeLeft: "—",
    timeReturned: "—",
    backRoomTimeIn: "2:44:00 PM",
    backRoomTimeOut: "2:47:00 PM",
    offline: "No",
  },
];

export const DUMMY_SURVEILLANCE_AGENTS: SurveillanceAssignableAgent[] = [
  {
    id: "agt-101",
    fullName: "Alex Rivera",
    email: "alex.rivera@techno-communications.com",
    phone: "+1 (512) 555-0177",
    role: "Surveillance Lead Specialist",
    department: "Surveillance & Asset Protection",
    activeAssignments: 2,
  },
  {
    id: "agt-102",
    fullName: "Michael Sterling",
    email: "m.sterling@techno-communications.com",
    phone: "+1 (214) 555-0821",
    role: "Asset Protection Auditor",
    department: "Surveillance & Loss Prevention",
    activeAssignments: 2,
  },
  {
    id: "agt-103",
    fullName: "Jessica Taylor",
    email: "j.taylor@techno-communications.com",
    phone: "+1 (210) 555-0163",
    role: "Field Security Inspector",
    department: "Internal Audit",
    activeAssignments: 0,
  },
  {
    id: "agt-104",
    fullName: "Omar Farooq",
    email: "omar.farooq@techno-communications.com",
    phone: "+1 (713) 555-0248",
    role: "Surveillance Analyst",
    department: "Surveillance & Asset Protection",
    activeAssignments: 1,
  },
  {
    id: "agt-105",
    fullName: "Hannah Brooks",
    email: "hannah.brooks@techno-communications.com",
    phone: "+1 (972) 555-0319",
    role: "Senior Audit Specialist",
    department: "Surveillance & Loss Prevention",
    activeAssignments: 3,
  },
  {
    id: "agt-106",
    fullName: "Daniel Mercer",
    email: "d.mercer@techno-communications.com",
    phone: "+1 (512) 555-0405",
    role: "Surveillance Auditor",
    department: "Internal Audit",
    activeAssignments: 0,
  },
];

export const INITIAL_VALIDATION_REQUESTS: SurveillanceValidationItem[] = [
  {
    id: "SRV-REQ-308",
    storeId: "store-101",
    storeName: "Store #101 - Uptown Dallas",
    storeNumber: "101",
    marketName: "Dallas North",
    districtName: "District 1",
    surveillanceDate: "2026-10-26",
    priority: "high",
    title: "Unreconciled $285 cash shortage at POS Register #2 closing count",
    notes:
      "Closing shift lead reported a $285 variance between BDI log and physical safe drop around 20:45. Please verify all cash bill payments and voids between 17:00 and 21:00.",
    requestedBy: "David Kim",
    requesterRole: "Market Manager",
    requesterEmail: "david.kim@techno-communications.com",
    requesterPhone: "+1 (214) 555-0192",
    requesterDepartment: "Regional Store Operations",
    createdAt: "2026-10-27T08:15:00Z",
    validationStatus: "Unassigned",
  },
  {
    id: "SRV-REQ-102",
    storeId: "store-103",
    storeName: "Store #103 - Downtown Houston",
    storeNumber: "103",
    marketName: "Houston Central",
    districtName: "District 2",
    surveillanceDate: "2026-10-25",
    priority: "high",
    title: "High-value accessory shelf missing 4 flagship wireless earbuds",
    notes:
      "Auditor noticed empty acrylic pegs on front row. Need review of customer traffic between 11:00 and 14:00.",
    requestedBy: "Marcus Vance",
    requesterRole: "District Manager",
    requesterEmail: "marcus.vance@techno-communications.com",
    requesterPhone: "+1 (713) 555-0144",
    requesterDepartment: "District 2 Operations",
    createdAt: "2026-10-25T14:40:00Z",
    validationStatus: "Unassigned",
  },
  {
    id: "SRV-REQ-306",
    storeId: "store-105",
    storeName: "Store #105 - Domain Austin",
    storeNumber: "105",
    marketName: "Austin Metro",
    districtName: "District 3",
    surveillanceDate: "2026-10-25",
    priority: "medium",
    title: "Late store opening and unattended sales floor check",
    notes:
      "Scheduled store opening was 10:00 AM, but alarm disarm log registered at 10:34 AM. Please review entrance timestamps and sales rep arrival.",
    requestedBy: "Sarah Jenkins",
    requesterRole: "State Manager",
    requesterEmail: "sarah.jenkins@techno-communications.com",
    requesterPhone: "+1 (512) 555-0188",
    requesterDepartment: "Texas State Leadership",
    createdAt: "2026-10-26T15:10:00Z",
    validationStatus: "Unassigned",
  },
  {
    id: "SRV-REQ-107",
    storeId: "store-102",
    storeName: "Store #102 - Galleria Mall",
    storeNumber: "102",
    marketName: "Dallas North",
    districtName: "District 1",
    surveillanceDate: "2026-10-26",
    priority: "medium",
    title: "Backroom inventory door propped open during afternoon shift",
    notes:
      "District walkthrough noted backroom security door left unlatched. Requesting full afternoon review of backroom entry/exit compliance.",
    requestedBy: "Elena Rostova",
    requesterRole: "District Manager",
    requesterEmail: "elena.rostova@techno-communications.com",
    requesterPhone: "+1 (214) 555-0133",
    requesterDepartment: "District 1 Operations",
    createdAt: "2026-10-26T15:05:00Z",
    validationStatus: "Unassigned",
  },
  {
    id: "SRV-REQ-303",
    storeId: "store-106",
    storeName: "Store #106 - Riverwalk Center",
    storeNumber: "106",
    marketName: "San Antonio",
    districtName: "District 4",
    surveillanceDate: "2026-10-23",
    priority: "high",
    title: "Split payment discrepancy across multiple AAL activations",
    notes:
      "Three consecutive AAL activations recorded mixed cash/card tenders with missing printed receipts.",
    requestedBy: "Sarah Jenkins",
    requesterRole: "State Manager",
    requesterEmail: "sarah.jenkins@techno-communications.com",
    requesterPhone: "+1 (512) 555-0188",
    requesterDepartment: "Texas State Leadership",
    createdAt: "2026-10-24T10:30:00Z",
    validationStatus: "Assigned",
    assignedAgentId: "agt-102",
    assignedAgentName: "Michael Sterling",
    assignedAgentEmail: "m.sterling@techno-communications.com",
    assignedAgentPhone: "+1 (214) 555-0821",
    assignedAgentRole: "Asset Protection Auditor",
    assignedBy: "System Admin",
    assignedAt: "2026-10-24T11:15:00Z",
    adminInstructions:
      "Cross-check all Mix Payment tenders between 13:00 and 18:00 against BDI activation timestamps and attach register screenshots.",
  },
  {
    id: "SRV-REQ-302",
    storeId: "store-105",
    storeName: "Store #105 - Domain Austin",
    storeNumber: "105",
    marketName: "Austin Metro",
    districtName: "District 3",
    surveillanceDate: "2026-10-22",
    priority: "medium",
    title: "Full-day audit following sales rep shift handover dispute",
    notes:
      "Morning and evening reps reported conflicting cash drawer starting balances at 15:30 shift change.",
    requestedBy: "David Kim",
    requesterRole: "Market Manager",
    requesterEmail: "david.kim@techno-communications.com",
    requesterPhone: "+1 (214) 555-0192",
    requesterDepartment: "Regional Store Operations",
    createdAt: "2026-10-23T09:20:00Z",
    validationStatus: "Assigned",
    assignedAgentId: "agt-104",
    assignedAgentName: "Omar Farooq",
    assignedAgentEmail: "omar.farooq@techno-communications.com",
    assignedAgentPhone: "+1 (713) 555-0248",
    assignedAgentRole: "Surveillance Analyst",
    assignedBy: "System Admin",
    assignedAt: "2026-10-23T10:05:00Z",
    adminInstructions:
      "Audit full shift handover window (15:00 - 16:00) and verify physical drawer count on Camera #1.",
  },
  {
    id: "SRV-REQ-101",
    storeId: "store-101",
    storeName: "Store #101 - Uptown Dallas",
    storeNumber: "101",
    marketName: "Dallas North",
    districtName: "District 1",
    surveillanceDate: "2026-10-18",
    priority: "high",
    title: "Discrepancy of $340 at Register #2 end of shift",
    notes:
      "Closing drawer count was short $340. Cashier stated multiple bill jams occurred around 20:30. Please inspect camera feeds focusing on the register and safe transfers.",
    requestedBy: "David Kim",
    requesterRole: "Market Manager",
    requesterEmail: "david.kim@techno-communications.com",
    requesterPhone: "+1 (214) 555-0192",
    requesterDepartment: "Regional Store Operations",
    createdAt: "2026-10-18T22:15:00Z",
    validationStatus: "Reports Received",
    assignedAgentId: "agt-102",
    assignedAgentName: "Michael Sterling",
    assignedAgentEmail: "m.sterling@techno-communications.com",
    assignedAgentPhone: "+1 (214) 555-0821",
    assignedAgentRole: "Asset Protection Auditor",
    assignedBy: "System Admin",
    assignedAt: "2026-10-19T09:30:00Z",
    linkedReportId: "SRV-REP-202",
    reportSubmittedAt: "2026-10-20T14:10:00Z",
    reportStatus: "Pending Review",
  },
  {
    id: "SRV-REQ-105",
    storeId: "store-102",
    storeName: "Store #102 - Galleria Mall",
    storeNumber: "102",
    marketName: "Dallas North",
    districtName: "District 1",
    surveillanceDate: "2026-10-12",
    priority: "medium",
    title: "Slip and fall incident claim in entrance vestibule",
    notes:
      "Customer claimed floor mat was misaligned. Store staff reported warning cones were already in place.",
    requestedBy: "Elena Rostova",
    requesterRole: "District Manager",
    requesterEmail: "elena.rostova@techno-communications.com",
    requesterPhone: "+1 (214) 555-0133",
    requesterDepartment: "District 1 Operations",
    createdAt: "2026-10-12T16:20:00Z",
    validationStatus: "Rejected",
    assignedAgentId: "agt-103",
    assignedAgentName: "Jessica Taylor",
    assignedAgentEmail: "j.taylor@techno-communications.com",
    assignedAgentPhone: "+1 (210) 555-0163",
    assignedAgentRole: "Field Security Inspector",
    assignedBy: "System Admin",
    assignedAt: "2026-10-12T16:45:00Z",
    linkedReportId: "SRV-REP-203",
    reportSubmittedAt: "2026-10-12T18:10:00Z",
    reportStatus: "Rejected",
    reportReviewedBy: "System Admin",
    reportReviewedAt: "2026-10-13T09:15:00Z",
    rejectedBy: "System Admin",
    rejectedAt: "2026-10-13T09:15:00Z",
    rejectionReason:
      "Submitted footage timestamps did not include the 15-minute window prior to the reported incident.",
    managerComments:
      "Submitted footage timestamps did not include the 15-minute window prior to the reported incident.",
  },
  {
    id: "SRV-REQ-301",
    storeId: "store-101",
    storeName: "Store #101 - Uptown Dallas",
    storeNumber: "101",
    marketName: "Dallas North",
    districtName: "District 1",
    surveillanceDate: "2026-10-21",
    priority: "low",
    title: "Duplicate check request for parking lot exterior lighting",
    notes: "Exterior landlord pole light flickering after 19:00.",
    requestedBy: "Elena Rostova",
    requesterRole: "District Manager",
    requesterEmail: "elena.rostova@techno-communications.com",
    requesterPhone: "+1 (214) 555-0133",
    requesterDepartment: "District 1 Operations",
    createdAt: "2026-10-22T08:00:00Z",
    validationStatus: "Rejected",
    rejectedBy: "System Admin",
    rejectedAt: "2026-10-22T08:45:00Z",
    rejectionReason:
      "Outside surveillance audit scope — exterior landlord lighting maintenance should be logged in the Ticketing portal under Facilities.",
  },
  {
    id: "SRV-REQ-103",
    storeId: "store-105",
    storeName: "Store #105 - Domain Austin",
    storeNumber: "105",
    marketName: "Austin Metro",
    districtName: "District 3",
    surveillanceDate: "2026-10-16",
    priority: "medium",
    title: "Full shift register & back delivery gate security verification",
    notes:
      "Night security officer flagged two individuals repeatedly checking back dock door handle; also verify full morning-to-afternoon register logs.",
    requestedBy: "Sarah Jenkins",
    requesterRole: "State Manager",
    requesterEmail: "sarah.jenkins@techno-communications.com",
    requesterPhone: "+1 (512) 555-0188",
    requesterDepartment: "Texas State Leadership",
    createdAt: "2026-10-15T23:50:00Z",
    validationStatus: "Completed",
    assignedAgentId: "agt-101",
    assignedAgentName: "Alex Rivera",
    assignedAgentEmail: "alex.rivera@techno-communications.com",
    assignedAgentPhone: "+1 (512) 555-0177",
    assignedAgentRole: "Surveillance Lead Specialist",
    assignedBy: "Sarah Jenkins",
    assignedAt: "2026-10-16T08:00:00Z",
    linkedReportId: "SRV-REP-201",
    reportSubmittedAt: "2026-10-16T11:45:00Z",
    reportStatus: "Approved",
    reportReviewedBy: "Sarah Jenkins",
    reportReviewedAt: "2026-10-16T15:20:00Z",
    managerRating: 5,
    managerComments:
      "Thorough review and precise footage timestamps. Excellent work providing actionable recommendations for dock security.",
  },
  {
    id: "SRV-REQ-106",
    storeId: "store-104",
    storeName: "Store #104 - The Woodlands",
    storeNumber: "104",
    marketName: "Houston Central",
    districtName: "District 2",
    surveillanceDate: "2026-10-14",
    priority: "low",
    title: "Quarterly REVVL Tab promo pitch & safe drop compliance audit",
    notes:
      "Routine verification of promotional tablet pitch adherence and dual-custody safe drop procedures.",
    requestedBy: "David Kim",
    requesterRole: "Market Manager",
    requesterEmail: "david.kim@techno-communications.com",
    requesterPhone: "+1 (214) 555-0192",
    requesterDepartment: "Regional Store Operations",
    createdAt: "2026-10-14T09:15:00Z",
    validationStatus: "Completed",
    assignedAgentId: "agt-104",
    assignedAgentName: "Omar Farooq",
    assignedAgentEmail: "omar.farooq@techno-communications.com",
    assignedAgentPhone: "+1 (713) 555-0248",
    assignedAgentRole: "Surveillance Analyst",
    assignedBy: "David Kim",
    assignedAt: "2026-10-14T10:00:00Z",
    linkedReportId: "SRV-REP-204",
    reportSubmittedAt: "2026-10-14T16:40:00Z",
    reportStatus: "Approved",
    reportReviewedBy: "David Kim",
    reportReviewedAt: "2026-10-15T09:05:00Z",
    managerRating: 4,
    managerComments: "Clear transaction breakdown and accurate verification of safe drop logs.",
  },
];

// ============================================================================
// In-Memory Static Data Store & Local MMKV Draft Helpers (Zero Backend APIs)
// ============================================================================

const surveillanceDraftMMKV = new MMKV({
  id: "surveillance-audit-drafts",
});

const ACTIVE_SESSION_KEY = "active-session";

let requestReportsStore: SurveillanceRequest[] = INITIAL_REQUEST_REPORTS.map((item) => ({
  ...item,
}));
let agentRequestsStore: SurveillanceRequest[] = INITIAL_SURVEILLANCE_REQUESTS.map((item) => ({
  ...item,
}));
let reportsStore: SurveillanceReport[] = INITIAL_SURVEILLANCE_REPORTS.map((rep) => ({
  ...rep,
  rows: rep.rows ? rep.rows.map((r) => ({ ...r })) : undefined,
}));
let validationQueueStore: SurveillanceValidationItem[] = INITIAL_VALIDATION_REQUESTS.map(
  (item) => ({ ...item }),
);
let assignableAgentsStore: SurveillanceAssignableAgent[] = DUMMY_SURVEILLANCE_AGENTS.map(
  (agent) => ({ ...agent }),
);

function getRowKey(requestId: string, rowId: string): string {
  return `request:${requestId}:row:${rowId}`;
}

function getRequestIndexKey(requestId: string): string {
  return `request:${requestId}:row-index`;
}

export function saveStaticDraftRow(
  requestId: string,
  row: SurveillanceAuditRow,
  rowOrder: number,
): SavedAuditRowRecord {
  const savedAt = new Date().toISOString();
  const record: SavedAuditRowRecord = {
    requestId,
    row: {
      ...row,
      otherDetails: row.otherDetails ? { ...row.otherDetails } : undefined,
      attachments: row.attachments ? [...row.attachments] : undefined,
    },
    rowOrder,
    savedAt,
  };

  surveillanceDraftMMKV.setJSON(getRowKey(requestId, row.id), record);

  const indexKey = getRequestIndexKey(requestId);
  const currentIds = surveillanceDraftMMKV.getJSON<string[]>(indexKey) || [];
  if (!currentIds.includes(row.id)) {
    currentIds.push(row.id);
    surveillanceDraftMMKV.setJSON(indexKey, currentIds);
  }

  return record;
}

export function getStaticDraftRows(requestId: string): SavedAuditRowRecord[] {
  const indexKey = getRequestIndexKey(requestId);
  const indexedIds = surveillanceDraftMMKV.getJSON<string[]>(indexKey) || [];
  const prefix = `request:${requestId}:row:`;

  const allRowKeys = surveillanceDraftMMKV.getAllKeys().filter((k) => k.startsWith(prefix));

  const orderedIds = Array.from(
    new Set([...indexedIds, ...allRowKeys.map((k) => k.slice(prefix.length))]),
  );

  const records: SavedAuditRowRecord[] = [];
  for (const rowId of orderedIds) {
    const rec = surveillanceDraftMMKV.getJSON<SavedAuditRowRecord>(getRowKey(requestId, rowId));
    if (rec && rec.row) {
      records.push(rec);
    }
  }

  return records.sort((a, b) => a.rowOrder - b.rowOrder);
}

export function removeStaticDraftRow(requestId: string, rowId: string): void {
  surveillanceDraftMMKV.delete(getRowKey(requestId, rowId));
  const indexKey = getRequestIndexKey(requestId);
  const currentIds = surveillanceDraftMMKV.getJSON<string[]>(indexKey) || [];
  const nextIds = currentIds.filter((id) => id !== rowId);
  if (nextIds.length > 0) {
    surveillanceDraftMMKV.setJSON(indexKey, nextIds);
  } else {
    surveillanceDraftMMKV.delete(indexKey);
  }
}

export function clearStaticRequestDraft(requestId: string): void {
  const prefix = `request:${requestId}:row:`;
  for (const key of surveillanceDraftMMKV.getAllKeys()) {
    if (key.startsWith(prefix)) {
      surveillanceDraftMMKV.delete(key);
    }
  }
  surveillanceDraftMMKV.delete(getRequestIndexKey(requestId));

  const active = getStaticActiveDraftSession();
  if (active?.requestId === requestId) {
    clearStaticActiveDraftSession();
  }
}

export function saveStaticActiveDraftSession(requestId: string, isEditing: boolean): void {
  const session: ActiveSurveillanceDraftSession = {
    requestId,
    isEditing,
    updatedAt: new Date().toISOString(),
  };
  surveillanceDraftMMKV.setJSON(ACTIVE_SESSION_KEY, session);
}

export function getStaticActiveDraftSession(): ActiveSurveillanceDraftSession | undefined {
  return surveillanceDraftMMKV.getJSON<ActiveSurveillanceDraftSession>(ACTIVE_SESSION_KEY);
}

export function clearStaticActiveDraftSession(): void {
  surveillanceDraftMMKV.delete(ACTIVE_SESSION_KEY);
}

export function getStaticStores(): StaticStoreOption[] {
  return AVAILABLE_STORES.map((s) => ({ ...s }));
}

export function getStaticRequestReports(): SurveillanceRequest[] {
  return requestReportsStore.map((r) => ({ ...r }));
}

export function createStaticRequestReport(
  payload: CreateSurveillanceRequestPayload,
  requester?: {
    name?: string;
    role?: string;
    email?: string;
    phone?: string;
    department?: string;
  },
): SurveillanceRequest & { isDuplicate?: boolean } {
  const duplicate = requestReportsStore.find(
    (r) => r.storeId === payload.storeId && r.incidentDate.trim() === payload.incidentDate.trim(),
  );
  if (duplicate) {
    return { ...duplicate, isDuplicate: true };
  }

  const createdAt = new Date().toISOString();
  const nextNum = 400 + requestReportsStore.length + 1;
  const newId = `SRV-REQ-${nextNum}`;

  const created: SurveillanceRequest = {
    id: newId,
    storeId: payload.storeId,
    storeName: payload.storeName,
    storeNumber: payload.storeNumber,
    marketName: payload.marketName,
    districtName: payload.districtName,
    incidentDate: payload.incidentDate,
    shift: payload.shift,
    investigationType: payload.investigationType,
    priority: payload.priority,
    title: payload.title,
    requestedBy: requester?.name || "System Admin",
    requestedById: "static-user",
    requesterRole: requester?.role || "Manager",
    requesterEmail: requester?.email || "manager@techno-communications.com",
    requesterPhone: requester?.phone || "+1 (214) 555-0192",
    requesterDepartment: requester?.department || "Store Operations",
    areasToReview: payload.areasToReview,
    notes: payload.notes,
    status: "Pending",
    createdAt,
  };

  requestReportsStore = [created, ...requestReportsStore];

  // Also add to the static validation queue so it appears in Validate and Assign during UI testing
  validationQueueStore = [
    {
      id: created.id,
      storeId: created.storeId,
      storeName: created.storeName,
      storeNumber: created.storeNumber,
      marketName: created.marketName,
      districtName: created.districtName,
      surveillanceDate: created.incidentDate,
      priority: created.priority,
      title: created.title,
      notes: created.notes,
      requestedBy: created.requestedBy,
      requesterRole: created.requesterRole,
      requesterEmail: created.requesterEmail || "manager@techno-communications.com",
      requesterPhone: created.requesterPhone || "+1 (214) 555-0192",
      requesterDepartment: created.requesterDepartment || "Store Operations",
      createdAt: created.createdAt,
      validationStatus: "Unassigned",
    },
    ...validationQueueStore,
  ];

  return { ...created };
}

export function getStaticAgentRequests(): SurveillanceRequest[] {
  return agentRequestsStore.map((r) => ({ ...r }));
}

export function getStaticReports(): SurveillanceReport[] {
  return reportsStore.map((r) => ({
    ...r,
    rows: r.rows ? r.rows.map((row) => ({ ...row })) : undefined,
  }));
}

export function getStaticReportById(id: string): SurveillanceReport | null {
  const found = reportsStore.find((r) => r.id === id);
  if (!found) return null;
  return {
    ...found,
    rows: found.rows ? found.rows.map((row) => ({ ...row })) : undefined,
  };
}

export function getStaticRequestById(id: string): SurveillanceRequest | null {
  const fromRequests = requestReportsStore.find((r) => r.id === id);
  if (fromRequests) return { ...fromRequests };
  const fromAgents = agentRequestsStore.find((r) => r.id === id);
  if (fromAgents) return { ...fromAgents };
  return null;
}

export function submitStaticAuditReport(
  payload: CreateSurveillanceReportPayload,
  submitter?: {
    name?: string;
    email?: string;
    phone?: string;
    role?: string;
    department?: string;
  },
): SurveillanceReport {
  const submittedAt = new Date().toISOString();
  const reportId = `SRV-REP-${210 + reportsStore.length + 1}`;
  const investigatorName = submitter?.name || "Michael Sterling";
  const investigatorEmail = submitter?.email || "m.sterling@techno-communications.com";
  const investigatorPhone = submitter?.phone || "+1 (214) 555-0821";
  const investigatorRole = submitter?.role || "Asset Protection Auditor";
  const investigatorDepartment = submitter?.department || "Surveillance & Loss Prevention";

  const createdReport: SurveillanceReport = {
    id: reportId,
    requestId: payload.requestId,
    investigatorName,
    investigatorEmail,
    investigatorPhone,
    investigatorRole,
    investigatorDepartment,
    submittedAt,
    status: "Report Received",
    rows: payload.rows ? payload.rows.map((r) => ({ ...r })) : undefined,
    date: payload.date,
    marketName: payload.marketName,
    storeName: payload.storeName,
    invoiceNo: payload.invoiceNo,
    cashTime: payload.cashTime,
    time: payload.time,
    bdiTime: payload.bdiTime,
    salesRep: payload.salesRep,
    transType: payload.transType,
    transTypeDetails: payload.transTypeDetails,
    clientType: payload.clientType,
    clientTypeDetails: payload.clientTypeDetails,
    invoiceAmount: payload.invoiceAmount,
    totalTaken: payload.totalTaken,
    paymentMode: payload.paymentMode,
    difference: payload.difference,
    receipt: payload.receipt,
    receiptDetails: payload.receiptDetails,
    splitPayments: payload.splitPayments,
    fraudTransactions: payload.fraudTransactions,
    fraudTransactionsDetails: payload.fraudTransactionsDetails,
    refundInvoice: payload.refundInvoice,
    missOpportunity: payload.missOpportunity,
    missOpportunityDetails: payload.missOpportunityDetails,
    paymentFraud: payload.paymentFraud,
    paymentFraudDetails: payload.paymentFraudDetails,
    aalSwap: payload.aalSwap,
    aalSwapDetails: payload.aalSwapDetails,
    mim: payload.mim,
    mimDetails: payload.mimDetails,
    notes: payload.notes,
    pitchNb: payload.pitchNb,
    pitchNbDetails: payload.pitchNbDetails,
    pitchNotes: payload.pitchNotes,
    pitchQuality: payload.pitchQuality,
    pitchQualityDetails: payload.pitchQualityDetails,
    showingPhone: payload.showingPhone,
    showingPhoneDetails: payload.showingPhoneDetails,
    accOffered: payload.accOffered,
    accOfferedDetails: payload.accOfferedDetails,
    maximize: payload.maximize,
    maximizeDetails: payload.maximizeDetails,
    flipping: payload.flipping,
    flippingDetails: payload.flippingDetails,
    bundleNb: payload.bundleNb,
    bundleStartB: payload.bundleStartB,
    bundleEndB: payload.bundleEndB,
    bundleAccGiven: payload.bundleAccGiven,
    bundleAccGivenDetails: payload.bundleAccGivenDetails,
    portIn: payload.portIn,
    portInDetails: payload.portInDetails,
    nonUp: payload.nonUp,
    nonUpDetails: payload.nonUpDetails,
    smartPayMentioned: payload.smartPayMentioned,
    smartPayMentionedDetails: payload.smartPayMentionedDetails,
    aalBillSame: payload.aalBillSame,
    aalBillSameDetails: payload.aalBillSameDetails,
    onlineRejectedPayment: payload.onlineRejectedPayment,
    onlineRejectedPaymentDetails: payload.onlineRejectedPaymentDetails,
    nameOfRepLeaving: payload.nameOfRepLeaving,
    timeLeft: payload.timeLeft,
    timeReturned: payload.timeReturned,
    backRoomTimeIn: payload.backRoomTimeIn,
    backRoomTimeOut: payload.backRoomTimeOut,
    offline: payload.offline,
    offlineDetails: payload.offlineDetails,
    attachments: payload.attachments,
  };

  reportsStore = [createdReport, ...reportsStore];

  agentRequestsStore = agentRequestsStore.map((r) =>
    r.id === payload.requestId
      ? {
          ...r,
          status: "Report Received",
          reportStatus: "Pending Review",
          linkedReportId: reportId,
          preparedBy: investigatorName,
          preparedByEmail: investigatorEmail,
          preparedByPhone: investigatorPhone,
          preparedByRole: investigatorRole,
          preparedByDepartment: investigatorDepartment,
          preparedAt: submittedAt,
        }
      : r,
  );

  requestReportsStore = requestReportsStore.map((r) =>
    r.id === payload.requestId
      ? {
          ...r,
          status: "Pending",
          reportStatus: "Pending Review",
          linkedReportId: reportId,
          preparedBy: investigatorName,
          preparedByEmail: investigatorEmail,
          preparedByPhone: investigatorPhone,
          preparedByRole: investigatorRole,
          preparedByDepartment: investigatorDepartment,
          preparedAt: submittedAt,
        }
      : r,
  );

  validationQueueStore = validationQueueStore.map((item) =>
    item.id === payload.requestId
      ? {
          ...item,
          validationStatus: "Reports Received",
          linkedReportId: reportId,
          reportSubmittedAt: submittedAt,
          reportStatus: "Pending Review",
          assignedAgentName: item.assignedAgentName || investigatorName,
          assignedAgentEmail: item.assignedAgentEmail || investigatorEmail,
          assignedAgentPhone: item.assignedAgentPhone || investigatorPhone,
          assignedAgentRole: item.assignedAgentRole || investigatorRole,
          rejectedBy: undefined,
          rejectedAt: undefined,
          rejectionReason: undefined,
        }
      : item,
  );

  return { ...createdReport };
}

export function reviewStaticReport(
  reportId: string,
  payload: {
    action: "approve" | "reject";
    comments?: string;
    rating?: number;
    reviewedBy: string;
  },
): SurveillanceReport {
  const idx = reportsStore.findIndex((r) => r.id === reportId);
  if (idx === -1) {
    throw new Error("Surveillance report not found.");
  }

  const reviewedAt = new Date().toISOString();
  const isApprove = payload.action === "approve";
  const updatedReport: SurveillanceReport = {
    ...reportsStore[idx],
    status: isApprove ? "Approved" : "Rejected",
    managerRating: payload.rating ?? reportsStore[idx].managerRating,
    managerComments: payload.comments?.trim() || reportsStore[idx].managerComments,
    reviewedBy: payload.reviewedBy,
    reviewedAt,
  };

  reportsStore[idx] = updatedReport;

  // Update matching Validate & Assign item ("Completed" on approval, "Rejected" on decline)
  let matchedValidationItem: SurveillanceValidationItem | undefined;
  validationQueueStore = validationQueueStore.map((item) => {
    if (item.linkedReportId === reportId || item.id === updatedReport.requestId) {
      const nextItem: SurveillanceValidationItem = {
        ...item,
        validationStatus: isApprove ? "Completed" : "Rejected",
        linkedReportId: reportId,
        reportStatus: isApprove ? "Approved" : "Rejected",
        reportReviewedBy: payload.reviewedBy,
        reportReviewedAt: reviewedAt,
        managerRating: updatedReport.managerRating,
        managerComments: updatedReport.managerComments,
        rejectedBy: !isApprove ? payload.reviewedBy : undefined,
        rejectedAt: !isApprove ? reviewedAt : undefined,
        rejectionReason: !isApprove
          ? updatedReport.managerComments || "Report declined during review."
          : undefined,
      };
      matchedValidationItem = nextItem;
      return nextItem;
    }
    return item;
  });

  // Update matching Request Reports item — once Completed, make report visible to Admin/Requester
  let foundInRequestReports = false;
  requestReportsStore = requestReportsStore.map((req) => {
    if (req.linkedReportId === reportId || req.id === updatedReport.requestId) {
      foundInRequestReports = true;
      return {
        ...req,
        status: isApprove ? "Completed" : "Pending",
        linkedReportId: reportId,
        preparedBy: req.preparedBy || updatedReport.investigatorName,
        preparedByEmail: req.preparedByEmail || updatedReport.investigatorEmail,
        preparedByPhone: req.preparedByPhone || updatedReport.investigatorPhone,
        preparedByRole: req.preparedByRole || updatedReport.investigatorRole,
        preparedByDepartment: req.preparedByDepartment || updatedReport.investigatorDepartment,
        preparedAt: req.preparedAt || updatedReport.submittedAt,
        reportStatus: isApprove ? "Approved" : "Rejected",
        reportApprovedBy: payload.reviewedBy,
        reportApprovedAt: reviewedAt,
        managerRating: updatedReport.managerRating,
        managerComments: updatedReport.managerComments,
        rejectionReason: !isApprove ? updatedReport.managerComments : undefined,
      };
    }
    return req;
  });

  // Ensure completed report is always visible in Request Reports even if request originated in validation queue
  if (isApprove && !foundInRequestReports && matchedValidationItem) {
    requestReportsStore = [
      {
        id: matchedValidationItem.id,
        storeId: matchedValidationItem.storeId,
        storeName: matchedValidationItem.storeName,
        storeNumber: matchedValidationItem.storeNumber,
        marketName: matchedValidationItem.marketName,
        districtName: matchedValidationItem.districtName,
        incidentDate: matchedValidationItem.surveillanceDate,
        shift: "Surveillance Review",
        investigationType: "Store Audit & Surveillance",
        priority: matchedValidationItem.priority,
        title: matchedValidationItem.title,
        requestedBy: matchedValidationItem.requestedBy,
        requestedById: "static-requester",
        requesterRole: matchedValidationItem.requesterRole,
        requesterEmail: matchedValidationItem.requesterEmail,
        requesterPhone: matchedValidationItem.requesterPhone,
        requesterDepartment: matchedValidationItem.requesterDepartment,
        areasToReview: ["POS Registers", "Sales Floor"],
        notes: matchedValidationItem.notes,
        status: "Completed",
        createdAt: matchedValidationItem.createdAt,
        approvedBy: matchedValidationItem.assignedBy,
        approvedAt: matchedValidationItem.assignedAt,
        linkedReportId: reportId,
        preparedBy: matchedValidationItem.assignedAgentName || updatedReport.investigatorName,
        preparedByEmail:
          matchedValidationItem.assignedAgentEmail || updatedReport.investigatorEmail,
        preparedByPhone:
          matchedValidationItem.assignedAgentPhone || updatedReport.investigatorPhone,
        preparedByRole: matchedValidationItem.assignedAgentRole || updatedReport.investigatorRole,
        preparedByDepartment:
          updatedReport.investigatorDepartment || "Surveillance & Loss Prevention",
        preparedAt: updatedReport.submittedAt,
        reportStatus: "Approved",
        reportApprovedBy: payload.reviewedBy,
        reportApprovedAt: reviewedAt,
        managerRating: updatedReport.managerRating,
        managerComments: updatedReport.managerComments,
      },
      ...requestReportsStore,
    ];
  }

  // Update matching Surveillance Reports agent item
  agentRequestsStore = agentRequestsStore.map((req) => {
    if (req.linkedReportId === reportId || req.id === updatedReport.requestId) {
      return {
        ...req,
        status: isApprove ? "Approved" : "Rejected",
        reportStatus: isApprove ? "Approved" : "Rejected",
        reportApprovedBy: payload.reviewedBy,
        reportApprovedAt: reviewedAt,
        managerRating: updatedReport.managerRating,
        managerComments: updatedReport.managerComments,
        rejectionReason: !isApprove ? updatedReport.managerComments : undefined,
      };
    }
    return req;
  });

  return { ...updatedReport };
}

export function getStaticValidationQueue(): SurveillanceValidationItem[] {
  return validationQueueStore.map((item) => ({ ...item }));
}

export function getStaticAssignableAgents(): SurveillanceAssignableAgent[] {
  return assignableAgentsStore.map((agent) => ({ ...agent }));
}

export function validateAndAssignStaticRequest(
  payload: ValidateAndAssignPayload,
): SurveillanceValidationItem {
  const targetIndex = validationQueueStore.findIndex((item) => item.id === payload.requestId);
  if (targetIndex === -1) {
    throw new Error("Surveillance request not found.");
  }

  const agent = assignableAgentsStore.find((a) => a.id === payload.agentId);
  if (!agent) {
    throw new Error("Selected surveillance agent not found.");
  }

  const existing = validationQueueStore[targetIndex];
  const assignedAt = new Date().toISOString();

  assignableAgentsStore = assignableAgentsStore.map((a) =>
    a.id === agent.id ? { ...a, activeAssignments: a.activeAssignments + 1 } : a,
  );

  const updated: SurveillanceValidationItem = {
    ...existing,
    priority: payload.priority,
    validationStatus: "Assigned",
    assignedAgentId: agent.id,
    assignedAgentName: agent.fullName,
    assignedAgentEmail: agent.email,
    assignedAgentPhone: agent.phone,
    assignedAgentRole: agent.role,
    assignedBy: payload.assignedBy,
    assignedAt,
    adminInstructions: payload.adminInstructions?.trim() || undefined,
    rejectedBy: undefined,
    rejectedAt: undefined,
    rejectionReason: undefined,
  };

  validationQueueStore[targetIndex] = updated;

  // Update Request Reports item with assigned agent details while keeping status "Pending"
  requestReportsStore = requestReportsStore.map((r) =>
    r.id === existing.id
      ? {
          ...r,
          status: r.status === "Completed" ? "Completed" : "Pending",
          preparedBy: agent.fullName,
          preparedByEmail: agent.email,
          preparedByPhone: agent.phone,
          preparedByRole: agent.role,
          preparedByDepartment: agent.department,
        }
      : r,
  );

  // Make validated request visible on Surveillance Reports for report preparation
  if (!agentRequestsStore.some((r) => r.id === existing.id)) {
    agentRequestsStore = [
      {
        id: existing.id,
        storeId: existing.storeId,
        storeName: existing.storeName,
        storeNumber: existing.storeNumber,
        marketName: existing.marketName,
        districtName: existing.districtName,
        incidentDate: existing.surveillanceDate,
        shift: "Surveillance Review",
        investigationType: "Store Audit & Surveillance",
        priority: existing.priority,
        title: existing.title,
        requestedBy: existing.requestedBy,
        requestedById: "static-requester",
        requesterRole: existing.requesterRole,
        requesterEmail: existing.requesterEmail,
        requesterPhone: existing.requesterPhone,
        requesterDepartment: existing.requesterDepartment,
        areasToReview: ["POS Registers", "Sales Floor"],
        notes: existing.notes,
        status: "Report Requested",
        createdAt: existing.createdAt,
      },
      ...agentRequestsStore,
    ];
  }

  return { ...updated };
}

export function rejectStaticValidationRequest(
  payload: RejectValidationPayload,
): SurveillanceValidationItem {
  const targetIndex = validationQueueStore.findIndex((item) => item.id === payload.requestId);
  if (targetIndex === -1) {
    throw new Error("Surveillance request not found.");
  }

  const existing = validationQueueStore[targetIndex];
  const updated: SurveillanceValidationItem = {
    ...existing,
    validationStatus: "Rejected",
    assignedAgentId: undefined,
    assignedAgentName: undefined,
    assignedAgentEmail: undefined,
    assignedAgentPhone: undefined,
    assignedAgentRole: undefined,
    assignedBy: undefined,
    assignedAt: undefined,
    adminInstructions: undefined,
    rejectedBy: payload.rejectedBy,
    rejectedAt: new Date().toISOString(),
    rejectionReason: payload.reason.trim(),
  };

  validationQueueStore[targetIndex] = updated;
  return { ...updated };
}
