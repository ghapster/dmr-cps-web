// Decode/encode the 445-byte radio settings block from Anytone D578UV RDT files.
// Offsets are relative to the start of the settings block (file offset 0x17).

export interface RadioSettings {
  brightness: number;        // 1-10
  sqlLevelA: number;         // 0-9
  sqlLevelB: number;         // 0-9
  menuExitTime: number;      // seconds (10-65 range encoded as (sec-5)/5)
  shortKeyP1: number;
  shortKeyP2: number;
  shortKeyP3: number;
  shortKeyP4: number;
  shortKeyP5: number;
  shortKeyP6: number;
  shortKeyPA: number;
  shortKeyPB: number;
  shortKeyPC: number;
  shortKeyPD: number;
  longKeyP1: number;
  longKeyP2: number;
  longKeyP3: number;
  longKeyP4: number;
  longKeyP5: number;
  longKeyP6: number;
  longKeyPA: number;
  longKeyPB: number;
  longKeyPC: number;
  longKeyPD: number;
  vfoScanStartUhf: number;  // MHz
  vfoScanEndUhf: number;    // MHz
  vfoScanStartVhf: number;  // MHz
  vfoScanEndVhf: number;    // MHz
  statusMessage1: string;   // up to 16 chars
}

// Key function enum — confirmed byte values marked, rest from QDMR list
export const KEY_FUNCTIONS: { value: number; label: string }[] = [
  { value: 0x00, label: 'Off' },
  { value: 0x01, label: 'Voltage' },
  { value: 0x02, label: 'Power' },
  { value: 0x03, label: 'Talk Around' },
  { value: 0x04, label: 'Reverse' },
  { value: 0x05, label: 'Encryption' },
  { value: 0x06, label: 'Call' },
  { value: 0x07, label: 'VFO/MR' },
  { value: 0x08, label: 'Scan' },
  { value: 0x09, label: 'WFM' },
  { value: 0x0A, label: 'Alarm' },
  { value: 0x0B, label: 'Record Switch' },
  { value: 0x0C, label: 'Record' },
  { value: 0x0D, label: 'SMS' },
  { value: 0x0E, label: 'Dial' },
  { value: 0x0F, label: 'GPS Information' },
  { value: 0x10, label: 'Monitor' },
  { value: 0x11, label: 'Toggle Main Channel' },
  { value: 0x12, label: 'Hot Key 1' },
  { value: 0x13, label: 'Hot Key 2' },
  { value: 0x14, label: 'Hot Key 3' },
  { value: 0x15, label: 'Hot Key 4' },
  { value: 0x16, label: 'Hot Key 5' },
  { value: 0x17, label: 'Hot Key 6' },
  { value: 0x18, label: 'Work Alone' },
  { value: 0x19, label: 'Skip Channel' },
  { value: 0x1A, label: 'Digital Monitor' },
  { value: 0x1B, label: 'Sub CH On/Off' },
  { value: 0x1C, label: 'Priority Zone' },
  { value: 0x1D, label: 'VFO Scan' },
  { value: 0x1E, label: 'MIC Sound Quality' },
  { value: 0x1F, label: 'Last Call Reply' },
  { value: 0x20, label: 'Channel Type' },
  { value: 0x21, label: 'Ranging' },
  { value: 0x22, label: 'Roaming' },
  { value: 0x23, label: 'Channel Ranging' },
  { value: 0x24, label: 'Max Volume' },
  { value: 0x25, label: 'Slot' },
  { value: 0x26, label: 'APRS Type Switch' },
  { value: 0x27, label: 'Zone' },
  { value: 0x28, label: 'Roaming Set' },
  { value: 0x29, label: 'APRS Set' },
  { value: 0x2A, label: 'Mute' },
  { value: 0x2B, label: 'VOX' },
  { value: 0x2C, label: 'Zone+' },
  { value: 0x2D, label: 'Zone-' },
  { value: 0x2E, label: 'Exit' },
  { value: 0x2F, label: 'Menu' },
  { value: 0x30, label: 'Mute A' },
  { value: 0x31, label: 'Mute B' },
  { value: 0x32, label: 'CTCSS/DCS Set' },
  { value: 0x33, label: 'TBST Send' },
  { value: 0x34, label: 'Bluetooth' },
  { value: 0x35, label: 'GPS' },
  { value: 0x36, label: 'Channel Name' },
  { value: 0x37, label: 'CDT Scan' },
  { value: 0x38, label: 'APRS Send' },
  { value: 0x39, label: 'APRS Info' },
  { value: 0x3A, label: 'Speaker' },
  { value: 0x3B, label: 'XBand Repeater' },
  { value: 0x3C, label: 'Simplex Repeater' },
  { value: 0x3D, label: 'GPS Roaming' },
  { value: 0x3E, label: 'Squelch' },
  { value: 0x3F, label: 'Noise Reduction TX' },
  { value: 0x40, label: 'DIM Shut' },
  { value: 0x41, label: 'Sat Predict' },
];

const KEY_FUNCTION_MAP = new Map(KEY_FUNCTIONS.map(kf => [kf.value, kf.label]));

export function keyFunctionLabel(value: number): string {
  return KEY_FUNCTION_MAP.get(value) ?? `Unknown (0x${value.toString(16).padStart(2, '0').toUpperCase()})`;
}

// Menu exit time options: 5s increments encoded as (sec-5)/5
export const MENU_EXIT_OPTIONS: { value: number; label: string }[] = [];
for (let sec = 10; sec <= 60; sec += 5) {
  MENU_EXIT_OPTIONS.push({ value: sec, label: `${sec}s` });
}
// Also include "infinite" / never — byte value 0xFF often means disabled
MENU_EXIT_OPTIONS.push({ value: 255, label: 'Infinite' });

// --- Byte offsets within settings block ---
const OFF_BRIGHTNESS    = 0x03;
const OFF_SQL_A         = 0x5A;
const OFF_SQL_B         = 0x5B;
const OFF_SHORT_KEY_P1  = 0x5E;
// Short keys P1-PD: 0x5E..0x67 (10 bytes)
const OFF_LONG_KEY_P1   = 0x68;
// Long keys P1-PD: 0x68..0x71 (10 bytes)
const OFF_MENU_EXIT     = 0x91;
const OFF_VFO_UHF_START = 0xA0;
const OFF_VFO_UHF_END   = 0xA4;
const OFF_VFO_VHF_START = 0xA8;
const OFF_VFO_VHF_END   = 0xAC;
const OFF_STATUS_MSG1   = 0xEB;
const STATUS_MSG1_LEN   = 17;

// Short key field names in order (P1, P2, P3, P4, P5, P6, PA, PB, PC, PD)
export const SHORT_KEY_FIELDS = [
  'shortKeyP1', 'shortKeyP2', 'shortKeyP3', 'shortKeyP4', 'shortKeyP5',
  'shortKeyP6', 'shortKeyPA', 'shortKeyPB', 'shortKeyPC', 'shortKeyPD',
] as const;

export const LONG_KEY_FIELDS = [
  'longKeyP1', 'longKeyP2', 'longKeyP3', 'longKeyP4', 'longKeyP5',
  'longKeyP6', 'longKeyPA', 'longKeyPB', 'longKeyPC', 'longKeyPD',
] as const;

export const KEY_LABELS = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'PA', 'PB', 'PC', 'PD'];

// --- Helpers ---

function readU32LE(data: Uint8Array, offset: number): number {
  return data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16) | ((data[offset + 3] << 24) >>> 0);
}

function writeU32LE(data: Uint8Array, offset: number, value: number) {
  data[offset]     = value & 0xFF;
  data[offset + 1] = (value >>> 8) & 0xFF;
  data[offset + 2] = (value >>> 16) & 0xFF;
  data[offset + 3] = (value >>> 24) & 0xFF;
}

function readNullTermString(data: Uint8Array, offset: number, maxLen: number): string {
  let s = '';
  for (let i = 0; i < maxLen; i++) {
    const b = data[offset + i];
    if (b === 0) break;
    s += String.fromCharCode(b);
  }
  return s;
}

function writeNullTermString(data: Uint8Array, offset: number, maxLen: number, value: string) {
  const truncated = value.slice(0, maxLen - 1); // leave room for null
  for (let i = 0; i < maxLen; i++) {
    data[offset + i] = i < truncated.length ? truncated.charCodeAt(i) & 0x7F : 0;
  }
}

function freqFromBytes(raw: number): number {
  // Stored as Hz/10, return MHz
  return raw / 100000;
}

function freqToBytes(mhz: number): number {
  return Math.round(mhz * 100000);
}

function menuExitDecode(raw: number): number {
  if (raw === 0xFF) return 255; // infinite
  return raw * 5 + 5;
}

function menuExitEncode(seconds: number): number {
  if (seconds === 255) return 0xFF;
  return Math.max(0, Math.round((seconds - 5) / 5));
}

// --- Decode ---

export function decodeSettings(block: Uint8Array): RadioSettings {
  return {
    brightness: block[OFF_BRIGHTNESS],
    sqlLevelA: block[OFF_SQL_A],
    sqlLevelB: block[OFF_SQL_B],
    menuExitTime: menuExitDecode(block[OFF_MENU_EXIT]),
    shortKeyP1: block[OFF_SHORT_KEY_P1],
    shortKeyP2: block[OFF_SHORT_KEY_P1 + 1],
    shortKeyP3: block[OFF_SHORT_KEY_P1 + 2],
    shortKeyP4: block[OFF_SHORT_KEY_P1 + 3],
    shortKeyP5: block[OFF_SHORT_KEY_P1 + 4],
    shortKeyP6: block[OFF_SHORT_KEY_P1 + 5],
    shortKeyPA: block[OFF_SHORT_KEY_P1 + 6],
    shortKeyPB: block[OFF_SHORT_KEY_P1 + 7],
    shortKeyPC: block[OFF_SHORT_KEY_P1 + 8],
    shortKeyPD: block[OFF_SHORT_KEY_P1 + 9],
    longKeyP1: block[OFF_LONG_KEY_P1],
    longKeyP2: block[OFF_LONG_KEY_P1 + 1],
    longKeyP3: block[OFF_LONG_KEY_P1 + 2],
    longKeyP4: block[OFF_LONG_KEY_P1 + 3],
    longKeyP5: block[OFF_LONG_KEY_P1 + 4],
    longKeyP6: block[OFF_LONG_KEY_P1 + 5],
    longKeyPA: block[OFF_LONG_KEY_P1 + 6],
    longKeyPB: block[OFF_LONG_KEY_P1 + 7],
    longKeyPC: block[OFF_LONG_KEY_P1 + 8],
    longKeyPD: block[OFF_LONG_KEY_P1 + 9],
    vfoScanStartUhf: freqFromBytes(readU32LE(block, OFF_VFO_UHF_START)),
    vfoScanEndUhf:   freqFromBytes(readU32LE(block, OFF_VFO_UHF_END)),
    vfoScanStartVhf: freqFromBytes(readU32LE(block, OFF_VFO_VHF_START)),
    vfoScanEndVhf:   freqFromBytes(readU32LE(block, OFF_VFO_VHF_END)),
    statusMessage1: readNullTermString(block, OFF_STATUS_MSG1, STATUS_MSG1_LEN),
  };
}

// --- Encode ---

export function encodeSettings(settings: RadioSettings, block: Uint8Array): Uint8Array {
  const out = new Uint8Array(block); // copy
  out[OFF_BRIGHTNESS] = Math.max(1, Math.min(10, settings.brightness));
  out[OFF_SQL_A] = Math.max(0, Math.min(9, settings.sqlLevelA));
  out[OFF_SQL_B] = Math.max(0, Math.min(9, settings.sqlLevelB));
  out[OFF_MENU_EXIT] = menuExitEncode(settings.menuExitTime);

  const shortKeys = [
    settings.shortKeyP1, settings.shortKeyP2, settings.shortKeyP3, settings.shortKeyP4,
    settings.shortKeyP5, settings.shortKeyP6, settings.shortKeyPA, settings.shortKeyPB,
    settings.shortKeyPC, settings.shortKeyPD,
  ];
  for (let i = 0; i < 10; i++) out[OFF_SHORT_KEY_P1 + i] = shortKeys[i];

  const longKeys = [
    settings.longKeyP1, settings.longKeyP2, settings.longKeyP3, settings.longKeyP4,
    settings.longKeyP5, settings.longKeyP6, settings.longKeyPA, settings.longKeyPB,
    settings.longKeyPC, settings.longKeyPD,
  ];
  for (let i = 0; i < 10; i++) out[OFF_LONG_KEY_P1 + i] = longKeys[i];

  writeU32LE(out, OFF_VFO_UHF_START, freqToBytes(settings.vfoScanStartUhf));
  writeU32LE(out, OFF_VFO_UHF_END,   freqToBytes(settings.vfoScanEndUhf));
  writeU32LE(out, OFF_VFO_VHF_START, freqToBytes(settings.vfoScanStartVhf));
  writeU32LE(out, OFF_VFO_VHF_END,   freqToBytes(settings.vfoScanEndVhf));

  writeNullTermString(out, OFF_STATUS_MSG1, STATUS_MSG1_LEN, settings.statusMessage1);

  return out;
}
