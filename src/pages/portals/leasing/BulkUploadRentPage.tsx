import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { leasingService } from "@/services/portals/leasing";
import BulkUploadCard from "./components/BulkUploadCard";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const YEARS = Array.from({ length: 10 }, (_, i) => 2026 + i);

export default function BulkUploadRentPage() {
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");

  return (
    <div className="animate-fade-in pb-8">
      <BulkUploadCard
        title="Upload Rent Excel File"
        canUpload={Boolean(year && month)}
        onUpload={(file) => leasingService.bulkUploadRent(file, year, month)}
        controls={
          <>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="h-11 w-44"><SelectValue placeholder="Select Month" /></SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, i) => (
                  <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="h-11 w-36"><SelectValue placeholder="Select Year" /></SelectTrigger>
              <SelectContent>
                {YEARS.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        }
      />
    </div>
  );
}
