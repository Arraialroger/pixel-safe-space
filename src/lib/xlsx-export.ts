import * as XLSX from "xlsx-js-style";

export type XlsxColumn = {
  header: string;
  /** Excel column width in characters */
  width?: number;
  /** Excel number format string (e.g. "R$ #,##0.00", "dd/mm/yyyy") */
  numFmt?: string;
};

type CellValue = string | number | Date | null | undefined;

const HEADER_STYLE = {
  font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11 },
  fill: { patternType: "solid", fgColor: { rgb: "1F2937" } },
  alignment: { horizontal: "left", vertical: "center" },
  border: {
    bottom: { style: "thin", color: { rgb: "111827" } },
  },
};

/**
 * Export rows to an XLSX file with a styled header row, column widths,
 * and per-column number formats.
 */
export function exportToXlsx(opts: {
  filename: string;
  sheetName?: string;
  columns: XlsxColumn[];
  rows: CellValue[][];
}) {
  const { filename, sheetName = "Dados", columns, rows } = opts;

  const aoa: CellValue[][] = [columns.map((c) => c.header), ...rows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Column widths
  ws["!cols"] = columns.map((c) => ({ wch: c.width ?? 18 }));

  // Freeze header row
  ws["!freeze"] = { xSplit: 0, ySplit: 1 };
  ws["!autofilter"] = {
    ref: XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: rows.length, c: columns.length - 1 },
    }),
  };

  // Style header row
  for (let c = 0; c < columns.length; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c });
    const cell = ws[addr];
    if (cell) cell.s = HEADER_STYLE;
  }

  // Apply per-column number formats to data cells
  columns.forEach((col, c) => {
    if (!col.numFmt) return;
    for (let r = 1; r <= rows.length; r++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = ws[addr];
      if (!cell) continue;
      cell.z = col.numFmt;
      cell.s = { ...(cell.s ?? {}), numFmt: col.numFmt };
    }
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename);
}
