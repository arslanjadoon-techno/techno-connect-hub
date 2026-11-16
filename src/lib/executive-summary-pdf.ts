import pdfMakeImport from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import type { LeaseRecord, RentScheduleItem } from "@/services/portals/leasing/types";

const pdfMake = pdfMakeImport as unknown as { vfs: Record<string, string>; createPdf: (def: unknown) => { download: (name: string) => void } };
pdfMake.vfs = (pdfFonts as unknown as { pdfMake?: { vfs: Record<string, string> } }).pdfMake?.vfs ?? (pdfFonts as unknown as { vfs: Record<string, string> }).vfs;

const dash = "—";

function text(value: unknown): string {
  if (value === null || value === undefined || value === "") return dash;
  return String(value);
}

function fmtDate(value?: string | null): string {
  if (!value) return dash;
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

function fmtMoney(value?: number | null): string {
  if (value === null || value === undefined) return dash;
  return `$${Number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function boolText(value: unknown): string {
  if (value === null || value === undefined || value === "") return dash;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function remainingTerm(expiry?: string | null): string {
  if (!expiry) return dash;
  const end = new Date(expiry);
  if (isNaN(end.getTime())) return dash;
  const today = new Date();
  if (end < today) return "Expired";
  let months = (end.getFullYear() - today.getFullYear()) * 12 + (end.getMonth() - today.getMonth());
  if (end.getDate() < today.getDate()) months -= 1;
  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} yr${years > 1 ? "s" : ""}`);
  if (remMonths > 0) parts.push(`${remMonths} mo${remMonths > 1 ? "s" : ""}`);
  return parts.length ? parts.join(" ") : "Less than a month";
}

function sectionHeading(title: string) {
  return { text: title, style: "sectionHeading", margin: [0, 12, 0, 6] as [number, number, number, number] };
}

function subHeading(title: string) {
  return { text: title, style: "subHeading", margin: [0, 6, 0, 4] as [number, number, number, number] };
}

function detailTable(rows: [string, string][]) {
  return {
    table: {
      widths: [160, "*"] as (number | string)[],
      body: [
        [
          { text: "Field", style: "tableHeader" },
          { text: "Details", style: "tableHeader" },
        ],
        ...rows.map(([field, value]) => [
          { text: field, style: "fieldCell" },
          { text: value, style: "valueCell" },
        ]),
      ],
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => "#cccccc",
      vLineColor: () => "#cccccc",
    },
    margin: [0, 0, 0, 4] as [number, number, number, number],
  };
}

function rentScheduleTable(schedule: RentScheduleItem[]) {
  const header = [
    { text: "Start Date", style: "tableHeader" },
    { text: "End Date", style: "tableHeader" },
    { text: "Rent", style: "tableHeader" },
    { text: "CAM", style: "tableHeader" },
    { text: "Other Charges", style: "tableHeader" },
    { text: "Total", style: "tableHeader" },
  ];
  const rows =
    schedule && schedule.length
      ? schedule.map((item) => [
          { text: fmtDate(item.startDate), style: "valueCell" },
          { text: fmtDate(item.endDate), style: "valueCell" },
          { text: fmtMoney(item.rent), style: "valueCell" },
          { text: fmtMoney(item.cam), style: "valueCell" },
          { text: fmtMoney(item.otherCharges), style: "valueCell" },
          { text: fmtMoney(item.total), style: "valueCell" },
        ])
      : [[{ text: "No rent schedule available", colSpan: 6, style: "valueCell", alignment: "center" }, {}, {}, {}, {}, {}]];
  return {
    table: {
      widths: ["*", "*", "*", "*", "*", "*"] as (number | string)[],
      body: [header, ...rows],
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => "#cccccc",
      vLineColor: () => "#cccccc",
    },
    margin: [0, 0, 0, 4] as [number, number, number, number],
  };
}

export function downloadExecutiveSummaryPdf(lease: LeaseRecord): void {
  const content: unknown[] = [
    { text: "Lease Summary", style: "title", margin: [0, 0, 0, 2] },
    { text: text(lease.storeName) + (lease.techId ? ` (${lease.techId})` : ""), style: "subtitle", margin: [0, 0, 0, 8] },

    sectionHeading("Section 1 — Store Information"),
    detailTable([
      ["TECH ID", text(lease.techId)],
      ["Store Name", text(lease.storeName)],
      ["Market", text(lease.marketName)],
      ["Market Manager", text(lease.marketManager)],
      ["Store Address", text(lease.storeAddress)],
      ["Store Phone", text(lease.storePhoneNumber)],
      ["Store Email", text(lease.storeEmail)],
    ]),

    sectionHeading("Section 2 — Tenant Details"),
    detailTable([
      ["Tenant / Entity Name", text(lease.entityName)],
      ["Lease Signed By", text(lease.leaseSignedBy)],
      ["Guarantor", text(lease.guarantor)],
      ["Guaranty Type", text(lease.guarantyType)],
    ]),

    sectionHeading("Section 3 — Landlord & Property Management"),
    subHeading("Landlord"),
    detailTable([
      ["Landlord Name", text(lease.landLordName)],
      ["Point of Contact", text(lease.landLordPointOfContact)],
      ["Email", text(lease.landLordEmail)],
      ["Phone Number", text(lease.landLordContactNumber)],
      ["Address", text(lease.landLordAddress)],
    ]),
    subHeading("Property Management"),
    detailTable([
      ["Property Mgt Name", text(lease.propertyMgtName)],
      ["Point of Contact", text(lease.propertyMgtPointOfContact)],
      ["Email", text(lease.propertyMgtEmail)],
      ["Phone Number", text(lease.propertyMgtPhoneNumber)],
      ["Address", text(lease.propertyMgtAddress)],
    ]),

    sectionHeading("Section 4 — Lease Details"),
    detailTable([
      ["Lease Type", text(lease.lease_Term)],
      ["Lease Start Date", fmtDate(lease.start_Date)],
      ["Lease Take Over Date", fmtDate(lease.takeOverDate)],
      ["Assignment Date (if applicable)", fmtDate(lease.assignmentDate)],
      ["Expiry Date", fmtDate(lease.expiry_Due)],
      ["Remaining Term", remainingTerm(lease.expiry_Due)],
    ]),

    sectionHeading("Section 6 — Termination Rights"),
    detailTable([
      ["Right to Termination (T-Mobile)", text(lease.rightToTermination)],
      ["Termination Notice Period", text(lease.noticePeriodBeforeTermination)],
    ]),

    sectionHeading("Section 7 — Financial Summary (Rent Schedule)"),
    rentScheduleTable(lease.rentSchedule ?? []),

    sectionHeading("Section 8 — Additional Lease Provisions"),
    detailTable([
      ["HVAC Responsibility", text(lease.hvac)],
      ["Exclusivity", text(lease.exclusivity)],
      ["Tenant Relocation", text(lease.relocation)],
      ["Option Period", boolText(lease.optionPeriod) === dash ? dash : `${boolText(lease.optionPeriod)}${lease.optionPeriodDuration ? ` (${lease.optionPeriodDuration})` : ""}`],
      ["Option Notice Date", fmtDate(lease.optionNoticeDate)],
      ["Security Deposit", text(lease.securityDeposit ?? lease.security_deposit)],
      ["Right to Sublease", text(lease.rightToSublease)],
      ["Subleased / Sublet", text(lease.subLease)],
    ]),
  ];

  const docDefinition = {
    pageSize: "A4",
    pageMargins: [40, 40, 40, 40] as [number, number, number, number],
    content,
    styles: {
      title: { fontSize: 18, bold: true },
      subtitle: { fontSize: 11, color: "#555555" },
      sectionHeading: { fontSize: 13, bold: true, color: "#1f2937" },
      subHeading: { fontSize: 11, bold: true, color: "#374151" },
      tableHeader: { bold: true, fontSize: 9, fillColor: "#f2f2f2", margin: [0, 2, 0, 2] },
      fieldCell: { fontSize: 9, bold: true, margin: [0, 2, 0, 2] },
      valueCell: { fontSize: 9, margin: [0, 2, 0, 2] },
    },
    defaultStyle: { fontSize: 9 },
  };

  const fileName = `Executive_Summary_${text(lease.techId)}.pdf`;
  pdfMake.createPdf(docDefinition).download(fileName);
}
