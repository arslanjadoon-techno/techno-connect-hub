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
  options: {
    sheetName?: string;
    fileName?: string;
    addRentHeaders?: boolean;
    year?: string | number;
    month?: string | number;
    groups?: { title: string; columns: string[] }[];
  } = {},
): void {
  if (!data || data.length === 0) {
    alert("No data available");
    return;
  }

  const {
    sheetName = "Sheet",
    fileName = "Export",
    addRentHeaders = false,
    year = "",
    month = "",
    groups,
  } = options;

  const MONTH_NAMES = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const monthLabel = month ? (MONTH_NAMES[Number(month) - 1] ?? String(month)) : "";

  const headers = columns.map(
    (key) => headerMap[key] || key.charAt(0).toUpperCase() + key.slice(1),
  );
  const dataRows = data.map((item) =>
    columns.map((key) => (item[key] as string | number | undefined) ?? ""),
  );

  const parentRow: string[] = [];
  const merges: { s: { r: number; c: number }; e: { r: number; c: number } }[] = [];
  if (groups && groups.length) {
    const colIndex = new Map(columns.map((key, idx) => [key, idx]));
    columns.forEach(() => parentRow.push(""));
    const parentRowIdx = addRentHeaders ? 3 : 0;
    for (const group of groups) {
      const indices = group.columns.map((c) => colIndex.get(c)).filter((i): i is number => i !== undefined).sort((a, b) => a - b);
      if (indices.length === 0) continue;
      parentRow[indices[0]] = group.title;
      merges.push({ s: { r: parentRowIdx, c: indices[0] }, e: { r: parentRowIdx, c: indices[indices.length - 1] } });
    }
  }

  const hasParent = groups && groups.length > 0;
  const topBlock = addRentHeaders
    ? [["Monthly Rent Sheets"], [`Month: ${monthLabel}    Year: ${year}`], []]
    : [];
  const headerBlock = hasParent ? [parentRow, headers] : [headers];
  const aoa = [...topBlock, ...headerBlock, ...dataRows];

  const worksheet = XLSX.utils.aoa_to_sheet(aoa);
  if (merges.length) {
    worksheet["!merges"] = (worksheet["!merges"] ?? []).concat(merges);
  }
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
  });

  saveAs(blob, `${fileName}.xlsx`);
}
