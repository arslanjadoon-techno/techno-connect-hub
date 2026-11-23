import { useState } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { housingLeasingService } from "@/services/portals/housing-leasing";
import BulkUploadCard from "./components/BulkUploadCard";

const SECTIONS = [
  "General Information",
  "Agreement Clause",
  "Property Management Information",
  "Landlord Information",
] as const;

// Mirrors HousingLeaseDetailExcelTemplate (Enums/HousingLeaseEnums.cs) exactly -
// "UNIT ID" instead of Leasing's "TECH ID", and (per HousingLeaseEnums.cs /
// HousingLeasingService.cs) no Market Manager / Market Manager Phone Number
// columns in General Information - no Housing backend equivalent.
const SECTION_COLUMNS: Record<string, string[]> = {
  "General Information": [
    "UNIT ID",
    "Lease Start Date",
    "Lease Expiry Date",
    "Assignment Date",
    "Take Over Date",
    "Commencement Date Rent",
    "Lease Type",
    "Tenant / Entity Name",
    "Lease Signed By",
    "Status Date",
  ],
  "Agreement Clause": ["UNIT ID", "Appliances by Owner", "Appliances by Tenant"],
  "Property Management Information": [
    "UNIT ID",
    "Property Mgt Name",
    "Point of Contact",
    "Email",
    "Phone Number",
    "Address",
  ],
  "Landlord Information": [
    "UNIT ID",
    "Landlord",
    "Point of Contact",
    "Email",
    "Phone Number",
    "Address",
  ],
};

function downloadTemplate(section: string) {
  const columns = SECTION_COLUMNS[section];
  if (!columns) return;

  const groupRow = ["", ...columns.slice(1).map((_, i) => (i === 0 ? section : ""))];
  const worksheet = XLSX.utils.aoa_to_sheet([groupRow, columns]);
  if (columns.length > 2) {
    worksheet["!merges"] = [{ s: { r: 0, c: 1 }, e: { r: 0, c: columns.length - 1 } }];
  }
  worksheet["!cols"] = columns.map((h) => ({ wch: Math.max(h.length + 4, 14) }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  saveAs(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `Housing_Template_${section.replace(/\s+/g, "_")}.xlsx`,
  );
}

export default function BulkUploadLeaseDetailsPage() {
  const [section, setSection] = useState("");

  return (
    <div className="animate-fade-in pb-8">
      <BulkUploadCard
        title="Upload Lease Details Excel File"
        canUpload={Boolean(section)}
        onUpload={(file) => housingLeasingService.bulkUploadLeaseDetails(file, section)}
        controls={
          <Select value={section} onValueChange={setSection}>
            <SelectTrigger className="h-11 w-64">
              <SelectValue placeholder="Select Section" />
            </SelectTrigger>
            <SelectContent>
              {SECTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
        extraAction={
          section ? (
            <Button variant="outline" className="h-11" onClick={() => downloadTemplate(section)}>
              <Download className="mr-1.5 h-4 w-4" /> Download Template
            </Button>
          ) : undefined
        }
      />
    </div>
  );
}
