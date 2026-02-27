import type { Channel } from './types';

// ─── CSV column definitions ─────────────────────────────────────────────────

const CSV_COLUMNS = [
  'Index',
  'Name',
  'RX Freq (MHz)',
  'TX Freq (MHz)',
  'Offset (MHz)',
  'Mode',
  'Power',
  'Bandwidth',
  'Color Code',
  'Time Slot',
  'RX Only',
  'Admit Criteria',
  'Repeater Mode',
] as const;

/**
 * Map from lowercase/normalized column header to Channel field name.
 */
const HEADER_MAP: Record<string, keyof Channel | '_offset'> = {
  'index': 'index',
  'name': 'name',
  'rx freq (mhz)': 'rxFrequency',
  'rx freq': 'rxFrequency',
  'rx frequency': 'rxFrequency',
  'rxfrequency': 'rxFrequency',
  'tx freq (mhz)': 'txFrequency',
  'tx freq': 'txFrequency',
  'tx frequency': 'txFrequency',
  'txfrequency': 'txFrequency',
  'offset (mhz)': '_offset',
  'offset': '_offset',
  'txoffset': '_offset',
  'mode': 'mode',
  'power': 'power',
  'bandwidth': 'bandwidth',
  'color code': 'colorCode',
  'colorcode': 'colorCode',
  'cc': 'colorCode',
  'time slot': 'timeSlot',
  'timeslot': 'timeSlot',
  'ts': 'timeSlot',
  'rx only': 'rxOnly',
  'rxonly': 'rxOnly',
  'admit criteria': 'admitCriteria',
  'admitcriteria': 'admitCriteria',
  'repeater mode': 'repeaterMode',
  'repeatermode': 'repeaterMode',
};

// ─── Export ──────────────────────────────────────────────────────────────────

/**
 * Export an array of channels to a CSV string.
 */
export function exportChannelsCsv(channels: Channel[]): string {
  const rows: string[] = [];

  // Header row
  rows.push(CSV_COLUMNS.join(','));

  for (const ch of channels) {
    const offset =
      ch.repeaterMode === 'simplex'
        ? 0
        : ch.repeaterMode === 'negative'
          ? -ch.txOffset
          : ch.txOffset;

    const values: (string | number | boolean)[] = [
      ch.index,
      ch.name,
      ch.rxFrequency,
      ch.txFrequency,
      offset,
      ch.mode,
      ch.power,
      ch.bandwidth,
      ch.colorCode,
      ch.timeSlot,
      ch.rxOnly,
      ch.admitCriteria,
      ch.repeaterMode,
    ];

    rows.push(values.map(csvEscapeField).join(','));
  }

  return rows.join('\n');
}

/**
 * Escape a single CSV field: quote it if it contains commas, quotes, or newlines.
 */
function csvEscapeField(value: string | number | boolean): string {
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

// ─── Import ──────────────────────────────────────────────────────────────────

/**
 * Parse a CSV string into an array of partial Channel objects.
 * Handles quoted fields, trims whitespace, and maps headers case-insensitively.
 */
export function importChannelsCsv(csv: string): Partial<Channel>[] {
  const lines = splitCsvLines(csv);
  if (lines.length < 2) return [];

  const headerFields = parseCsvRow(lines[0]);
  const columnMapping = headerFields.map((h) => {
    const normalized = h.trim().toLowerCase();
    return HEADER_MAP[normalized] ?? null;
  });

  const results: Partial<Channel>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '') continue;

    const fields = parseCsvRow(line);
    const partial: Record<string, unknown> = {};
    let offsetValue: number | undefined;

    for (let col = 0; col < fields.length; col++) {
      const mapping = columnMapping[col];
      if (!mapping) continue;

      const raw = fields[col].trim();
      if (raw === '') continue;

      if (mapping === '_offset') {
        offsetValue = parseFloat(raw);
        continue;
      }

      partial[mapping] = coerceField(mapping, raw);
    }

    // Derive txOffset and repeaterMode from signed offset if provided
    if (offsetValue !== undefined && !('txOffset' in partial)) {
      if (offsetValue === 0) {
        partial.repeaterMode = 'simplex';
        partial.txOffset = 0;
      } else if (offsetValue < 0) {
        partial.repeaterMode = 'negative';
        partial.txOffset = Math.abs(offsetValue);
      } else {
        partial.repeaterMode = 'positive';
        partial.txOffset = offsetValue;
      }
    }

    if (Object.keys(partial).length > 0) {
      results.push(partial as Partial<Channel>);
    }
  }

  return results;
}

/**
 * Coerce a raw string value to the appropriate type for a Channel field.
 */
function coerceField(field: string, raw: string): string | number | boolean {
  switch (field) {
    case 'index':
    case 'colorCode':
    case 'timeSlot':
    case 'admitCriteria':
      return parseInt(raw, 10);

    case 'rxFrequency':
    case 'txFrequency':
    case 'txOffset':
      return parseFloat(raw);

    case 'rxOnly':
      return raw.toLowerCase() === 'true' || raw === '1';

    case 'mode':
      return raw.toLowerCase() === 'digital' ? 'digital' : 'analog';

    case 'power': {
      const p = raw.toLowerCase();
      if (p === 'low' || p === 'mid' || p === 'high' || p === 'turbo') return p;
      return raw.toLowerCase();
    }

    case 'bandwidth': {
      const b = raw.toLowerCase();
      return b === 'wide' ? 'wide' : 'narrow';
    }

    case 'repeaterMode': {
      const r = raw.toLowerCase();
      if (r === 'positive' || r === 'negative' || r === 'simplex') return r;
      if (r === '+' || r === 'pos') return 'positive';
      if (r === '-' || r === 'neg') return 'negative';
      return 'simplex';
    }

    default:
      return raw;
  }
}

/**
 * Split CSV text into lines, respecting quoted fields that span multiple lines.
 */
function splitCsvLines(text: string): string[] {
  const lines: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (ch === '"') {
      inQuotes = !inQuotes;
      current += ch;
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      // Skip \r\n as a single line break
      if (ch === '\r' && i + 1 < text.length && text[i + 1] === '\n') {
        i++;
      }
      lines.push(current);
      current = '';
    } else {
      current += ch;
    }
  }

  if (current.length > 0) {
    lines.push(current);
  }

  return lines;
}

/**
 * Parse a single CSV row into an array of field strings.
 * Handles RFC 4180 quoting: fields wrapped in double quotes, embedded quotes escaped as "".
 */
function parseCsvRow(row: string): string[] {
  const fields: string[] = [];
  let i = 0;

  while (i <= row.length) {
    if (i === row.length) {
      fields.push('');
      break;
    }

    if (row[i] === '"') {
      // Quoted field
      let value = '';
      i++; // skip opening quote
      while (i < row.length) {
        if (row[i] === '"') {
          if (i + 1 < row.length && row[i + 1] === '"') {
            // Escaped quote
            value += '"';
            i += 2;
          } else {
            // Closing quote
            i++; // skip closing quote
            break;
          }
        } else {
          value += row[i];
          i++;
        }
      }
      fields.push(value);
      // Skip comma after quoted field
      if (i < row.length && row[i] === ',') {
        i++;
      }
    } else {
      // Unquoted field
      const commaIdx = row.indexOf(',', i);
      if (commaIdx === -1) {
        fields.push(row.substring(i));
        break;
      } else {
        fields.push(row.substring(i, commaIdx));
        i = commaIdx + 1;
      }
    }
  }

  return fields;
}

// ─── Download helper ────────────────────────────────────────────────────────

/**
 * Trigger a browser download of the given CSV string as a file.
 */
export function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();

  // Clean up
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
