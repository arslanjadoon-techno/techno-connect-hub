import type {
  ChatGroup,
  ChatMessage,
  District,
  ExternalVendor,
  House,
  Market,
  State,
  Store,
  Ticket,
  User,
} from "../types";

const now = () => new Date().toISOString();

export const seedStates: State[] = [
  { id: "st-az", name: "Arizona", code: "AZ" },
  { id: "st-ca", name: "California", code: "CA" },
  { id: "st-tx", name: "Texas", code: "TX" },
  { id: "st-ar", name: "Arkansas", code: "AR" },
];

export const seedMarkets: Market[] = [
  { id: "mk-az1", name: "Arizona Metro", stateId: "st-az" },
  { id: "mk-ca1", name: "Bay Area", stateId: "st-ca" },
  { id: "mk-tx1", name: "Dallas", stateId: "st-tx" },
  { id: "mk-ar1", name: "Little Rock", stateId: "st-ar" },
];

export const seedDistricts: District[] = [
  { id: "ds-az-n", name: "Phoenix North", stateId: "st-az", marketId: "mk-az1" },
  { id: "ds-az-s", name: "Phoenix South", stateId: "st-az", marketId: "mk-az1" },
  { id: "ds-ca-sf", name: "SF District",   stateId: "st-ca", marketId: "mk-ca1" },
  { id: "ds-tx-d", name: "Dallas Central", stateId: "st-tx", marketId: "mk-tx1" },
  { id: "ds-ar-lr", name: "LR Central",    stateId: "st-ar", marketId: "mk-ar1" },
];

export const seedStores: Store[] = [
  { id: "sto-1", name: "Techno Phoenix #1", code: "AZ-001", stateId: "st-az", marketId: "mk-az1", districtId: "ds-az-n", address: "123 Main St, Phoenix, AZ" },
  { id: "sto-2", name: "Techno Phoenix #2", code: "AZ-002", stateId: "st-az", marketId: "mk-az1", districtId: "ds-az-s", address: "55 Sun Ave, Phoenix, AZ" },
  { id: "sto-3", name: "Techno SF #1",      code: "CA-001", stateId: "st-ca", marketId: "mk-ca1", districtId: "ds-ca-sf", address: "9 Market St, SF, CA" },
  { id: "sto-4", name: "Techno Dallas #1",  code: "TX-001", stateId: "st-tx", marketId: "mk-tx1", districtId: "ds-tx-d", address: "200 Elm St, Dallas, TX" },
  { id: "sto-5", name: "Techno LR #1",      code: "AR-001", stateId: "st-ar", marketId: "mk-ar1", districtId: "ds-ar-lr", address: "8 Capitol Ave, LR, AR" },
];

export const seedHouses: House[] = [
  { id: "hs-1", name: "Phoenix Warehouse",  address: "900 Storage Rd, Phoenix, AZ", stateId: "st-az" },
  { id: "hs-2", name: "Dallas Back Office", address: "12 Office Park, Dallas, TX",   stateId: "st-tx" },
];

export const seedUsers: User[] = [
  { id: "u-admin",   firstName: "Ayesha", lastName: "Khan",   email: "admin@techno.com",   department: "IT",          role: "admin", avatarColor: "#c9a84c" },
  { id: "u-mgr-fin", firstName: "Bilal",  lastName: "Ahmed",  email: "finance.mgr@techno.com", department: "Finance",  role: "manager", avatarColor: "#0d7a5f" },
  { id: "u-mgr-it",  firstName: "Sara",   lastName: "Iqbal",  email: "it.mgr@techno.com",  department: "IT",          role: "manager", avatarColor: "#3b6fa0" },
  { id: "u-mgr-mnt", firstName: "Hamza",  lastName: "Raza",   email: "mnt.mgr@techno.com", department: "Maintenance", role: "manager", avatarColor: "#9b4423" },
  { id: "u-state-az",firstName: "Omar",   lastName: "Siddiqi",email: "az.state@techno.com", department: "Operations", role: "state_manager",  stateId: "st-az",                       avatarColor: "#4f46e5" },
  { id: "u-mkt-bay", firstName: "Nida",   lastName: "Hussain",email: "bay.market@techno.com",department: "Operations", role: "market_manager", stateId: "st-ca", marketId: "mk-ca1",   avatarColor: "#e85d3a" },
  { id: "u-dist-az", firstName: "Faisal", lastName: "Malik",  email: "az.dist@techno.com",   department: "Operations", role: "district_manager", stateId: "st-az", marketId: "mk-az1", districtId: "ds-az-n", avatarColor: "#2dd4a8" },
  { id: "u-store-1", firstName: "Zara",   lastName: "Sheikh", email: "store1@techno.com",    department: "Operations", role: "store_manager",   stateId: "st-az", marketId: "mk-az1", districtId: "ds-az-n", storeId: "sto-1", avatarColor: "#c45c7c" },
  { id: "u-user-it", firstName: "Junaid", lastName: "Yousuf", email: "it.user@techno.com",   department: "IT",          role: "user", avatarColor: "#67e8f9" },
  { id: "u-user-fin",firstName: "Mariam", lastName: "Zaidi",  email: "fin.user@techno.com",  department: "Finance",     role: "user", avatarColor: "#a78bfa" },
];

export const seedVendors: ExternalVendor[] = [
  { id: "ev-1", name: "QuickFix HVAC",       phone: "+1 602 555 1010", marketId: "mk-az1", address: "Phoenix, AZ", natureOfWork: "HVAC repair" },
  { id: "ev-2", name: "Bay Electricals",     phone: "+1 415 555 2020", marketId: "mk-ca1", address: "SF, CA",      natureOfWork: "Electrical" },
  { id: "ev-3", name: "Dallas Plumbing Co.", phone: "+1 214 555 3030", marketId: "mk-tx1", address: "Dallas, TX",  natureOfWork: "Plumbing" },
];

export const seedTickets: Ticket[] = [
  {
    id: "TKT-1001",
    title: "POS terminal not booting",
    description: "Store POS shows black screen after power outage.",
    category: "store", locationId: "sto-1",
    department: "IT", priority: "high", status: "assigned",
    createdById: "u-store-1", assignType: "internal", assigneeId: "u-user-it",
    stateId: "st-az", marketId: "mk-az1", districtId: "ds-az-n",
    createdAt: now(), updatedAt: now(),
    history: [
      { status: "pending", at: now(), by: "u-store-1" },
      { status: "assigned", at: now(), by: "u-mgr-it" },
    ],
    comments: [],
  },
  {
    id: "TKT-1002",
    title: "AC leaking in stock room",
    description: "Water dripping near inventory shelves.",
    category: "store", locationId: "sto-3",
    department: "Maintenance", priority: "urgent", status: "pending",
    createdById: "u-mkt-bay",
    stateId: "st-ca", marketId: "mk-ca1", districtId: "ds-ca-sf",
    createdAt: now(), updatedAt: now(),
    history: [{ status: "pending", at: now(), by: "u-mkt-bay" }],
    comments: [],
  },
  {
    id: "TKT-1003",
    title: "Invoice mismatch — vendor #221",
    description: "Two duplicate invoices received for same PO.",
    category: "house", locationId: "hs-2",
    department: "Finance", priority: "medium", status: "hold",
    createdById: "u-user-fin", assignType: "internal", assigneeId: "u-mgr-fin",
    stateId: "st-tx",
    createdAt: now(), updatedAt: now(),
    history: [
      { status: "pending", at: now(), by: "u-user-fin" },
      { status: "assigned", at: now(), by: "u-mgr-fin" },
      { status: "hold", at: now(), by: "u-mgr-fin" },
    ],
    comments: [],
  },
  {
    id: "TKT-1004",
    title: "Generator service due",
    description: "Quarterly maintenance for backup generator.",
    category: "store", locationId: "sto-4",
    department: "Maintenance", priority: "low", status: "completed",
    createdById: "u-mgr-mnt", assignType: "external", externalVendorId: "ev-3",
    stateId: "st-tx", marketId: "mk-tx1", districtId: "ds-tx-d",
    createdAt: now(), updatedAt: now(),
    history: [
      { status: "pending", at: now(), by: "u-mgr-mnt" },
      { status: "assigned", at: now(), by: "u-mgr-mnt" },
      { status: "completed", at: now(), by: "ev-3" },
    ],
    comments: [],
  },
  {
    id: "TKT-1005",
    title: "New employee laptop setup",
    description: "Onboard new hire — Outlook + VPN access.",
    category: "house", locationId: "hs-1",
    department: "IT", priority: "medium", status: "closed",
    createdById: "u-admin", assignType: "internal", assigneeId: "u-user-it",
    stateId: "st-az",
    createdAt: now(), updatedAt: now(),
    history: [
      { status: "pending", at: now(), by: "u-admin" },
      { status: "assigned", at: now(), by: "u-mgr-it" },
      { status: "completed", at: now(), by: "u-user-it" },
      { status: "closed", at: now(), by: "u-admin" },
    ],
    comments: [],
  },
];

export const seedChatGroups: ChatGroup[] = [
  { id: "cg-it",    name: "IT Team",          department: "IT",          memberIds: ["u-admin","u-mgr-it","u-user-it"] },
  { id: "cg-fin",   name: "Finance Team",     department: "Finance",     memberIds: ["u-admin","u-mgr-fin","u-user-fin"] },
  { id: "cg-mnt",   name: "Maintenance Team", department: "Maintenance", memberIds: ["u-admin","u-mgr-mnt"] },
  { id: "cg-ops",   name: "Operations Team",  department: "Operations",  memberIds: ["u-admin","u-state-az","u-mkt-bay","u-dist-az","u-store-1"] },
];

export const seedChatMessages: ChatMessage[] = [
  { id: "m1", groupId: "cg-it", authorId: "u-mgr-it",  authorName: "Sara Iqbal", message: "Team, please check the POS tickets queue.", createdAt: now() },
  { id: "m2", groupId: "cg-it", authorId: "u-user-it", authorName: "Junaid Yousuf", message: "On it 👍", createdAt: now() },
  { id: "m3", groupId: "cg-fin",authorId: "u-mgr-fin", authorName: "Bilal Ahmed", message: "Month-end closing reminder.", createdAt: now() },
];
