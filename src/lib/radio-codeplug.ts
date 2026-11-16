/**
 * radio-codeplug.ts — Memory Map + Translation Layer for Anytone D578UV
 *
 * Maps between radio memory addresses and the Codeplug type.
 * Radio memory uses BCD frequencies, bit-packed fields, and fixed-size records
 * at specific addresses. RDT files use a different sequential format.
 *
 * Based on qdmr (d578uv_codeplug.cc) and anytone-flash-tools.
 */

import type {
  Codeplug,
  Channel,
  RadioId,
  Zone,
  ScanList,
  DigitalContact,
  GroupList,
  TextMessage,
  AprsSettings,
  RoamingChannel,
  RoamingZone,
  FileHeader,
  RepeaterMode,
  ChannelMode,
  PowerLevel,
  Bandwidth,
  TimeSlot,
} from './types';

import type { RadioConnection } from './radio-protocol';
import { readRegion, writeRegion } from './radio-protocol';

// =============================================================================
// Memory Map Constants
// =============================================================================

const MEM = {
  // Bitmaps
  CHANNEL_BITMAP:       0x024C1500,   // 500 bytes (4000 bits, 1 per channel)
  ZONE_BITMAP:          0x024C1300,   // 32 bytes (250 bits)
  SCAN_LIST_BITMAP:     0x024C1340,   // 32 bytes (250 bits)
  RADIO_ID_BITMAP:      0x024C1320,   // 32 bytes (250 bits)
  GROUP_LIST_BITMAP:    0x025C0B10,   // 32 bytes (250 bits)
  DIGITAL_CONTACT_BITMAP: 0x02640000, // 500 bytes for first bank
  MESSAGE_BYTEMAP:      0x01640800,   // 100 bytes (1 byte per message)
  ROAMING_CH_BITMAP:    0x01042000,   // 32 bytes (250 bits)
  ROAMING_ZONE_BITMAP:  0x01042080,   // 8 bytes (64 bits)

  // Data regions
  CHANNELS:             0x00800000,   // 64 bytes each, 128 per bank, bank spacing 0x40000
  ZONE_CHANNEL_LISTS:   0x01000000,   // 512 bytes each (250 x uint16 channel indices)
  ZONE_NAMES:           0x02540000,   // 32 bytes each (16 ASCII chars)
  SCAN_LISTS:           0x01080000,   // 144 bytes each, 16 per bank, bank spacing 0x40000
  RADIO_IDS:            0x02580000,   // 32 bytes each
  DIGITAL_CONTACTS:     0x02680000,   // 100 bytes each, 1000 per bank, bank spacing 0x40000
  GROUP_LISTS:          0x02980000,   // 288 bytes each, spacing 0x200
  GENERAL_SETTINGS:     0x02500000,   // 240 bytes (D578UV)
  BOOT_SETTINGS:        0x02500600,   // 48 bytes
  TEXT_MESSAGES:         0x02140000,   // 256 bytes each, 8 per bank, bank spacing 0x40000
  APRS_SETTINGS:        0x02501000,   // 256 bytes
  APRS_MESSAGE:         0x02501200,   // 60 bytes
  ROAMING_CHANNELS:     0x01040000,   // 32 bytes each
  ROAMING_ZONES:        0x01043000,   // 128 bytes each
} as const;

const CHANNEL_RECORD_SIZE = 64;    // 0x40
const CHANNELS_PER_BANK = 128;
const CHANNEL_BANK_SPACING = 0x40000;
const MAX_CHANNELS = 4000;

const ZONE_NAME_SIZE = 32;         // 0x20
const ZONE_CHANNEL_LIST_SIZE = 512; // 0x200
const MAX_ZONES = 250;

const SCAN_LIST_RECORD_SIZE = 144; // 0x90
const SCAN_LISTS_PER_BANK = 16;
const SCAN_LIST_BANK_SPACING = 0x40000;
const SCAN_LIST_SPACING = 0x200;
const MAX_SCAN_LISTS = 250;

const RADIO_ID_RECORD_SIZE = 32;   // 0x20
const MAX_RADIO_IDS = 250;

const DIGITAL_CONTACT_RECORD_SIZE = 100; // 0x64
const CONTACTS_PER_BANK = 1000;
const CONTACT_BANK_SPACING = 0x40000;
const MAX_DIGITAL_CONTACTS = 10000;

const GROUP_LIST_RECORD_SIZE = 288; // 0x120
const GROUP_LIST_SPACING = 0x200;
const MAX_GROUP_LISTS = 250;

const TEXT_MESSAGE_RECORD_SIZE = 256; // 0x100
const MESSAGES_PER_BANK = 8;
const MESSAGE_BANK_SPACING = 0x40000;
const MAX_TEXT_MESSAGES = 100;

const ROAMING_CHANNEL_SIZE = 32;   // 0x20
const MAX_ROAMING_CHANNELS = 250;
const ROAMING_ZONE_SIZE = 128;     // 0x80
const MAX_ROAMING_ZONES = 64;

// =============================================================================
// BCD Encoding/Decoding
// =============================================================================

/** Decode 4-byte BCD big-endian frequency (in 10Hz units) to MHz. */
export function decodeBcdFrequency(data: Uint8Array, offset: number = 0): number {
  let value = 0;
  for (let i = 0; i < 4; i++) {
    const byte = data[offset + i];
    const high = (byte >> 4) & 0x0f;
    const low = byte & 0x0f;
    value = value * 100 + high * 10 + low;
  }
  // value is now in 10 Hz units, convert to MHz
  return (value * 10) / 1_000_000;
}

/** Encode MHz to 4-byte BCD big-endian (in 10Hz units). */
export function encodeBcdFrequency(mhz: number): Uint8Array {
  const result = new Uint8Array(4);
  let value = Math.round(mhz * 1_000_000 / 10); // convert to 10Hz units
  // Encode 8 BCD digits into 4 bytes, big-endian
  for (let i = 3; i >= 0; i--) {
    const low = value % 10;
    value = Math.floor(value / 10);
    const high = value % 10;
    value = Math.floor(value / 10);
    result[i] = (high << 4) | low;
  }
  return result;
}

/** Decode 4-byte BCD big-endian DMR ID. */
function decodeBcdId(data: Uint8Array, offset: number = 0): number {
  let value = 0;
  for (let i = 0; i < 4; i++) {
    const byte = data[offset + i];
    const high = (byte >> 4) & 0x0f;
    const low = byte & 0x0f;
    value = value * 100 + high * 10 + low;
  }
  return value;
}

/** Encode DMR ID to 4-byte BCD big-endian. */
function encodeBcdId(id: number): Uint8Array {
  const result = new Uint8Array(4);
  let value = id;
  for (let i = 3; i >= 0; i--) {
    const low = value % 10;
    value = Math.floor(value / 10);
    const high = value % 10;
    value = Math.floor(value / 10);
    result[i] = (high << 4) | low;
  }
  return result;
}

// =============================================================================
// Bitmap Helpers
// =============================================================================

/** Read a bitmap and return the set of populated slot indices. */
export function readBitmap(data: Uint8Array, maxBits: number): Set<number> {
  const result = new Set<number>();
  for (let i = 0; i < maxBits; i++) {
    const byteIdx = Math.floor(i / 8);
    const bitIdx = i % 8;
    if (byteIdx < data.length && (data[byteIdx] & (1 << bitIdx)) !== 0) {
      result.add(i);
    }
  }
  return result;
}

/** Read a bytemap (0x00 = used, 0xFF = free). */
function readBytemap(data: Uint8Array, maxSlots: number): Set<number> {
  const result = new Set<number>();
  for (let i = 0; i < Math.min(maxSlots, data.length); i++) {
    if (data[i] === 0x00) result.add(i);
  }
  return result;
}

// =============================================================================
// ASCII Helpers
// =============================================================================

/** Read ASCII string from buffer, stopping at null or non-printable. */
function readAscii(data: Uint8Array, offset: number, maxLen: number): string {
  const chars: string[] = [];
  for (let i = 0; i < maxLen; i++) {
    if (offset + i >= data.length) break;
    const b = data[offset + i];
    if (b === 0) break;
    if (b >= 0x20 && b <= 0x7e) chars.push(String.fromCharCode(b));
    else break;
  }
  return chars.join('');
}

/** Write ASCII string to buffer, null-padding the rest. */
function writeAscii(data: Uint8Array, offset: number, text: string, maxLen: number): void {
  for (let i = 0; i < maxLen; i++) {
    data[offset + i] = i < text.length ? text.charCodeAt(i) : 0;
  }
}

// =============================================================================
// Channel Address Calculation (banked storage)
// =============================================================================

/** Get the memory address for a channel by its slot index (0-based). */
function channelAddress(slotIndex: number): number {
  const bank = Math.floor(slotIndex / CHANNELS_PER_BANK);
  const indexInBank = slotIndex % CHANNELS_PER_BANK;
  return MEM.CHANNELS + bank * CHANNEL_BANK_SPACING + indexInBank * CHANNEL_RECORD_SIZE;
}

/** Get the memory address for a scan list by its slot index (0-based). */
function scanListAddress(slotIndex: number): number {
  const bank = Math.floor(slotIndex / SCAN_LISTS_PER_BANK);
  const indexInBank = slotIndex % SCAN_LISTS_PER_BANK;
  return MEM.SCAN_LISTS + bank * SCAN_LIST_BANK_SPACING + indexInBank * SCAN_LIST_SPACING;
}

/** Get the memory address for a digital contact by its slot index (0-based). */
function digitalContactAddress(slotIndex: number): number {
  const bank = Math.floor(slotIndex / CONTACTS_PER_BANK);
  const indexInBank = slotIndex % CONTACTS_PER_BANK;
  return MEM.DIGITAL_CONTACTS + bank * CONTACT_BANK_SPACING + indexInBank * DIGITAL_CONTACT_RECORD_SIZE;
}

/** Get the memory address for a text message by its slot index (0-based). */
function textMessageAddress(slotIndex: number): number {
  const bank = Math.floor(slotIndex / MESSAGES_PER_BANK);
  const indexInBank = slotIndex % MESSAGES_PER_BANK;
  return MEM.TEXT_MESSAGES + bank * MESSAGE_BANK_SPACING + indexInBank * TEXT_MESSAGE_RECORD_SIZE;
}

// =============================================================================
// Read Plan — defines what memory regions to read from radio
// =============================================================================

export interface ReadRegion {
  name: string;
  address: number;
  length: number;
}

/** Build the list of memory regions to read from the radio. */
export function getReadPlan(): ReadRegion[] {
  const regions: ReadRegion[] = [];

  // Bitmaps first — we need these to know which records exist
  regions.push({ name: 'Channel Bitmap', address: MEM.CHANNEL_BITMAP, length: 512 });
  regions.push({ name: 'Zone Bitmap', address: MEM.ZONE_BITMAP, length: 32 });
  regions.push({ name: 'Scan List Bitmap', address: MEM.SCAN_LIST_BITMAP, length: 32 });
  regions.push({ name: 'Radio ID Bitmap', address: MEM.RADIO_ID_BITMAP, length: 32 });
  regions.push({ name: 'Group List Bitmap', address: MEM.GROUP_LIST_BITMAP, length: 32 });
  regions.push({ name: 'Digital Contact Bitmap', address: MEM.DIGITAL_CONTACT_BITMAP, length: 512 });
  regions.push({ name: 'Message Bytemap', address: MEM.MESSAGE_BYTEMAP, length: 100 });
  regions.push({ name: 'Roaming Channel Bitmap', address: MEM.ROAMING_CH_BITMAP, length: 32 });
  regions.push({ name: 'Roaming Zone Bitmap', address: MEM.ROAMING_ZONE_BITMAP, length: 8 });

  // Settings
  regions.push({ name: 'General Settings', address: MEM.GENERAL_SETTINGS, length: 240 });
  regions.push({ name: 'Boot Settings', address: MEM.BOOT_SETTINGS, length: 48 });
  regions.push({ name: 'APRS Settings', address: MEM.APRS_SETTINGS, length: 256 });
  regions.push({ name: 'APRS Message', address: MEM.APRS_MESSAGE, length: 64 });

  // Zone names and channel lists (read all 250 regardless — bitmap tells us which are valid)
  // We'll read these per-slot after bitmap analysis

  return regions;
}

// =============================================================================
// Reading from Radio — Main Entry Point
// =============================================================================

export interface ReadProgress {
  phase: string;
  current: number;
  total: number;
}

/**
 * Read the entire codeplug from the radio.
 * This reads bitmaps first, then only the populated records.
 */
export async function readRadioCodeplug(
  conn: RadioConnection,
  onProgress?: (p: ReadProgress) => void,
): Promise<Codeplug> {
  const report = (phase: string, current: number, total: number) =>
    onProgress?.({ phase, current, total });

  // Phase 1: Read bitmaps
  report('Reading bitmaps...', 0, 100);

  const channelBitmapData = await readRegion(conn, MEM.CHANNEL_BITMAP, 512);
  const zoneBitmapData = await readRegion(conn, MEM.ZONE_BITMAP, 32);
  const scanListBitmapData = await readRegion(conn, MEM.SCAN_LIST_BITMAP, 32);
  const radioIdBitmapData = await readRegion(conn, MEM.RADIO_ID_BITMAP, 32);
  const groupListBitmapData = await readRegion(conn, MEM.GROUP_LIST_BITMAP, 32);
  const contactBitmapData = await readRegion(conn, MEM.DIGITAL_CONTACT_BITMAP, 512);
  const messageBytemap = await readRegion(conn, MEM.MESSAGE_BYTEMAP, 100);
  const roamingChBitmapData = await readRegion(conn, MEM.ROAMING_CH_BITMAP, 32);
  const roamingZoneBitmapData = await readRegion(conn, MEM.ROAMING_ZONE_BITMAP, 8);

  const channelSlots = readBitmap(channelBitmapData, MAX_CHANNELS);
  const zoneSlots = readBitmap(zoneBitmapData, MAX_ZONES);
  const scanListSlots = readBitmap(scanListBitmapData, MAX_SCAN_LISTS);
  const radioIdSlots = readBitmap(radioIdBitmapData, MAX_RADIO_IDS);
  const groupListSlots = readBitmap(groupListBitmapData, MAX_GROUP_LISTS);
  // The digital contact bitmap is INVERTED on the D578UV: a cleared bit marks a
  // used slot, a set bit (erased flash, 0xFF) marks a free one. Verified against a
  // D578UV2 (fw V100): 32 contacts -> bitmap 00 00 00 00 ff ff ...; slot 32+ = 0xFF.
  const contactSlots = readBitmap(contactBitmapData.map(b => ~b & 0xff), MAX_DIGITAL_CONTACTS);
  const messageSlots = readBytemap(messageBytemap, MAX_TEXT_MESSAGES);
  const roamingChSlots = readBitmap(roamingChBitmapData, MAX_ROAMING_CHANNELS);
  const roamingZoneSlots = readBitmap(roamingZoneBitmapData, MAX_ROAMING_ZONES);

  // Count total records to read for progress tracking
  const totalRecords = channelSlots.size + zoneSlots.size * 2 + scanListSlots.size +
    radioIdSlots.size + groupListSlots.size + contactSlots.size +
    messageSlots.size + roamingChSlots.size + roamingZoneSlots.size + 3; // +3 for settings
  let recordsRead = 0;

  // Phase 2: Read settings
  report('Reading settings...', 0, totalRecords);
  const generalSettings = await readRegion(conn, MEM.GENERAL_SETTINGS, 240);
  recordsRead++;
  const bootSettings = await readRegion(conn, MEM.BOOT_SETTINGS, 48);
  recordsRead++;
  const aprsRaw = await readRegion(conn, MEM.APRS_SETTINGS, 256);
  recordsRead++;

  // Phase 3: Read channels
  const channels: Channel[] = [];
  const sortedChannelSlots = [...channelSlots].sort((a, b) => a - b);
  for (const slot of sortedChannelSlots) {
    report('Reading channels...', recordsRead, totalRecords);
    const addr = channelAddress(slot);
    const data = await readRegion(conn, addr, CHANNEL_RECORD_SIZE);
    const ch = parseRadioChannel(data, slot);
    if (ch) channels.push(ch);
    recordsRead++;
  }

  // Phase 4: Read zones (name + channel list separately)
  const zones: Zone[] = [];
  const sortedZoneSlots = [...zoneSlots].sort((a, b) => a - b);
  for (const slot of sortedZoneSlots) {
    report('Reading zones...', recordsRead, totalRecords);
    const nameAddr = MEM.ZONE_NAMES + slot * ZONE_NAME_SIZE;
    const nameData = await readRegion(conn, nameAddr, ZONE_NAME_SIZE);
    recordsRead++;
    const listAddr = MEM.ZONE_CHANNEL_LISTS + slot * ZONE_CHANNEL_LIST_SIZE;
    const listData = await readRegion(conn, listAddr, ZONE_CHANNEL_LIST_SIZE);
    recordsRead++;
    const z = parseRadioZone(nameData, listData, slot);
    if (z) zones.push(z);
  }

  // Phase 5: Read scan lists
  const scanLists: ScanList[] = [];
  const sortedScanListSlots = [...scanListSlots].sort((a, b) => a - b);
  for (const slot of sortedScanListSlots) {
    report('Reading scan lists...', recordsRead, totalRecords);
    const addr = scanListAddress(slot);
    const data = await readRegion(conn, addr, SCAN_LIST_RECORD_SIZE);
    const sl = parseRadioScanList(data, slot);
    if (sl) scanLists.push(sl);
    recordsRead++;
  }

  // Phase 6: Read radio IDs
  const radioIds: RadioId[] = [];
  const sortedRadioIdSlots = [...radioIdSlots].sort((a, b) => a - b);
  for (const slot of sortedRadioIdSlots) {
    report('Reading radio IDs...', recordsRead, totalRecords);
    const addr = MEM.RADIO_IDS + slot * RADIO_ID_RECORD_SIZE;
    const data = await readRegion(conn, addr, RADIO_ID_RECORD_SIZE);
    const rid = parseRadioId(data, slot);
    if (rid) radioIds.push(rid);
    recordsRead++;
  }

  // Phase 7: Read digital contacts
  const digitalContacts: DigitalContact[] = [];
  const sortedContactSlots = [...contactSlots].sort((a, b) => a - b);
  for (const slot of sortedContactSlots) {
    report('Reading contacts...', recordsRead, totalRecords);
    const addr = digitalContactAddress(slot);
    const data = await readRegion(conn, addr, DIGITAL_CONTACT_RECORD_SIZE);
    const dc = parseRadioDigitalContact(data, slot);
    if (dc) digitalContacts.push(dc);
    recordsRead++;
  }

  // Phase 8: Read group lists
  const groupLists: GroupList[] = [];
  const sortedGroupListSlots = [...groupListSlots].sort((a, b) => a - b);
  for (const slot of sortedGroupListSlots) {
    report('Reading group lists...', recordsRead, totalRecords);
    const addr = MEM.GROUP_LISTS + slot * GROUP_LIST_SPACING;
    const data = await readRegion(conn, addr, GROUP_LIST_RECORD_SIZE);
    const gl = parseRadioGroupList(data, slot);
    if (gl) groupLists.push(gl);
    recordsRead++;
  }

  // Phase 9: Read text messages
  const textMessages: TextMessage[] = [];
  const sortedMessageSlots = [...messageSlots].sort((a, b) => a - b);
  for (const slot of sortedMessageSlots) {
    report('Reading messages...', recordsRead, totalRecords);
    const addr = textMessageAddress(slot);
    const data = await readRegion(conn, addr, TEXT_MESSAGE_RECORD_SIZE);
    const msg = parseRadioTextMessage(data, slot);
    if (msg) textMessages.push(msg);
    recordsRead++;
  }

  // Phase 10: Read roaming channels
  const roamingChannels: RoamingChannel[] = [];
  const sortedRoamingChSlots = [...roamingChSlots].sort((a, b) => a - b);
  for (const slot of sortedRoamingChSlots) {
    report('Reading roaming...', recordsRead, totalRecords);
    const addr = MEM.ROAMING_CHANNELS + slot * ROAMING_CHANNEL_SIZE;
    const data = await readRegion(conn, addr, ROAMING_CHANNEL_SIZE);
    const rc = parseRadioRoamingChannel(data, slot);
    if (rc) roamingChannels.push(rc);
    recordsRead++;
  }

  // Phase 11: Read roaming zones
  const roamingZones: RoamingZone[] = [];
  const sortedRoamingZoneSlots = [...roamingZoneSlots].sort((a, b) => a - b);
  for (const slot of sortedRoamingZoneSlots) {
    report('Reading roaming zones...', recordsRead, totalRecords);
    const addr = MEM.ROAMING_ZONES + slot * ROAMING_ZONE_SIZE;
    const data = await readRegion(conn, addr, ROAMING_ZONE_SIZE);
    const rz = parseRadioRoamingZone(data, slot);
    if (rz) roamingZones.push(rz);
    recordsRead++;
  }

  report('Building codeplug...', totalRecords, totalRecords);

  // Build the Codeplug object
  return buildCodeplug({
    channels, zones, scanLists, radioIds, digitalContacts, groupLists,
    textMessages, roamingChannels, roamingZones,
    generalSettings, bootSettings, aprsRaw,
  });
}

// =============================================================================
// Radio Memory → Codeplug Field Parsers
// =============================================================================

/** Parse a 64-byte radio channel record into a Channel. */
function parseRadioChannel(data: Uint8Array, slotIndex: number): Channel | null {
  // Check if record is all 0xFF (empty slot despite bitmap)
  if (data.every(b => b === 0xff)) return null;

  const rxFreq = decodeBcdFrequency(data, 0x00);
  const txOffset = decodeBcdFrequency(data, 0x04);

  // Byte 0x08: Mode/BW/Power/Repeater bit field
  const flags = data[0x08];
  const repeaterBits = (flags >> 6) & 0x03;
  const repeaterMode: RepeaterMode =
    repeaterBits === 1 ? 'positive' : repeaterBits === 2 ? 'negative' : 'simplex';
  const bandwidth: Bandwidth = (flags & 0x10) ? 'wide' : 'narrow';
  const powerBits = (flags >> 2) & 0x03;
  const power: PowerLevel =
    powerBits === 0 ? 'low' : powerBits === 1 ? 'mid' : powerBits === 2 ? 'high' : 'turbo';
  const modeBits = flags & 0x03;
  const mode: ChannelMode = (modeBits === 1 || modeBits === 3) ? 'digital' : 'analog';

  // Byte 0x09: signaling flags
  const sigFlags = data[0x09];
  const rxOnly = (sigFlags & 0x20) !== 0;

  // Byte 0x1A: admit criterion (bits 1-0)
  const admitCriteria = data[0x1A] & 0x03;

  // Byte 0x20: color code
  const colorCode = data[0x20] & 0x0f;

  // Byte 0x22 bit 6: time slot
  const timeSlot: TimeSlot = (data[0x22] & 0x40) ? 2 : 1;

  // Name at 0x23, 16 bytes
  const name = readAscii(data, 0x23, 16);

  // Compute TX frequency
  let txFrequency: number;
  if (repeaterMode === 'positive') txFrequency = rxFreq + txOffset;
  else if (repeaterMode === 'negative') txFrequency = rxFreq - txOffset;
  else txFrequency = rxFreq;

  // Build RDT-format _raw buffer
  const rdtRaw = buildRdtChannelRaw({
    index: slotIndex + 1, // 1-based in editor
    name, rxFrequency: rxFreq, txOffset, repeaterMode, mode,
    power, bandwidth, rxOnly, admitCriteria, colorCode, timeSlot,
  });

  return {
    index: slotIndex + 1, // 1-based in the editor
    name,
    rxFrequency: rxFreq,
    txFrequency,
    repeaterMode,
    txOffset,
    mode,
    power,
    bandwidth,
    rxOnly,
    admitCriteria,
    colorCode,
    timeSlot,
    _raw: rdtRaw,
    _nameLen: name.length,
  };
}

/** Parse a zone (name data + channel list data) into a Zone. */
function parseRadioZone(nameData: Uint8Array, listData: Uint8Array, slotIndex: number): Zone | null {
  const name = readAscii(nameData, 0, 16);
  if (!name) return null;

  // Channel list: 250 × uint16 LE, 0xFFFF = unused
  const view = new DataView(listData.buffer, listData.byteOffset, listData.byteLength);
  const channelIndices: number[] = [];
  for (let i = 0; i < 250; i++) {
    const idx = view.getUint16(i * 2, true);
    if (idx === 0xffff) continue;
    channelIndices.push(idx + 1); // Convert 0-based radio to 1-based editor
  }

  // Build minimal RDT-format _raw
  const nameLen = name.length;
  const nameFieldSize = nameLen < 16 ? nameLen + 1 : 16;
  const recordSize = 1 + 1 + channelIndices.length * 2 + 4 + nameFieldSize;
  const raw = new Uint8Array(recordSize);
  const rawView = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  raw[0] = slotIndex + 1; // index
  raw[1] = channelIndices.length;
  for (let i = 0; i < channelIndices.length; i++) {
    rawView.setUint16(2 + i * 2, channelIndices[i], true);
  }
  const nameOffset = 2 + channelIndices.length * 2 + 4;
  for (let i = 0; i < nameFieldSize; i++) {
    raw[nameOffset + i] = i < name.length ? name.charCodeAt(i) : 0;
  }

  return {
    index: slotIndex + 1,
    name,
    channelIndices,
    _padding: new Uint8Array(4),
    _raw: raw,
  };
}

/** Parse a 144-byte radio scan list record. */
function parseRadioScanList(data: Uint8Array, slotIndex: number): ScanList | null {
  const name = readAscii(data, 0x0f, 16);
  if (!name) return null;

  // Members at 0x20: 50 × uint16 LE, 0xFFFF = unused
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const channelIndices: number[] = [];
  const entryFlags: number[] = [];
  for (let i = 0; i < 50; i++) {
    const idx = view.getUint16(0x20 + i * 2, true);
    if (idx === 0xffff) continue;
    channelIndices.push(idx + 1); // 0-based radio to 1-based editor
    entryFlags.push(0);
  }

  // Build minimal RDT-format _raw
  const nameLen = name.length;
  const nameFieldSize = nameLen < 16 ? nameLen + 1 : 16;
  const recordSize = 1 + nameFieldSize + 7 + 4 + 1 + channelIndices.length * 3;
  const raw = new Uint8Array(recordSize);

  return {
    index: slotIndex + 1,
    name,
    channelIndices,
    entryFlags,
    _settings: new Uint8Array(data.subarray(0x01, 0x01 + 7)),
    _timing: new Uint8Array(data.subarray(0x08, 0x08 + 4)),
    _raw: raw,
    _nameLen: nameLen,
  };
}

/** Parse a 32-byte radio ID record. */
function parseRadioId(data: Uint8Array, slotIndex: number): RadioId | null {
  const dmrId = decodeBcdId(data, 0x00);
  if (dmrId === 0) return null;

  const name = readAscii(data, 0x05, 16);

  // Build RDT-format _raw
  const nameLen = name.length;
  const nameFieldSize = nameLen < 16 ? nameLen + 1 : 16;
  const recordSize = 1 + 3 + nameFieldSize;
  const raw = new Uint8Array(recordSize);
  const rawView = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  rawView.setUint8(0, slotIndex + 1);
  // DMR ID as uint24 LE in RDT format
  rawView.setUint8(1, dmrId & 0xff);
  rawView.setUint8(2, (dmrId >> 8) & 0xff);
  rawView.setUint8(3, (dmrId >> 16) & 0xff);
  for (let i = 0; i < nameFieldSize; i++) {
    raw[4 + i] = i < name.length ? name.charCodeAt(i) : 0;
  }

  return {
    index: slotIndex + 1,
    dmrId,
    name,
    _raw: raw,
  };
}

/** Parse a 100-byte digital contact record. */
function parseRadioDigitalContact(data: Uint8Array, slotIndex: number): DigitalContact | null {
  // Record layout (verified on D578UV2 fw V100, matches qdmr's AnyTone layout):
  //   0x00 call type (0 = private, 1 = group, 2 = all call)
  //   0x01 name (ASCII, null-padded)
  //   0x23 DMR ID, 4-byte big-endian BCD (e.g. 00 00 31 25 = TG 3125)
  const contactType = data[0x00];
  const callType = contactType === 0 ? 'private' as const :
                   contactType === 1 ? 'group' as const : 'all' as const;

  const dmrId = decodeBcdId(data, 0x23);

  // Build minimal _raw for RDT blob compatibility
  // RDT digital contact: dmrId(3, uint24_le) + index(1) + 0x00 + callType(1) + data
  const raw = new Uint8Array(6);
  const rawView = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  rawView.setUint8(0, dmrId & 0xff);
  rawView.setUint8(1, (dmrId >> 8) & 0xff);
  rawView.setUint8(2, (dmrId >> 16) & 0xff);
  rawView.setUint8(3, slotIndex + 1);
  rawView.setUint8(4, 0x00);
  rawView.setUint8(5, callType === 'group' ? 0x10 : 0x00);

  return {
    index: slotIndex + 1,
    dmrId,
    callType,
    _raw: raw,
    _blobOffset: 0,
  };
}

/** Parse a 288-byte group list record. */
function parseRadioGroupList(data: Uint8Array, slotIndex: number): GroupList | null {
  const name = readAscii(data, 0x100, 16);
  if (!name) return null;

  // Members: 64 × uint32 LE at offset 0x00, 0xFFFFFFFF = empty
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const contactIndices: number[] = [];
  for (let i = 0; i < 64; i++) {
    const idx = view.getUint32(i * 4, true);
    if (idx === 0xffffffff) continue;
    contactIndices.push(idx + 1); // 0-based radio to 1-based editor
  }

  // Build minimal RDT-format _raw
  const nameLen = name.length;
  const nameFieldSize = nameLen < 16 ? nameLen + 1 : 16;
  const recordSize = 8 + nameFieldSize + 4 + contactIndices.length * 5;
  const raw = new Uint8Array(recordSize);

  return {
    index: slotIndex,
    name,
    contactIndices,
    _raw: raw,
    _nameLen: nameLen,
    _settings: new Uint8Array(8),
    _entryHeader: new Uint8Array([0, 0, 0, contactIndices.length]),
    _entryExtras: contactIndices.map((_, i) => new Uint8Array([i, 0, 0, 0])),
  };
}

/** Parse a 256-byte text message record. */
function parseRadioTextMessage(data: Uint8Array, slotIndex: number): TextMessage | null {
  const text = readAscii(data, 0, 99);
  if (!text) return null;
  return { index: slotIndex, text };
}

/** Parse a 32-byte roaming channel record. */
function parseRadioRoamingChannel(data: Uint8Array, slotIndex: number): RoamingChannel | null {
  // Roaming channels have name at offset 0x10 (16 bytes)
  const name = readAscii(data, 0x10, 16) || `Roaming CH ${slotIndex + 1}`;

  return {
    index: slotIndex + 1,
    name,
    _raw: new Uint8Array(data),
    _nameLen: name.length,
  };
}

/** Parse a 128-byte roaming zone record. */
function parseRadioRoamingZone(data: Uint8Array, slotIndex: number): RoamingZone | null {
  // Name at offset 0x40 (16 bytes in qdmr layout)
  const name = readAscii(data, 0x40, 16) || `ROAM ZONE ${slotIndex + 1}`;

  // Members: 64 × uint8 at offset 0x00, 0xFF = unused
  const channelIndices: number[] = [];
  for (let i = 0; i < 64; i++) {
    if (data[i] === 0xff) continue;
    channelIndices.push(data[i] + 1);
  }

  return {
    index: slotIndex,
    name,
    channelIndices,
    _raw: new Uint8Array(data),
    _nameLen: name.length,
  };
}

// =============================================================================
// Build RDT-format _raw buffers (for compatibility with the RDT writer)
// =============================================================================

interface ChannelFields {
  index: number;
  name: string;
  rxFrequency: number;
  txOffset: number;
  repeaterMode: RepeaterMode;
  mode: ChannelMode;
  power: PowerLevel;
  bandwidth: Bandwidth;
  rxOnly: boolean;
  admitCriteria: number;
  colorCode: number;
  timeSlot: TimeSlot;
}

const REPEATER_MODE_BYTE: Record<RepeaterMode, number> = { simplex: 0, positive: 1, negative: 2 };
const CHANNEL_MODE_BYTE: Record<ChannelMode, number> = { analog: 0, digital: 1 };
const POWER_BYTE: Record<PowerLevel, number> = { low: 0, mid: 1, high: 2, turbo: 3 };
const BANDWIDTH_BYTE: Record<Bandwidth, number> = { narrow: 0, wide: 1 };
const TIMESLOT_BYTE: Record<TimeSlot, number> = { 1: 0, 2: 1 };

/** Build an RDT-format _raw buffer for a channel record. */
function buildRdtChannelRaw(ch: ChannelFields): Uint8Array {
  const nameLen = ch.name.length;
  const nameFieldSize = nameLen < 16 ? nameLen + 1 : 16;
  const recordSize = 0x30 + nameFieldSize + 0x1A;
  const buf = new Uint8Array(recordSize);
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

  view.setUint16(0x00, ch.index, true);
  view.setUint32(0x02, Math.round(ch.rxFrequency * 100000), true);
  view.setUint8(0x06, REPEATER_MODE_BYTE[ch.repeaterMode]);
  view.setUint32(0x07, Math.round(ch.txOffset * 100000), true);
  view.setUint8(0x0b, CHANNEL_MODE_BYTE[ch.mode]);
  view.setUint8(0x0c, POWER_BYTE[ch.power]);
  view.setUint8(0x0d, BANDWIDTH_BYTE[ch.bandwidth]);
  view.setUint8(0x0f, ch.rxOnly ? 1 : 0);
  view.setUint8(0x20, ch.admitCriteria);
  view.setUint8(0x28, ch.colorCode);
  view.setUint8(0x2a, TIMESLOT_BYTE[ch.timeSlot]);
  // Name
  for (let i = 0; i < nameFieldSize; i++) {
    buf[0x30 + i] = i < ch.name.length ? ch.name.charCodeAt(i) : 0;
  }

  return buf;
}

// =============================================================================
// Build Codeplug from parsed radio data
// =============================================================================

interface ParsedRadioData {
  channels: Channel[];
  zones: Zone[];
  scanLists: ScanList[];
  radioIds: RadioId[];
  digitalContacts: DigitalContact[];
  groupLists: GroupList[];
  textMessages: TextMessage[];
  roamingChannels: RoamingChannel[];
  roamingZones: RoamingZone[];
  generalSettings: Uint8Array;
  bootSettings: Uint8Array;
  aprsRaw: Uint8Array;
}

function buildCodeplug(data: ParsedRadioData): Codeplug {
  // Build a synthetic RDT header
  const header: FileHeader = {
    version: 'V1039',
    payloadSize: 0, // Will be recalculated by the RDT writer
    modelName: 'D578UV',
    reserved: new Uint8Array(3),
    cpsVersion: 'V110',
  };

  // Preserve raw 240-byte general settings for radio-memory codec
  const generalSettingsRaw = new Uint8Array(data.generalSettings.subarray(0, 240));

  // Build a default settings block (445 bytes) — RDT format placeholder
  const settingsBlock = new Uint8Array(445);

  // Build digital contacts raw blob (needed by RDT writer)
  // RDT format: uint16_le size + contact records
  const dcRecords: Uint8Array[] = data.digitalContacts.map(dc => dc._raw);
  const dcBlobSize = dcRecords.reduce((sum, r) => sum + r.byteLength, 0);
  const _digitalContactsRaw = new Uint8Array(2 + dcBlobSize);
  const dcView = new DataView(_digitalContactsRaw.buffer);
  dcView.setUint16(0, dcBlobSize, true);
  let dcOffset = 2;
  for (let i = 0; i < dcRecords.length; i++) {
    // Update _blobOffset for each contact
    data.digitalContacts[i] = { ...data.digitalContacts[i], _blobOffset: dcOffset };
    _digitalContactsRaw.set(dcRecords[i], dcOffset);
    dcOffset += dcRecords[i].byteLength;
  }

  // Build APRS settings (use defaults if not parseable)
  const aprsSettings: AprsSettings = {
    gpsMessage: readAscii(data.aprsRaw, 0, 128) || 'My current GPS',
    callsign: '',
    ssid: 0,
    destination: '',
    paths: [],
    comment: '',
    _raw: data.aprsRaw,
    _fieldOffsets: {
      gpsMessage: { pos: 0, maxLen: 14 },
      destination: { pos: 0, maxLen: 0 },
      callsign: { pos: 0, maxLen: 0 },
      ssid: { pos: 0 },
      paths: { pos: 0, maxLen: 0 },
      comment: { pos: 0, maxLen: 0 },
    },
  };

  // Build group list section headers
  const _groupListHeader = new Uint8Array([0, 0, data.groupLists.length]);
  const _groupListTail = new Uint8Array(0);

  // Build group lists raw
  let glRawSize = 3;
  for (const gl of data.groupLists) {
    const nameFieldSize = gl._nameLen < 16 ? gl._nameLen + 1 : 16;
    glRawSize += 8 + nameFieldSize + 4 + gl.contactIndices.length * 5;
  }
  const _groupListsRaw = new Uint8Array(glRawSize);

  return {
    source: 'radio',
    header,
    settingsBlock,
    generalSettingsRaw,
    channels: data.channels,
    radioIds: data.radioIds,
    zones: data.zones,
    scanLists: data.scanLists,
    analogContacts: [],
    digitalContacts: data.digitalContacts,
    _digitalContactsRaw,
    textMessages: data.textMessages,
    _textMessageHeader: new Uint8Array(8),
    groupLists: data.groupLists,
    _groupListsRaw,
    _groupListHeader,
    _groupListTail,
    aprsSettings,
    _aprsRaw: data.aprsRaw,
    roamingChannels: data.roamingChannels,
    roamingZones: data.roamingZones,
    _roamingRaw: new Uint8Array(0),
    _trailingBytes: new Uint8Array(0),
  };
}

// =============================================================================
// Writing to Radio — Codeplug → Radio Memory
// =============================================================================

export interface WriteRegion {
  address: number;
  data: Uint8Array;
}

/**
 * Serialize a Codeplug into a list of memory write operations for the radio.
 */
export function serializeToRadioMemory(codeplug: Codeplug): WriteRegion[] {
  const writes: WriteRegion[] = [];

  // Build channel bitmap
  const channelBitmap = new Uint8Array(512);
  const channelSlotMap = new Map<number, Channel>();
  for (const ch of codeplug.channels) {
    const slot = ch.index - 1; // 1-based editor to 0-based radio
    if (slot >= 0 && slot < MAX_CHANNELS) {
      const byteIdx = Math.floor(slot / 8);
      const bitIdx = slot % 8;
      channelBitmap[byteIdx] |= (1 << bitIdx);
      channelSlotMap.set(slot, ch);
    }
  }
  writes.push({ address: MEM.CHANNEL_BITMAP, data: channelBitmap });

  // Write channel records
  for (const [slot, ch] of channelSlotMap) {
    const data = serializeRadioChannel(ch);
    writes.push({ address: channelAddress(slot), data });
  }

  // Build zone bitmap and write zones
  const zoneBitmap = new Uint8Array(32);
  for (const z of codeplug.zones) {
    const slot = z.index - 1;
    if (slot >= 0 && slot < MAX_ZONES) {
      const byteIdx = Math.floor(slot / 8);
      const bitIdx = slot % 8;
      zoneBitmap[byteIdx] |= (1 << bitIdx);

      // Zone name
      const nameData = new Uint8Array(ZONE_NAME_SIZE);
      writeAscii(nameData, 0, z.name, 16);
      writes.push({ address: MEM.ZONE_NAMES + slot * ZONE_NAME_SIZE, data: nameData });

      // Zone channel list
      const listData = new Uint8Array(ZONE_CHANNEL_LIST_SIZE);
      listData.fill(0xff); // 0xFFFF = empty slot
      const listView = new DataView(listData.buffer);
      for (let i = 0; i < Math.min(z.channelIndices.length, 250); i++) {
        listView.setUint16(i * 2, z.channelIndices[i] - 1, true); // 1-based to 0-based
      }
      writes.push({ address: MEM.ZONE_CHANNEL_LISTS + slot * ZONE_CHANNEL_LIST_SIZE, data: listData });
    }
  }
  writes.push({ address: MEM.ZONE_BITMAP, data: zoneBitmap });

  // Build radio ID bitmap and write radio IDs
  const radioIdBitmap = new Uint8Array(32);
  for (const rid of codeplug.radioIds) {
    const slot = rid.index - 1;
    if (slot >= 0 && slot < MAX_RADIO_IDS) {
      const byteIdx = Math.floor(slot / 8);
      const bitIdx = slot % 8;
      radioIdBitmap[byteIdx] |= (1 << bitIdx);

      const data = new Uint8Array(RADIO_ID_RECORD_SIZE);
      data.set(encodeBcdId(rid.dmrId), 0);
      writeAscii(data, 0x05, rid.name, 16);
      writes.push({ address: MEM.RADIO_IDS + slot * RADIO_ID_RECORD_SIZE, data });
    }
  }
  writes.push({ address: MEM.RADIO_ID_BITMAP, data: radioIdBitmap });

  // Build scan list bitmap and write scan lists
  const scanListBitmap = new Uint8Array(32);
  for (const sl of codeplug.scanLists) {
    const slot = sl.index - 1;
    if (slot >= 0 && slot < MAX_SCAN_LISTS) {
      const byteIdx = Math.floor(slot / 8);
      const bitIdx = slot % 8;
      scanListBitmap[byteIdx] |= (1 << bitIdx);

      const data = serializeRadioScanList(sl);
      writes.push({ address: scanListAddress(slot), data });
    }
  }
  writes.push({ address: MEM.SCAN_LIST_BITMAP, data: scanListBitmap });

  // Build digital contact bitmap and write contacts.
  // Inverted bitmap (see readRadioCodeplug): start all-free (0xFF), clear bit = used.
  const contactBitmap = new Uint8Array(512).fill(0xff);
  for (const dc of codeplug.digitalContacts) {
    const slot = dc.index - 1;
    if (slot >= 0 && slot < MAX_DIGITAL_CONTACTS) {
      const byteIdx = Math.floor(slot / 8);
      const bitIdx = slot % 8;
      contactBitmap[byteIdx] &= ~(1 << bitIdx);

      const data = serializeRadioDigitalContact(dc);
      writes.push({ address: digitalContactAddress(slot), data });
    }
  }
  writes.push({ address: MEM.DIGITAL_CONTACT_BITMAP, data: contactBitmap });

  // Build group list bitmap and write group lists
  const groupListBitmap = new Uint8Array(32);
  for (const gl of codeplug.groupLists) {
    const slot = gl.index;
    if (slot >= 0 && slot < MAX_GROUP_LISTS) {
      const byteIdx = Math.floor(slot / 8);
      const bitIdx = slot % 8;
      groupListBitmap[byteIdx] |= (1 << bitIdx);

      const data = serializeRadioGroupList(gl);
      writes.push({ address: MEM.GROUP_LISTS + slot * GROUP_LIST_SPACING, data });
    }
  }
  writes.push({ address: MEM.GROUP_LIST_BITMAP, data: groupListBitmap });

  // Build message bytemap and write text messages
  const messageBytemap = new Uint8Array(MAX_TEXT_MESSAGES);
  messageBytemap.fill(0xff); // All free by default
  for (const msg of codeplug.textMessages) {
    const slot = msg.index;
    if (slot >= 0 && slot < MAX_TEXT_MESSAGES) {
      messageBytemap[slot] = 0x00; // Mark as used
      const data = new Uint8Array(TEXT_MESSAGE_RECORD_SIZE);
      writeAscii(data, 0, msg.text, 99);
      writes.push({ address: textMessageAddress(slot), data });
    }
  }
  writes.push({ address: MEM.MESSAGE_BYTEMAP, data: messageBytemap });

  // Build roaming channel bitmap and write
  const roamingChBitmap = new Uint8Array(32);
  for (const rc of codeplug.roamingChannels) {
    const slot = rc.index - 1;
    if (slot >= 0 && slot < MAX_ROAMING_CHANNELS) {
      const byteIdx = Math.floor(slot / 8);
      const bitIdx = slot % 8;
      roamingChBitmap[byteIdx] |= (1 << bitIdx);
      writes.push({ address: MEM.ROAMING_CHANNELS + slot * ROAMING_CHANNEL_SIZE, data: new Uint8Array(rc._raw) });
    }
  }
  writes.push({ address: MEM.ROAMING_CH_BITMAP, data: roamingChBitmap });

  // Build roaming zone bitmap and write
  const roamingZoneBitmap = new Uint8Array(8);
  for (const rz of codeplug.roamingZones) {
    const slot = rz.index;
    if (slot >= 0 && slot < MAX_ROAMING_ZONES) {
      const byteIdx = Math.floor(slot / 8);
      const bitIdx = slot % 8;
      roamingZoneBitmap[byteIdx] |= (1 << bitIdx);
      writes.push({ address: MEM.ROAMING_ZONES + slot * ROAMING_ZONE_SIZE, data: new Uint8Array(rz._raw) });
    }
  }
  writes.push({ address: MEM.ROAMING_ZONE_BITMAP, data: roamingZoneBitmap });

  return writes;
}

/**
 * Write a codeplug to the radio.
 */
export async function writeRadioCodeplug(
  conn: RadioConnection,
  codeplug: Codeplug,
  onProgress?: (p: ReadProgress) => void,
): Promise<void> {
  const report = (phase: string, current: number, total: number) =>
    onProgress?.({ phase, current, total });

  report('Serializing codeplug...', 0, 100);
  const writes = serializeToRadioMemory(codeplug);

  // Calculate total bytes to write
  const totalBytes = writes.reduce((sum, w) => sum + w.data.length, 0);
  let bytesWritten = 0;

  for (const w of writes) {
    report('Writing to radio...', bytesWritten, totalBytes);
    await writeRegion(conn, w.address, w.data, (written) => {
      report('Writing to radio...', bytesWritten + written, totalBytes);
    });
    bytesWritten += w.data.length;
  }

  report('Write complete', totalBytes, totalBytes);
}

// =============================================================================
// Codeplug → Radio Memory Serializers
// =============================================================================

/** Serialize a Channel to 64-byte radio memory format. */
function serializeRadioChannel(ch: Channel): Uint8Array {
  const data = new Uint8Array(CHANNEL_RECORD_SIZE);

  // RX frequency — BCD big-endian
  data.set(encodeBcdFrequency(ch.rxFrequency), 0x00);

  // TX offset — BCD big-endian
  data.set(encodeBcdFrequency(ch.txOffset), 0x04);

  // Byte 0x08: Mode/BW/Power/Repeater
  let flags = 0;
  const repeaterBits = ch.repeaterMode === 'positive' ? 1 : ch.repeaterMode === 'negative' ? 2 : 0;
  flags |= (repeaterBits << 6);
  if (ch.bandwidth === 'wide') flags |= 0x10;
  const powerBits = POWER_BYTE[ch.power];
  flags |= (powerBits << 2);
  flags |= CHANNEL_MODE_BYTE[ch.mode];
  data[0x08] = flags;

  // Byte 0x09: signaling flags
  let sigFlags = 0;
  if (ch.rxOnly) sigFlags |= 0x20;
  data[0x09] = sigFlags;

  // CTCSS/DCS tones — set to none (0xFF)
  data[0x0a] = 0x00; // TX CTCSS index = none
  data[0x0b] = 0x00; // RX CTCSS index = none

  // Contact index = none
  data[0x14] = 0xff;
  data[0x15] = 0xff;
  data[0x16] = 0xff;
  data[0x17] = 0xff;

  // Byte 0x1A: admit criterion
  data[0x1a] = ch.admitCriteria & 0x03;

  // Scan list / group list = none
  data[0x1b] = 0xff;
  data[0x1c] = 0xff;

  // Byte 0x20: color code
  data[0x20] = ch.colorCode & 0x0f;

  // Byte 0x22: time slot (bit 6)
  if (ch.timeSlot === 2) data[0x22] |= 0x40;

  // Name at 0x23
  writeAscii(data, 0x23, ch.name, 16);

  return data;
}

/** Serialize a ScanList to 144-byte radio memory format. */
function serializeRadioScanList(sl: ScanList): Uint8Array {
  const data = new Uint8Array(SCAN_LIST_RECORD_SIZE);
  data.fill(0xff); // Default empty slots

  // Priority settings
  if (sl._settings.length >= 7) {
    data.set(sl._settings.subarray(0, 7), 0x01);
  }
  if (sl._timing.length >= 4) {
    data.set(sl._timing.subarray(0, 4), 0x08);
  }

  // Name at 0x0F
  writeAscii(data, 0x0f, sl.name, 16);

  // Members at 0x20: up to 50 × uint16 LE
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  for (let i = 0; i < Math.min(sl.channelIndices.length, 50); i++) {
    view.setUint16(0x20 + i * 2, sl.channelIndices[i] - 1, true); // 1-based to 0-based
  }

  return data;
}

/** Serialize a DigitalContact to 100-byte radio memory format. */
function serializeRadioDigitalContact(dc: DigitalContact): Uint8Array {
  const data = new Uint8Array(DIGITAL_CONTACT_RECORD_SIZE);

  // Type byte at 0x00 (0 = private, 1 = group, 2 = all call)
  data[0x00] = dc.callType === 'private' ? 0 : dc.callType === 'group' ? 1 : 2;

  // DMR ID as 4-byte BCD at 0x23
  data.set(encodeBcdId(dc.dmrId), 0x23);

  return data;
}

/** Serialize a GroupList to 288-byte radio memory format. */
function serializeRadioGroupList(gl: GroupList): Uint8Array {
  const data = new Uint8Array(GROUP_LIST_RECORD_SIZE);
  data.fill(0xff); // 0xFFFFFFFF = empty member slot

  // Members: up to 64 × uint32 LE at offset 0x00
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  for (let i = 0; i < Math.min(gl.contactIndices.length, 64); i++) {
    view.setUint32(i * 4, gl.contactIndices[i] - 1, true); // 1-based to 0-based
  }

  // Name at 0x100
  writeAscii(data, 0x100, gl.name, 16);

  return data;
}
