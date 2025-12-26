import * as XLSX from 'xlsx';

export function normKey(k: string): string {
  return String(k || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/_/g, '')
    .replace(/-/g, '');
}

export function pick(row: Record<string, any>, keys: string[]): any {
  const map: Record<string, any> = {};
  for (const [k, v] of Object.entries(row)) map[normKey(k)] = v;
  for (const key of keys) {
    const v = map[normKey(key)];
    if (v !== undefined && v !== null && String(v).trim() !== '') return v;
  }
  return undefined;
}

export function asString(v: any): string | undefined {
  if (v === undefined || v === null) return undefined;
  const s = String(v).trim();
  return s ? s : undefined;
}

export function asNumber(v: any): number | undefined {
  if (v === undefined || v === null) return undefined;
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  const cleaned = String(v).replace(',', '.').replace(/[^\d.]/g, '').trim();
  if (!cleaned) return undefined;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : undefined;
}

export function parseExcelDate(v: any): Date | undefined {
  if (v === undefined || v === null || String(v).trim() === '') return undefined;
  if (v instanceof Date && !isNaN(v.getTime())) return v;
  if (typeof v === 'number') {
    // Excel serial date -> JS Date (UTC-ish)
    const utcDays = v - 25569;
    const utcValue = utcDays * 86400 * 1000;
    const d = new Date(utcValue);
    return isNaN(d.getTime()) ? undefined : d;
  }
  const s = String(v).trim();
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(s + 'T00:00:00');
    return isNaN(d.getTime()) ? undefined : d;
  }
  // DD.MM.YYYY or DD/MM/YYYY
  const m = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (m) {
    const dd = Number(m[1]);
    const mm = Number(m[2]);
    const yyyy = Number(m[3]);
    const d = new Date(yyyy, mm - 1, dd);
    return isNaN(d.getTime()) ? undefined : d;
  }
  // Fallback
  const d = new Date(s);
  return isNaN(d.getTime()) ? undefined : d;
}

export function readSheetRows(
  wb: XLSX.WorkBook,
  sheetName: string,
): Record<string, any>[] {
  const sheet = wb.Sheets[sheetName];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json(sheet, {
    defval: '',
    raw: false,
  }) as Record<string, any>[];
}

export function findSheetName(
  wb: XLSX.WorkBook,
  candidates: string[],
): string | undefined {
  const names = wb.SheetNames || [];
  const lower = new Map(names.map((n) => [n.toLowerCase(), n]));
  for (const c of candidates) {
    const found = lower.get(c.toLowerCase());
    if (found) return found;
  }
  return undefined;
}
