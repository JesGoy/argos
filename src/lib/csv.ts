/**
 * Minimal CSV serialization. Quotes fields containing commas/quotes/newlines
 * and prepends a UTF-8 BOM so Excel opens accented text correctly.
 */
export type CsvCell = string | number | boolean | null | undefined;

function escapeCell(value: CsvCell): string {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const UTF8_BOM = '﻿';

export function toCsv(headers: string[], rows: CsvCell[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCell).join(','));
  return UTF8_BOM + lines.join('\r\n');
}

/**
 * Build a CSV download Response with an attachment filename.
 */
export function csvResponse(filename: string, csv: string): Response {
  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
