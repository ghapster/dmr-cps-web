// Decode/encode the radio settings block from Anytone D578UV.
// Two codecs: RDT file (445-byte block, Anytone CPS format) and radio memory (240-byte block, QDMR offsets).
// Both produce the same RadioSettings interface.

export interface RadioSettings {
  // --- Fields available from BOTH RDT and radio memory ---
  brightness: number;        // 1-10
  sqlLevelA: number;         // 0-9
  sqlLevelB: number;         // 0-9
  menuExitTime: number;      // seconds (10-65 or 255=infinite)
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
  statusMessage1: string;    // up to 16 chars (RDT only)

  // --- Fields available from radio memory only (QDMR offsets) ---
  // Audio
  keyTone?: boolean;
  startupTone?: boolean;
  callEndPrompt?: boolean;
  dmrMicGain?: number;       // 1-10
  maxSpeakerVolume?: number; // 1-10
  steType?: number;          // 0=off, 1=silent, 2=120deg, 3=180deg, 4=240deg
  steFrequency?: number;     // 0=off, 1=55.2Hz, 2=259.2Hz

  // Display
  language?: number;         // 0=English, 1=Chinese
  showClock?: boolean;
  showChannelNumber?: boolean;
  showCurrentContact?: boolean;
  displaySeparator?: boolean;
  txBacklightDuration?: number; // seconds (0-30)
  standbyTextColor?: number;
  standbyBgColor?: number;

  // Timeouts
  txTimeout?: number;        // raw × 30 = seconds (0=off, 1=30s, 2=60s, etc.)
  groupCallHangTime?: number; // seconds
  privateCallHangTime?: number; // seconds
  longPressDuration?: number; // raw+1 = seconds (1-5)

  // GPS / Bluetooth
  gpsEnable?: boolean;
  gpsTimezone?: number;      // index 0-31
  gpsUpdatePeriod?: number;  // seconds
  gpsUnits?: number;         // 0=metric, 1=imperial
  bluetoothEnable?: boolean;
  btMicGain?: number;        // raw value (display = (raw+1)*2)
  btSpeakerGain?: number;    // raw value (display = (raw+1)*2)

  // Boot / Defaults
  defaultChannelsEnable?: boolean;
  defaultZoneA?: number;     // zone index
  defaultZoneB?: number;     // zone index
  defaultChannelA?: number;  // channel index (0xFF=VFO)
  defaultChannelB?: number;  // channel index (0xFF=VFO)

  // Roaming
  roamingEnable?: boolean;
  autoRoamPeriod?: number;   // minutes
  autoRoamDelay?: number;    // seconds
  repeaterRangeCheck?: boolean;
  rangeCheckInterval?: number; // raw × 5 = seconds
  roamingStartCondition?: number; // enum

  // Other
  vfoModeA?: number;         // 0=memory, 1=VFO
  vfoModeB?: number;         // 0=memory, 1=VFO
  vfoStepSize?: number;      // enum index
  recordingEnable?: boolean;
  remoteStunKill?: boolean;
  talkPermitDmr?: boolean;
  talkPermitFm?: boolean;
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
MENU_EXIT_OPTIONS.push({ value: 255, label: 'Infinite' });

// VFO step size options (QDMR enum)
export const VFO_STEP_SIZES: { value: number; label: string }[] = [
  { value: 0, label: '2.5 kHz' },
  { value: 1, label: '5 kHz' },
  { value: 2, label: '6.25 kHz' },
  { value: 3, label: '8.33 kHz' },
  { value: 4, label: '10 kHz' },
  { value: 5, label: '12.5 kHz' },
  { value: 6, label: '20 kHz' },
  { value: 7, label: '25 kHz' },
  { value: 8, label: '30 kHz' },
  { value: 9, label: '50 kHz' },
];

// STE type options
export const STE_TYPES: { value: number; label: string }[] = [
  { value: 0, label: 'Off' },
  { value: 1, label: 'Silent' },
  { value: 2, label: '120°' },
  { value: 3, label: '180°' },
  { value: 4, label: '240°' },
];

// STE frequency options
export const STE_FREQUENCIES: { value: number; label: string }[] = [
  { value: 0, label: 'Off' },
  { value: 1, label: '55.2 Hz' },
  { value: 2, label: '259.2 Hz' },
];

// GPS timezone table (index 0-31)
export const GPS_TIMEZONES: { value: number; label: string }[] = [
  { value: 0, label: 'UTC-12:00' },
  { value: 1, label: 'UTC-11:00' },
  { value: 2, label: 'UTC-10:00' },
  { value: 3, label: 'UTC-09:00' },
  { value: 4, label: 'UTC-08:00 (PST)' },
  { value: 5, label: 'UTC-07:00 (MST)' },
  { value: 6, label: 'UTC-06:00 (CST)' },
  { value: 7, label: 'UTC-05:00 (EST)' },
  { value: 8, label: 'UTC-04:00 (AST)' },
  { value: 9, label: 'UTC-03:30' },
  { value: 10, label: 'UTC-03:00' },
  { value: 11, label: 'UTC-02:00' },
  { value: 12, label: 'UTC-01:00' },
  { value: 13, label: 'UTC+00:00 (GMT)' },
  { value: 14, label: 'UTC+01:00 (CET)' },
  { value: 15, label: 'UTC+02:00' },
  { value: 16, label: 'UTC+03:00' },
  { value: 17, label: 'UTC+03:30' },
  { value: 18, label: 'UTC+04:00' },
  { value: 19, label: 'UTC+04:30' },
  { value: 20, label: 'UTC+05:00' },
  { value: 21, label: 'UTC+05:30' },
  { value: 22, label: 'UTC+05:45' },
  { value: 23, label: 'UTC+06:00' },
  { value: 24, label: 'UTC+07:00' },
  { value: 25, label: 'UTC+08:00' },
  { value: 26, label: 'UTC+08:30' },
  { value: 27, label: 'UTC+09:00 (JST)' },
  { value: 28, label: 'UTC+10:00' },
  { value: 29, label: 'UTC+11:00' },
  { value: 30, label: 'UTC+12:00' },
  { value: 31, label: 'UTC+13:00' },
];

// Roaming start condition
export const ROAMING_START_CONDITIONS: { value: number; label: string }[] = [
  { value: 0, label: 'Periodic' },
  { value: 1, label: 'Out of Range' },
  { value: 2, label: 'Both' },
];

// Name/text color options (QDMR NameColor enum)
export const NAME_COLORS: { value: number; label: string }[] = [
  { value: 0, label: 'Orange' },
  { value: 1, label: 'Red' },
  { value: 2, label: 'Yellow' },
  { value: 3, label: 'Green' },
  { value: 4, label: 'Turquoise' },
  { value: 5, label: 'Blue' },
  { value: 6, label: 'White' },
];

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

// ============================================================================
// RDT FILE OFFSETS — Anytone CPS .RDT format (445-byte settings block)
// ============================================================================

const RDT_BRIGHTNESS    = 0x03;
const RDT_SQL_A         = 0x5A;
const RDT_SQL_B         = 0x5B;
const RDT_SHORT_KEY_P1  = 0x5E;
const RDT_LONG_KEY_P1   = 0x68;
const RDT_MENU_EXIT     = 0x91;
const RDT_VFO_UHF_START = 0xA0;
const RDT_VFO_UHF_END   = 0xA4;
const RDT_VFO_VHF_START = 0xA8;
const RDT_VFO_VHF_END   = 0xAC;
const RDT_STATUS_MSG1   = 0xEB;
const RDT_STATUS_MSG1_LEN = 17;

// ============================================================================
// RADIO MEMORY OFFSETS — QDMR D578UV general settings (240-byte block at 0x02500000)
// ============================================================================

const RM_KEY_TONE       = 0x00;
const RM_TX_TIMEOUT     = 0x04;
const RM_LANGUAGE       = 0x05;
const RM_VFO_STEP       = 0x08;
const RM_DMR_MIC_GAIN   = 0x0C;
const RM_VFO_MODE_A     = 0x0D;
const RM_VFO_MODE_B     = 0x0E;
const RM_STE_TYPE       = 0x0F;
const RM_STE_FREQ       = 0x10;
const RM_GRP_HANG       = 0x11;
const RM_PRI_HANG       = 0x12;
const RM_RECORDING      = 0x1A;
const RM_BRIGHTNESS     = 0x1D;
const RM_GPS_ENABLE     = 0x1F;
const RM_GPS_TIMEZONE   = 0x27;
const RM_TALK_PERMIT    = 0x28;
const RM_MENU_EXIT      = 0x2B;
const RM_STARTUP_TONE   = 0x2D;
const RM_CALL_END_TONE  = 0x2E;
const RM_MAX_VOLUME     = 0x2F;
const RM_REMOTE_STUN    = 0x30;
const RM_LONG_PRESS_DUR = 0x33;
const RM_SHOW_CLOCK     = 0x3D;
const RM_VFO_UHF_START  = 0x40;
const RM_VFO_UHF_END    = 0x44;
const RM_VFO_VHF_START  = 0x48;
const RM_VFO_VHF_END    = 0x4C;
const RM_SQL_A          = 0x09;
const RM_SQL_B          = 0x0A;
const RM_BT_ENABLE      = 0xA4;
const RM_BT_MIC_GAIN    = 0xA9;
const RM_BT_SPK_GAIN    = 0xAA;
const RM_GPS_UPDATE     = 0xA8;
const RM_SHOW_CH_NUM    = 0xAB;
const RM_SHOW_CONTACT   = 0xAC;
const RM_AUTO_ROAM_PER  = 0xAD;
const RM_GPS_UNITS      = 0xAF;
const RM_AUTO_ROAM_DLY  = 0xB1;
const RM_STANDBY_TEXT   = 0xB2;
const RM_STANDBY_BG     = 0xB3;
const RM_DEF_CH_ENABLE  = 0xB8;
const RM_DEF_ZONE_A     = 0xB9;
const RM_DEF_ZONE_B     = 0xBA;
const RM_DEF_CH_A       = 0xBB;
const RM_DEF_CH_B       = 0xBC;
const RM_RANGE_CHECK    = 0xBE;
const RM_RANGE_INTERVAL = 0xBF;
const RM_ROAM_START     = 0xC1;
const RM_DISPLAY_SEP    = 0xC3;
const RM_TX_BACKLIGHT   = 0xC7;
const RM_ROAMING_ENABLE = 0xC8;
const RM_SHORT_KEY_P1   = 0xC9;
const RM_LONG_KEY_P1    = 0xD3;

// ============================================================================
// Helpers
// ============================================================================

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
  const truncated = value.slice(0, maxLen - 1);
  for (let i = 0; i < maxLen; i++) {
    data[offset + i] = i < truncated.length ? truncated.charCodeAt(i) & 0x7F : 0;
  }
}

function freqFromBytes(raw: number): number {
  return raw / 100000; // stored as Hz/10, return MHz
}

function freqToBytes(mhz: number): number {
  return Math.round(mhz * 100000);
}

function menuExitDecode(raw: number): number {
  if (raw === 0xFF) return 255;
  return raw * 5 + 5;
}

function menuExitEncode(seconds: number): number {
  if (seconds === 255) return 0xFF;
  return Math.max(0, Math.round((seconds - 5) / 5));
}

function bool(b: number): boolean { return b !== 0; }

// Brightness scaling: QDMR uses raw 0-4 → display (raw*10)/4. We use 1-10.
function rmBrightnessDecode(raw: number): number {
  return Math.max(1, Math.min(10, Math.round((raw * 10) / 4)));
}
function rmBrightnessEncode(level: number): number {
  return Math.max(0, Math.min(4, Math.round((level * 4) / 10)));
}

// Max volume: raw 0-8 → display 1-10
function rmMaxVolDecode(raw: number): number {
  return Math.max(1, Math.min(10, Math.round((raw * 10) / 8)));
}
function rmMaxVolEncode(level: number): number {
  return Math.max(0, Math.min(8, Math.round((level * 8) / 10)));
}

// DMR mic gain: raw 0-4 → display 1-10
function rmDmrMicDecode(raw: number): number {
  return Math.max(1, Math.min(10, Math.round(((raw + 1) * 10) / 5)));
}
function rmDmrMicEncode(level: number): number {
  return Math.max(0, Math.min(4, Math.round((level * 5) / 10) - 1));
}

// ============================================================================
// RDT FILE DECODE / ENCODE (existing — for .RDT file import)
// ============================================================================

export function decodeSettings(block: Uint8Array): RadioSettings {
  return {
    brightness: block[RDT_BRIGHTNESS],
    sqlLevelA: block[RDT_SQL_A],
    sqlLevelB: block[RDT_SQL_B],
    menuExitTime: menuExitDecode(block[RDT_MENU_EXIT]),
    shortKeyP1: block[RDT_SHORT_KEY_P1],
    shortKeyP2: block[RDT_SHORT_KEY_P1 + 1],
    shortKeyP3: block[RDT_SHORT_KEY_P1 + 2],
    shortKeyP4: block[RDT_SHORT_KEY_P1 + 3],
    shortKeyP5: block[RDT_SHORT_KEY_P1 + 4],
    shortKeyP6: block[RDT_SHORT_KEY_P1 + 5],
    shortKeyPA: block[RDT_SHORT_KEY_P1 + 6],
    shortKeyPB: block[RDT_SHORT_KEY_P1 + 7],
    shortKeyPC: block[RDT_SHORT_KEY_P1 + 8],
    shortKeyPD: block[RDT_SHORT_KEY_P1 + 9],
    longKeyP1: block[RDT_LONG_KEY_P1],
    longKeyP2: block[RDT_LONG_KEY_P1 + 1],
    longKeyP3: block[RDT_LONG_KEY_P1 + 2],
    longKeyP4: block[RDT_LONG_KEY_P1 + 3],
    longKeyP5: block[RDT_LONG_KEY_P1 + 4],
    longKeyP6: block[RDT_LONG_KEY_P1 + 5],
    longKeyPA: block[RDT_LONG_KEY_P1 + 6],
    longKeyPB: block[RDT_LONG_KEY_P1 + 7],
    longKeyPC: block[RDT_LONG_KEY_P1 + 8],
    longKeyPD: block[RDT_LONG_KEY_P1 + 9],
    vfoScanStartUhf: freqFromBytes(readU32LE(block, RDT_VFO_UHF_START)),
    vfoScanEndUhf:   freqFromBytes(readU32LE(block, RDT_VFO_UHF_END)),
    vfoScanStartVhf: freqFromBytes(readU32LE(block, RDT_VFO_VHF_START)),
    vfoScanEndVhf:   freqFromBytes(readU32LE(block, RDT_VFO_VHF_END)),
    statusMessage1: readNullTermString(block, RDT_STATUS_MSG1, RDT_STATUS_MSG1_LEN),
  };
}

export function encodeSettings(settings: RadioSettings, block: Uint8Array): Uint8Array {
  const out = new Uint8Array(block);
  out[RDT_BRIGHTNESS] = Math.max(1, Math.min(10, settings.brightness));
  out[RDT_SQL_A] = Math.max(0, Math.min(9, settings.sqlLevelA));
  out[RDT_SQL_B] = Math.max(0, Math.min(9, settings.sqlLevelB));
  out[RDT_MENU_EXIT] = menuExitEncode(settings.menuExitTime);

  const shortKeys = [
    settings.shortKeyP1, settings.shortKeyP2, settings.shortKeyP3, settings.shortKeyP4,
    settings.shortKeyP5, settings.shortKeyP6, settings.shortKeyPA, settings.shortKeyPB,
    settings.shortKeyPC, settings.shortKeyPD,
  ];
  for (let i = 0; i < 10; i++) out[RDT_SHORT_KEY_P1 + i] = shortKeys[i];

  const longKeys = [
    settings.longKeyP1, settings.longKeyP2, settings.longKeyP3, settings.longKeyP4,
    settings.longKeyP5, settings.longKeyP6, settings.longKeyPA, settings.longKeyPB,
    settings.longKeyPC, settings.longKeyPD,
  ];
  for (let i = 0; i < 10; i++) out[RDT_LONG_KEY_P1 + i] = longKeys[i];

  writeU32LE(out, RDT_VFO_UHF_START, freqToBytes(settings.vfoScanStartUhf));
  writeU32LE(out, RDT_VFO_UHF_END,   freqToBytes(settings.vfoScanEndUhf));
  writeU32LE(out, RDT_VFO_VHF_START, freqToBytes(settings.vfoScanStartVhf));
  writeU32LE(out, RDT_VFO_VHF_END,   freqToBytes(settings.vfoScanEndVhf));

  writeNullTermString(out, RDT_STATUS_MSG1, RDT_STATUS_MSG1_LEN, settings.statusMessage1);

  return out;
}

// ============================================================================
// RADIO MEMORY DECODE / ENCODE (new — for Web Serial radio reads, QDMR offsets)
// ============================================================================

export function decodeRadioMemorySettings(block: Uint8Array): RadioSettings {
  const talkPermit = block[RM_TALK_PERMIT];
  return {
    // Core fields (same as RDT but at different offsets)
    brightness: rmBrightnessDecode(block[RM_BRIGHTNESS]),
    sqlLevelA: block[RM_SQL_A],
    sqlLevelB: block[RM_SQL_B],
    menuExitTime: menuExitDecode(block[RM_MENU_EXIT]),
    shortKeyP1: block[RM_SHORT_KEY_P1],
    shortKeyP2: block[RM_SHORT_KEY_P1 + 1],
    shortKeyP3: block[RM_SHORT_KEY_P1 + 2],
    shortKeyP4: block[RM_SHORT_KEY_P1 + 3],
    shortKeyP5: block[RM_SHORT_KEY_P1 + 4],
    shortKeyP6: block[RM_SHORT_KEY_P1 + 5],
    shortKeyPA: block[RM_SHORT_KEY_P1 + 6],
    shortKeyPB: block[RM_SHORT_KEY_P1 + 7],
    shortKeyPC: block[RM_SHORT_KEY_P1 + 8],
    shortKeyPD: block[RM_SHORT_KEY_P1 + 9],
    longKeyP1: block[RM_LONG_KEY_P1],
    longKeyP2: block[RM_LONG_KEY_P1 + 1],
    longKeyP3: block[RM_LONG_KEY_P1 + 2],
    longKeyP4: block[RM_LONG_KEY_P1 + 3],
    longKeyP5: block[RM_LONG_KEY_P1 + 4],
    longKeyP6: block[RM_LONG_KEY_P1 + 5],
    longKeyPA: block[RM_LONG_KEY_P1 + 6],
    longKeyPB: block[RM_LONG_KEY_P1 + 7],
    longKeyPC: block[RM_LONG_KEY_P1 + 8],
    longKeyPD: block[RM_LONG_KEY_P1 + 9],
    vfoScanStartUhf: freqFromBytes(readU32LE(block, RM_VFO_UHF_START)),
    vfoScanEndUhf:   freqFromBytes(readU32LE(block, RM_VFO_UHF_END)),
    vfoScanStartVhf: freqFromBytes(readU32LE(block, RM_VFO_VHF_START)),
    vfoScanEndVhf:   freqFromBytes(readU32LE(block, RM_VFO_VHF_END)),
    statusMessage1: '', // not in 240-byte general settings block

    // Audio
    keyTone: bool(block[RM_KEY_TONE]),
    startupTone: bool(block[RM_STARTUP_TONE]),
    callEndPrompt: bool(block[RM_CALL_END_TONE]),
    dmrMicGain: rmDmrMicDecode(block[RM_DMR_MIC_GAIN]),
    maxSpeakerVolume: rmMaxVolDecode(block[RM_MAX_VOLUME]),
    steType: block[RM_STE_TYPE],
    steFrequency: block[RM_STE_FREQ],

    // Display
    language: block[RM_LANGUAGE],
    showClock: bool(block[RM_SHOW_CLOCK]),
    showChannelNumber: bool(block[RM_SHOW_CH_NUM]),
    showCurrentContact: bool(block[RM_SHOW_CONTACT]),
    displaySeparator: bool(block[RM_DISPLAY_SEP]),
    txBacklightDuration: block[RM_TX_BACKLIGHT],
    standbyTextColor: block[RM_STANDBY_TEXT],
    standbyBgColor: block[RM_STANDBY_BG],

    // Timeouts
    txTimeout: block[RM_TX_TIMEOUT],
    groupCallHangTime: block[RM_GRP_HANG],
    privateCallHangTime: block[RM_PRI_HANG],
    longPressDuration: block[RM_LONG_PRESS_DUR] + 1,

    // GPS / BT
    gpsEnable: bool(block[RM_GPS_ENABLE]),
    gpsTimezone: block[RM_GPS_TIMEZONE],
    gpsUpdatePeriod: block[RM_GPS_UPDATE],
    gpsUnits: block[RM_GPS_UNITS],
    bluetoothEnable: bool(block[RM_BT_ENABLE]),
    btMicGain: block[RM_BT_MIC_GAIN],
    btSpeakerGain: block[RM_BT_SPK_GAIN],

    // Boot
    defaultChannelsEnable: bool(block[RM_DEF_CH_ENABLE]),
    defaultZoneA: block[RM_DEF_ZONE_A],
    defaultZoneB: block[RM_DEF_ZONE_B],
    defaultChannelA: block[RM_DEF_CH_A],
    defaultChannelB: block[RM_DEF_CH_B],

    // Roaming
    roamingEnable: bool(block[RM_ROAMING_ENABLE]),
    autoRoamPeriod: block[RM_AUTO_ROAM_PER],
    autoRoamDelay: block[RM_AUTO_ROAM_DLY],
    repeaterRangeCheck: bool(block[RM_RANGE_CHECK]),
    rangeCheckInterval: block[RM_RANGE_INTERVAL],
    roamingStartCondition: block[RM_ROAM_START],

    // Other
    vfoModeA: block[RM_VFO_MODE_A],
    vfoModeB: block[RM_VFO_MODE_B],
    vfoStepSize: block[RM_VFO_STEP],
    recordingEnable: bool(block[RM_RECORDING]),
    remoteStunKill: bool(block[RM_REMOTE_STUN]),
    talkPermitDmr: bool(talkPermit & 0x01),
    talkPermitFm: bool(talkPermit & 0x02),
  };
}

export function encodeRadioMemorySettings(settings: RadioSettings, block: Uint8Array): Uint8Array {
  const out = new Uint8Array(block);

  // Core fields
  out[RM_BRIGHTNESS] = rmBrightnessEncode(settings.brightness);
  out[RM_SQL_A] = Math.max(0, Math.min(9, settings.sqlLevelA));
  out[RM_SQL_B] = Math.max(0, Math.min(9, settings.sqlLevelB));
  out[RM_MENU_EXIT] = menuExitEncode(settings.menuExitTime);

  const shortKeys = [
    settings.shortKeyP1, settings.shortKeyP2, settings.shortKeyP3, settings.shortKeyP4,
    settings.shortKeyP5, settings.shortKeyP6, settings.shortKeyPA, settings.shortKeyPB,
    settings.shortKeyPC, settings.shortKeyPD,
  ];
  for (let i = 0; i < 10; i++) out[RM_SHORT_KEY_P1 + i] = shortKeys[i];

  const longKeys = [
    settings.longKeyP1, settings.longKeyP2, settings.longKeyP3, settings.longKeyP4,
    settings.longKeyP5, settings.longKeyP6, settings.longKeyPA, settings.longKeyPB,
    settings.longKeyPC, settings.longKeyPD,
  ];
  for (let i = 0; i < 10; i++) out[RM_LONG_KEY_P1 + i] = longKeys[i];

  writeU32LE(out, RM_VFO_UHF_START, freqToBytes(settings.vfoScanStartUhf));
  writeU32LE(out, RM_VFO_UHF_END,   freqToBytes(settings.vfoScanEndUhf));
  writeU32LE(out, RM_VFO_VHF_START, freqToBytes(settings.vfoScanStartVhf));
  writeU32LE(out, RM_VFO_VHF_END,   freqToBytes(settings.vfoScanEndVhf));

  // Audio
  if (settings.keyTone !== undefined) out[RM_KEY_TONE] = settings.keyTone ? 1 : 0;
  if (settings.startupTone !== undefined) out[RM_STARTUP_TONE] = settings.startupTone ? 1 : 0;
  if (settings.callEndPrompt !== undefined) out[RM_CALL_END_TONE] = settings.callEndPrompt ? 1 : 0;
  if (settings.dmrMicGain !== undefined) out[RM_DMR_MIC_GAIN] = rmDmrMicEncode(settings.dmrMicGain);
  if (settings.maxSpeakerVolume !== undefined) out[RM_MAX_VOLUME] = rmMaxVolEncode(settings.maxSpeakerVolume);
  if (settings.steType !== undefined) out[RM_STE_TYPE] = settings.steType;
  if (settings.steFrequency !== undefined) out[RM_STE_FREQ] = settings.steFrequency;

  // Display
  if (settings.language !== undefined) out[RM_LANGUAGE] = settings.language;
  if (settings.showClock !== undefined) out[RM_SHOW_CLOCK] = settings.showClock ? 1 : 0;
  if (settings.showChannelNumber !== undefined) out[RM_SHOW_CH_NUM] = settings.showChannelNumber ? 1 : 0;
  if (settings.showCurrentContact !== undefined) out[RM_SHOW_CONTACT] = settings.showCurrentContact ? 1 : 0;
  if (settings.displaySeparator !== undefined) out[RM_DISPLAY_SEP] = settings.displaySeparator ? 1 : 0;
  if (settings.txBacklightDuration !== undefined) out[RM_TX_BACKLIGHT] = Math.max(0, Math.min(30, settings.txBacklightDuration));
  if (settings.standbyTextColor !== undefined) out[RM_STANDBY_TEXT] = settings.standbyTextColor;
  if (settings.standbyBgColor !== undefined) out[RM_STANDBY_BG] = settings.standbyBgColor;

  // Timeouts
  if (settings.txTimeout !== undefined) out[RM_TX_TIMEOUT] = settings.txTimeout;
  if (settings.groupCallHangTime !== undefined) out[RM_GRP_HANG] = settings.groupCallHangTime;
  if (settings.privateCallHangTime !== undefined) out[RM_PRI_HANG] = settings.privateCallHangTime;
  if (settings.longPressDuration !== undefined) out[RM_LONG_PRESS_DUR] = Math.max(0, settings.longPressDuration - 1);

  // GPS / BT
  if (settings.gpsEnable !== undefined) out[RM_GPS_ENABLE] = settings.gpsEnable ? 1 : 0;
  if (settings.gpsTimezone !== undefined) out[RM_GPS_TIMEZONE] = settings.gpsTimezone;
  if (settings.gpsUpdatePeriod !== undefined) out[RM_GPS_UPDATE] = settings.gpsUpdatePeriod;
  if (settings.gpsUnits !== undefined) out[RM_GPS_UNITS] = settings.gpsUnits;
  if (settings.bluetoothEnable !== undefined) out[RM_BT_ENABLE] = settings.bluetoothEnable ? 1 : 0;
  if (settings.btMicGain !== undefined) out[RM_BT_MIC_GAIN] = settings.btMicGain;
  if (settings.btSpeakerGain !== undefined) out[RM_BT_SPK_GAIN] = settings.btSpeakerGain;

  // Boot
  if (settings.defaultChannelsEnable !== undefined) out[RM_DEF_CH_ENABLE] = settings.defaultChannelsEnable ? 1 : 0;
  if (settings.defaultZoneA !== undefined) out[RM_DEF_ZONE_A] = settings.defaultZoneA;
  if (settings.defaultZoneB !== undefined) out[RM_DEF_ZONE_B] = settings.defaultZoneB;
  if (settings.defaultChannelA !== undefined) out[RM_DEF_CH_A] = settings.defaultChannelA;
  if (settings.defaultChannelB !== undefined) out[RM_DEF_CH_B] = settings.defaultChannelB;

  // Roaming
  if (settings.roamingEnable !== undefined) out[RM_ROAMING_ENABLE] = settings.roamingEnable ? 1 : 0;
  if (settings.autoRoamPeriod !== undefined) out[RM_AUTO_ROAM_PER] = settings.autoRoamPeriod;
  if (settings.autoRoamDelay !== undefined) out[RM_AUTO_ROAM_DLY] = settings.autoRoamDelay;
  if (settings.repeaterRangeCheck !== undefined) out[RM_RANGE_CHECK] = settings.repeaterRangeCheck ? 1 : 0;
  if (settings.rangeCheckInterval !== undefined) out[RM_RANGE_INTERVAL] = settings.rangeCheckInterval;
  if (settings.roamingStartCondition !== undefined) out[RM_ROAM_START] = settings.roamingStartCondition;

  // Other
  if (settings.vfoModeA !== undefined) out[RM_VFO_MODE_A] = settings.vfoModeA;
  if (settings.vfoModeB !== undefined) out[RM_VFO_MODE_B] = settings.vfoModeB;
  if (settings.vfoStepSize !== undefined) out[RM_VFO_STEP] = settings.vfoStepSize;
  if (settings.recordingEnable !== undefined) out[RM_RECORDING] = settings.recordingEnable ? 1 : 0;
  if (settings.remoteStunKill !== undefined) out[RM_REMOTE_STUN] = settings.remoteStunKill ? 1 : 0;
  if (settings.talkPermitDmr !== undefined || settings.talkPermitFm !== undefined) {
    let tp = out[RM_TALK_PERMIT];
    if (settings.talkPermitDmr !== undefined) tp = settings.talkPermitDmr ? (tp | 0x01) : (tp & ~0x01);
    if (settings.talkPermitFm !== undefined) tp = settings.talkPermitFm ? (tp | 0x02) : (tp & ~0x02);
    out[RM_TALK_PERMIT] = tp;
  }

  return out;
}
