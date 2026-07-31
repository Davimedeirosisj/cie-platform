import * as XLSX from "xlsx";

export type ParsedSheet = {
  headers: string[];
  rows: Record<string, string>[];
};

/**
 * CSVs carry no encoding metadata, and SheetJS defaults to codepage 1252 for
 * them -- which turns UTF-8 accented names into mojibake ("COCÓ" -> "COCÃ").
 * Decode the bytes ourselves: try strict UTF-8 first (what TSE exports and
 * most modern tools produce), and fall back to windows-1252 for older files.
 */
function decodeCsv(buffer: ArrayBuffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder("windows-1252").decode(buffer);
  }
}

function isCsvLike(file: File): boolean {
  return /\.(csv|txt|tsv)$/i.test(file.name) || file.type === "text/csv";
}

export async function parseWorkbook(file: File): Promise<ParsedSheet> {
  const buffer = await file.arrayBuffer();

  // .xlsx is a zip with its own internal encoding, so it must stay binary;
  // only delimited text files need the manual decode above.
  const workbook = isCsvLike(file)
    ? XLSX.read(decodeCsv(buffer), { type: "string" })
    : XLSX.read(buffer, { type: "array" });

  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];

  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
    defval: "",
    raw: false,
  });

  const headers =
    rows.length > 0
      ? Object.keys(rows[0])
      : (XLSX.utils.sheet_to_json(sheet, { header: 1 })[0] as string[] | undefined) ?? [];

  return { headers, rows };
}
