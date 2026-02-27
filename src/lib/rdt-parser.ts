import type {
  FileHeader,
  Channel,
  RadioId,
  Zone,
  ScanList,
  AnalogContact,
  Codeplug,
  RepeaterMode,
  ChannelMode,
  PowerLevel,
  Bandwidth,
  TimeSlot,
} from './types';

// --- Constants -----------------------------------------------------------

const HEADER_SIZE = 23;
const SETTINGS_SIZE = 445; // D578UV model — settings block between header and channel count
const CHANNEL_COUNT_OFFSET = HEADER_SIZE + SETTINGS_SIZE; // 468

const MAX_NAME_LEN = 16;

// --- Helpers -------------------------------------------------------------

/**
 * Read an ASCII name of up to 16 bytes from the buffer at the given offset.
 * Stops at the first null byte. Returns { name, nameLen } where nameLen is the
 * number of content bytes (NOT including the null terminator).
 */
function readName(view: DataView, offset: number): { name: string; nameLen: number } {
  const bytes: number[] = [];
  for (let i = 0; i < MAX_NAME_LEN; i++) {
    if (offset + i >= view.byteLength) break;
    const b = view.getUint8(offset + i);
    if (b === 0) break;
    bytes.push(b);
  }
  const name = String.fromCharCode(...bytes);
  return { name, nameLen: bytes.length };
}

/**
 * Total bytes consumed by a name field (content + optional null terminator).
 * If the name is shorter than 16 bytes, a null terminator is present.
 */
function nameFieldSize(nameLen: number): number {
  return nameLen + (nameLen < MAX_NAME_LEN ? 1 : 0);
}

/**
 * Read a uint24 little-endian value at the given offset.
 */
function readUint24LE(view: DataView, offset: number): number {
  return (
    view.getUint8(offset) |
    (view.getUint8(offset + 1) << 8) |
    (view.getUint8(offset + 2) << 16)
  );
}

// --- Section Parsers -----------------------------------------------------

function parseHeader(view: DataView): FileHeader {
  if (view.byteLength < HEADER_SIZE) {
    throw new Error(`File too small for header: expected at least ${HEADER_SIZE} bytes, got ${view.byteLength}`);
  }

  // 5 bytes: version string
  const versionBytes: number[] = [];
  for (let i = 0; i < 5; i++) versionBytes.push(view.getUint8(i));
  const version = String.fromCharCode(...versionBytes);

  // 4 bytes: payload size (uint32_le)
  const payloadSize = view.getUint32(5, true);

  // 7 bytes: model name (null-terminated within 7 bytes)
  const modelBytes: number[] = [];
  for (let i = 0; i < 7; i++) {
    const b = view.getUint8(9 + i);
    if (b === 0) break;
    modelBytes.push(b);
  }
  const modelName = String.fromCharCode(...modelBytes);

  // 3 bytes reserved
  const reserved = new Uint8Array(view.buffer, view.byteOffset + 16, 3);

  // 4 bytes: CPS / hardware version
  const cpsBytes: number[] = [];
  for (let i = 0; i < 4; i++) cpsBytes.push(view.getUint8(19 + i));
  const cpsVersion = String.fromCharCode(...cpsBytes);

  return { version, payloadSize, modelName, reserved, cpsVersion };
}

function parseChannels(
  view: DataView,
  buffer: ArrayBuffer,
  offset: number,
): { channels: Channel[]; bytesConsumed: number } {
  if (offset + 2 > view.byteLength) {
    throw new Error(`Cannot read channel count at offset ${offset}: past end of file`);
  }

  const channelCount = view.getUint16(offset, true);
  let pos = offset + 2;
  const channels: Channel[] = [];

  for (let i = 0; i < channelCount; i++) {
    if (pos + 0x30 > view.byteLength) {
      throw new Error(`Channel ${i}: header extends past end of file at offset ${pos}`);
    }

    // Read the name to determine record size
    const { name, nameLen } = readName(view, pos + 0x30);
    const nameTotalBytes = nameFieldSize(nameLen);
    const recordSize = 0x30 + nameTotalBytes + 0x1A;

    if (pos + recordSize > view.byteLength) {
      throw new Error(`Channel ${i} ("${name}"): record extends past end of file (offset ${pos}, size ${recordSize})`);
    }

    // Parse fields
    const index = view.getUint16(pos + 0x00, true);
    const rxRaw = view.getUint32(pos + 0x02, true);
    const rxFrequency = rxRaw / 100000;

    const repeaterModeByte = view.getUint8(pos + 0x06);
    const repeaterMode: RepeaterMode =
      repeaterModeByte === 1 ? 'positive' :
      repeaterModeByte === 2 ? 'negative' :
      'simplex';

    const txOffsetRaw = view.getUint32(pos + 0x07, true);
    const txOffset = txOffsetRaw / 100000;

    // Compute TX frequency
    let txFrequency: number;
    if (repeaterMode === 'positive') {
      txFrequency = rxFrequency + txOffset;
    } else if (repeaterMode === 'negative') {
      txFrequency = rxFrequency - txOffset;
    } else {
      txFrequency = rxFrequency;
    }

    const modeByte = view.getUint8(pos + 0x0B);
    const mode: ChannelMode = modeByte === 1 ? 'digital' : 'analog';

    const powerByte = view.getUint8(pos + 0x0C);
    const power: PowerLevel =
      powerByte === 0 ? 'low' :
      powerByte === 1 ? 'mid' :
      powerByte === 2 ? 'high' :
      'turbo';

    const bwByte = view.getUint8(pos + 0x0D);
    const bandwidth: Bandwidth = bwByte === 1 ? 'wide' : 'narrow';

    const rxOnly = view.getUint8(pos + 0x0F) !== 0;

    const admitCriteria = view.getUint8(pos + 0x20);

    const colorCode = view.getUint8(pos + 0x28);

    const timeSlotByte = view.getUint8(pos + 0x2A);
    const timeSlot: TimeSlot = timeSlotByte === 1 ? 2 : 1;

    // Preserve raw bytes for the entire record
    const _raw = new Uint8Array(buffer.slice(pos, pos + recordSize));

    channels.push({
      index,
      name,
      rxFrequency,
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
      _raw,
      _nameLen: nameLen,
    });

    pos += recordSize;
  }

  return { channels, bytesConsumed: pos - offset };
}

function parseRadioIds(
  view: DataView,
  buffer: ArrayBuffer,
  offset: number,
): { radioIds: RadioId[]; bytesConsumed: number } {
  if (offset + 1 > view.byteLength) {
    throw new Error(`Cannot read radio ID count at offset ${offset}: past end of file`);
  }

  const count = view.getUint8(offset);
  let pos = offset + 1;
  const radioIds: RadioId[] = [];

  for (let i = 0; i < count; i++) {
    if (pos + 4 > view.byteLength) {
      throw new Error(`Radio ID ${i}: header extends past end of file at offset ${pos}`);
    }

    const index = view.getUint8(pos);
    const dmrId = readUint24LE(view, pos + 1);
    const { name, nameLen } = readName(view, pos + 4);
    const nameTotalBytes = nameFieldSize(nameLen);
    const recordSize = 1 + 3 + nameTotalBytes;

    if (pos + recordSize > view.byteLength) {
      throw new Error(`Radio ID ${i} ("${name}"): record extends past end of file`);
    }

    const _raw = new Uint8Array(buffer.slice(pos, pos + recordSize));

    radioIds.push({ index, dmrId, name, _raw });
    pos += recordSize;
  }

  return { radioIds, bytesConsumed: pos - offset };
}

function parseZones(
  view: DataView,
  buffer: ArrayBuffer,
  offset: number,
): { zones: Zone[]; bytesConsumed: number } {
  if (offset + 1 > view.byteLength) {
    throw new Error(`Cannot read zone count at offset ${offset}: past end of file`);
  }

  const count = view.getUint8(offset);
  let pos = offset + 1;
  const zones: Zone[] = [];

  for (let i = 0; i < count; i++) {
    if (pos + 2 > view.byteLength) {
      throw new Error(`Zone ${i}: header extends past end of file at offset ${pos}`);
    }

    const index = view.getUint8(pos);
    const channelCount = view.getUint8(pos + 1);
    const channelListSize = channelCount * 2;

    if (pos + 2 + channelListSize + 4 > view.byteLength) {
      throw new Error(`Zone ${i}: channel list extends past end of file`);
    }

    // Read channel indices
    const channelIndices: number[] = [];
    for (let c = 0; c < channelCount; c++) {
      channelIndices.push(view.getUint16(pos + 2 + c * 2, true));
    }

    // 4 bytes of padding/unknown after channel list
    const paddingOffset = pos + 2 + channelListSize;
    const _padding = new Uint8Array(buffer.slice(paddingOffset, paddingOffset + 4));

    // Zone name after padding
    const nameOffset = paddingOffset + 4;
    const { name, nameLen } = readName(view, nameOffset);
    const nameTotalBytes = nameFieldSize(nameLen);
    const recordSize = 1 + 1 + channelListSize + 4 + nameTotalBytes;

    if (pos + recordSize > view.byteLength) {
      throw new Error(`Zone ${i} ("${name}"): record extends past end of file`);
    }

    const _raw = new Uint8Array(buffer.slice(pos, pos + recordSize));

    zones.push({ index, name, channelIndices, _padding, _raw });
    pos += recordSize;
  }

  return { zones, bytesConsumed: pos - offset };
}

function parseScanLists(
  view: DataView,
  buffer: ArrayBuffer,
  offset: number,
): { scanLists: ScanList[]; bytesConsumed: number } {
  if (offset + 1 > view.byteLength) {
    throw new Error(`Cannot read scan list count at offset ${offset}: past end of file`);
  }

  const count = view.getUint8(offset);
  let pos = offset + 1;
  const scanLists: ScanList[] = [];

  for (let i = 0; i < count; i++) {
    if (pos + 1 > view.byteLength) {
      throw new Error(`Scan list ${i}: extends past end of file at offset ${pos}`);
    }

    const index = view.getUint8(pos);

    // Name follows index
    const { name, nameLen } = readName(view, pos + 1);
    const nameTotalBytes = nameFieldSize(nameLen);
    const headerOffset = pos + 1 + nameTotalBytes;

    if (headerOffset + 0x0E > view.byteLength) {
      throw new Error(`Scan list ${i} ("${name}"): header extends past end of file`);
    }

    // 14-byte header (priority channels, timing, etc.)
    const _header = new Uint8Array(buffer.slice(headerOffset, headerOffset + 0x0E));

    // Channel count is at relative offset 0x0B within the 14-byte header
    const channelCount = view.getUint8(headerOffset + 0x0B);
    const channelListOffset = headerOffset + 0x0E;
    const channelListSize = channelCount * 2;

    if (channelListOffset + channelListSize > view.byteLength) {
      throw new Error(`Scan list ${i} ("${name}"): channel list extends past end of file`);
    }

    const channelIndices: number[] = [];
    for (let c = 0; c < channelCount; c++) {
      channelIndices.push(view.getUint16(channelListOffset + c * 2, true));
    }

    const recordSize = 1 + nameTotalBytes + 0x0E + channelListSize;
    const _raw = new Uint8Array(buffer.slice(pos, pos + recordSize));

    scanLists.push({ index, name, channelIndices, _header, _raw });
    pos += recordSize;
  }

  return { scanLists, bytesConsumed: pos - offset };
}

function parseAnalogContacts(
  view: DataView,
  buffer: ArrayBuffer,
  offset: number,
): { analogContacts: AnalogContact[]; bytesConsumed: number } {
  if (offset + 1 > view.byteLength) {
    throw new Error(`Cannot read analog contact count at offset ${offset}: past end of file`);
  }

  const count = view.getUint8(offset);
  let pos = offset + 1;
  const analogContacts: AnalogContact[] = [];

  for (let i = 0; i < count; i++) {
    if (pos + 1 > view.byteLength) {
      throw new Error(`Analog contact ${i}: extends past end of file at offset ${pos}`);
    }

    const index = view.getUint8(pos);

    // Name follows index
    const { name, nameLen } = readName(view, pos + 1);
    const nameTotalBytes = nameFieldSize(nameLen);

    // Since this is the last section, consume whatever trailing data belongs to
    // this record. We know at minimum there's an index byte + name. Some records
    // may have trailing settings bytes. Be lenient: just capture index + name.
    const recordSize = 1 + nameTotalBytes;

    if (pos + recordSize > view.byteLength) {
      throw new Error(`Analog contact ${i} ("${name}"): record extends past end of file`);
    }

    const _raw = new Uint8Array(buffer.slice(pos, pos + recordSize));

    analogContacts.push({ index, name, _raw });
    pos += recordSize;
  }

  return { analogContacts, bytesConsumed: pos - offset };
}

// --- Main Parser ---------------------------------------------------------

export function parseRdt(buffer: ArrayBuffer): Codeplug {
  const view = new DataView(buffer);

  // --- Header ---
  const header = parseHeader(view);

  // Sanity check: expected payload size
  const expectedPayload = buffer.byteLength - 14;
  if (header.payloadSize !== expectedPayload) {
    // Not fatal — warn but continue
    console.warn(
      `Payload size mismatch: header says ${header.payloadSize}, computed ${expectedPayload}`,
    );
  }

  // --- Settings block ---
  if (CHANNEL_COUNT_OFFSET > buffer.byteLength) {
    throw new Error(
      `File too small for settings block: expected at least ${CHANNEL_COUNT_OFFSET} bytes, got ${buffer.byteLength}`,
    );
  }
  const settingsBlock = new Uint8Array(buffer.slice(HEADER_SIZE, CHANNEL_COUNT_OFFSET));

  // --- Channels ---
  let pos = CHANNEL_COUNT_OFFSET;
  const { channels, bytesConsumed: channelBytes } = parseChannels(view, buffer, pos);
  pos += channelBytes;

  // --- Radio IDs ---
  const { radioIds, bytesConsumed: radioIdBytes } = parseRadioIds(view, buffer, pos);
  pos += radioIdBytes;

  // --- Zones ---
  const { zones, bytesConsumed: zoneBytes } = parseZones(view, buffer, pos);
  pos += zoneBytes;

  // --- Scan Lists ---
  const { scanLists, bytesConsumed: scanListBytes } = parseScanLists(view, buffer, pos);
  pos += scanListBytes;

  // --- Analog Contacts ---
  const { analogContacts, bytesConsumed: analogContactBytes } = parseAnalogContacts(view, buffer, pos);
  pos += analogContactBytes;

  // --- Trailing bytes (anything after the last parsed section) ---
  const _trailingBytes =
    pos < buffer.byteLength
      ? new Uint8Array(buffer.slice(pos))
      : new Uint8Array(0);

  return {
    header,
    settingsBlock,
    channels,
    radioIds,
    zones,
    scanLists,
    analogContacts,
    _trailingBytes,
  };
}
