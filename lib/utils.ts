import * as XLSX from "xlsx";
import Papa from "papaparse";

// Extracts tabular data from an Excel file (Buffer or ArrayBuffer) and returns as Markdown table string
export function extractExcelToMarkdown(buffer: Buffer | ArrayBuffer): string {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  if (!json.length) return "(No data found in Excel sheet)";
  // Convert to Markdown table
  const rows = json as (string | number)[][];
  const header = rows[0];
  const body = rows.slice(1);
  const md = [
    `| ${header.join(" | ")} |`,
    `| ${header.map(() => "---").join(" | ")} |`,
    ...body.map(row => `| ${row.map(cell => String(cell ?? "")).join(" | ")} |`)
  ].join("\n");
  return md;
}

// Extracts tabular data from a CSV string and returns as Markdown table string
export function extractCsvToMarkdown(csvString: string): string {
  const result = Papa.parse(csvString.trim());
  if (!result.data.length) return "(No data found in CSV)";
  const rows = result.data as string[][];
  const header = rows[0];
  const body = rows.slice(1);
  const md = [
    `| ${header.join(" | ")} |`,
    `| ${header.map(() => "---").join(" | ")} |`,
    ...body.map(row => `| ${row.map(cell => String(cell ?? "")).join(" | ")} |`)
  ].join("\n");
  return md;
}
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
