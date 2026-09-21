import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

/**
 * Generic "array of objects -> downloaded .xlsx" helper, ported from
 * LeasingFrontend's ExcelWriter. Pass an explicit column order + header map
 * for anything beyond the default rent-sheet shape.
 */
export function exportToExcel<T extends Record<string, unknown>>(
  data: T[],
  columns: string[],
  headerMap: Record<string, string>,
  options: { sheetName?: string; fileName?: string; addRentHeaders?: boolean; year?: string | number; month?: string | number } = {},
): void {
  if (!data || data.length === 0) {
    alert("No data available");
    return;
  }

  const { sheetName = "Sheet", fileName = "Export", addRentHeaders = false, year = "", month = "" } = options;

  const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const monthLabel = month ? (MONTH_NAMES[Number(month) - 1] ?? String(month)) : "";

  const headers = columns.map((key) => headerMap[key] || key.charAt(0).toUpperCase() + key.slice(1));
  const dataRows = data.map((item) => columns.map((key) => (item[key] as string | number | undefined) ?? ""));

  const aoa = addRentHeaders
    ? [["Monthly Rent Sheets"], [`Month: ${monthLabel}    Year: ${year}`], [], headers, ...dataRows]
    : [headers, ...dataRows];

  const worksheet = XLSX.utils.aoa_to_sheet(aoa);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
  });

  saveAs(blob, `${fileName}.xlsx`);
}
