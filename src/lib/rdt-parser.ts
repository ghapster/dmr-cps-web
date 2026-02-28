import type {
  FileHeader,
  Channel,
  RadioId,
  Zone,
  ScanList,
  AnalogContact,
  DigitalContact,
  TextMessage,
  GroupList,
  AprsSettings,
  RoamingChannel,
  RoamingZone,
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

    // 7 bytes of settings after name
    const settingsOffset = pos + 1 + nameTotalBytes;
    if (settingsOffset + 7 > view.byteLength) {
      throw new Error(`Scan list ${i} ("${name}"): settings extend past end of file`);
    }
    const _settings = new Uint8Array(buffer.slice(settingsOffset, settingsOffset + 7));

    // 4 bytes of timing after settings
    const timingOffset = settingsOffset + 7;
    if (timingOffset + 4 > view.byteLength) {
      throw new Error(`Scan list ${i} ("${name}"): timing extends past end of file`);
    }
    const _timing = new Uint8Array(buffer.slice(timingOffset, timingOffset + 4));

    // 1 byte channel count after timing
    const channelCount = view.getUint8(timingOffset + 4);

    // Channel entries: 3 bytes each (flag + uint16_le channel index)
    const entriesOffset = timingOffset + 5;
    const entriesSize = channelCount * 3;

    if (entriesOffset + entriesSize > view.byteLength) {
      throw new Error(`Scan list ${i} ("${name}"): channel entries extend past end of file`);
    }

    const channelIndices: number[] = [];
    const entryFlags: number[] = [];
    for (let c = 0; c < channelCount; c++) {
      const flag = view.getUint8(entriesOffset + c * 3);
      const chIdx = view.getUint16(entriesOffset + c * 3 + 1, true);
      entryFlags.push(flag);
      channelIndices.push(chIdx);
    }

    const recordSize = 1 + nameTotalBytes + 7 + 4 + 1 + entriesSize;
    const _raw = new Uint8Array(buffer.slice(pos, pos + recordSize));

    scanLists.push({ index, name, channelIndices, entryFlags, _settings, _timing, _raw, _nameLen: nameLen });
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
    throw new Error(`Cannot read DTMF contact count at offset ${offset}: past end of file`);
  }

  const count = view.getUint8(offset);
  let pos = offset + 1;
  const analogContacts: AnalogContact[] = [];

  for (let i = 0; i < count; i++) {
    if (pos + 2 > view.byteLength) {
      throw new Error(`DTMF contact ${i}: extends past end of file at offset ${pos}`);
    }

    // Format: index(1) + codeLen(1) + code(codeLen) + name(var+null)
    const index = view.getUint8(pos);
    const codeLen = view.getUint8(pos + 1);

    if (pos + 2 + codeLen > view.byteLength) {
      throw new Error(`DTMF contact ${i}: code extends past end of file`);
    }

    // Read DTMF code
    const codeBytes: number[] = [];
    for (let j = 0; j < codeLen; j++) {
      codeBytes.push(view.getUint8(pos + 2 + j));
    }
    const code = String.fromCharCode(...codeBytes);

    // Read name after code
    const { name, nameLen } = readName(view, pos + 2 + codeLen);
    const nameTotalBytes = nameFieldSize(nameLen);

    const recordSize = 1 + 1 + codeLen + nameTotalBytes;

    if (pos + recordSize > view.byteLength) {
      throw new Error(`DTMF contact ${i} ("${name}"): record extends past end of file`);
    }

    const _raw = new Uint8Array(buffer.slice(pos, pos + recordSize));

    analogContacts.push({ index, name, code, _raw });
    pos += recordSize;
  }

  return { analogContacts, bytesConsumed: pos - offset };
}

// --- New Section Parsers -------------------------------------------------

/**
 * Search for an ASCII string in the buffer starting from `start`.
 * Returns the byte offset of the first match, or -1 if not found.
 */
function findString(buffer: ArrayBuffer, start: number, needle: string): number {
  const bytes = new Uint8Array(buffer);
  outer:
  for (let i = start; i <= bytes.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (bytes[i + j] !== needle.charCodeAt(j)) continue outer;
    }
    return i;
  }
  return -1;
}

/**
 * Read a null-terminated ASCII string of arbitrary length.
 */
function readNullTermString(view: DataView, offset: number, maxLen: number = 256): { text: string; bytesConsumed: number } {
  const bytes: number[] = [];
  for (let i = 0; i < maxLen; i++) {
    if (offset + i >= view.byteLength) break;
    const b = view.getUint8(offset + i);
    if (b === 0) return { text: String.fromCharCode(...bytes), bytesConsumed: bytes.length + 1 };
    bytes.push(b);
  }
  return { text: String.fromCharCode(...bytes), bytesConsumed: bytes.length };
}

function parseDigitalContacts(
  view: DataView,
  buffer: ArrayBuffer,
  offset: number,
): { digitalContacts: DigitalContact[]; _digitalContactsRaw: Uint8Array; bytesConsumed: number } {
  // Section format: uint16_le size field, then `size` bytes of contact data
  const sizeField = view.getUint16(offset, true);
  const totalBytes = 2 + sizeField;
  const _digitalContactsRaw = new Uint8Array(buffer.slice(offset, offset + totalBytes));

  // Scan within the data blob for contact records
  // Record format: dmrId(3, uint24_le) + index(1) + 0x00 + callType(1: 0x10=group, 0x00=private) + encoded_data
  const digitalContacts: DigitalContact[] = [];
  const dataStart = offset + 2;
  const dataEnd = offset + totalBytes;

  // Find records by scanning for sequential index patterns: idx 00 (10|00)
  // Build positions list for record boundaries
  const positions: number[] = [];
  let nextExpectedIdx = 1;
  for (let i = dataStart + 3; i < dataEnd - 2; i++) {
    const b = view.getUint8(i);
    if (b === nextExpectedIdx && view.getUint8(i + 1) === 0x00 &&
        (view.getUint8(i + 2) === 0x10 || view.getUint8(i + 2) === 0x00)) {
      positions.push(i - 3); // record starts 3 bytes before index (at the dmrId)
      nextExpectedIdx++;
    }
  }

  // Parse each record
  for (let c = 0; c < positions.length; c++) {
    const recStart = positions[c];
    const recEnd = c + 1 < positions.length ? positions[c + 1] : dataEnd;

    // DMR TG/ID from first 3 bytes (uint24_le)
    const dmrId = readUint24LE(view, recStart);
    const index = view.getUint8(recStart + 3);
    const callTypeByte = view.getUint8(recStart + 5);
    const callType = callTypeByte === 0x10 ? 'group' as const : 'private' as const;
    const _raw = new Uint8Array(buffer.slice(recStart, recEnd));

    const _blobOffset = recStart - offset; // offset relative to _digitalContactsRaw start
    digitalContacts.push({ index, dmrId, callType, _raw, _blobOffset });
  }

  return { digitalContacts, _digitalContactsRaw, bytesConsumed: totalBytes };
}

function parseTextMessages(
  view: DataView,
  buffer: ArrayBuffer,
  offset: number,
): { textMessages: TextMessage[]; _textMessageHeader: Uint8Array; bytesConsumed: number } {
  // 8-byte header (preserve verbatim)
  const _textMessageHeader = new Uint8Array(buffer.slice(offset, offset + 8));
  let pos = offset + 8;

  // Count byte
  const count = view.getUint8(pos);
  pos += 1;

  const textMessages: TextMessage[] = [];

  for (let i = 0; i < count; i++) {
    const index = view.getUint8(pos);
    pos += 1;

    // Read null-terminated text
    const { text, bytesConsumed: textBytes } = readNullTermString(view, pos);
    pos += textBytes;

    textMessages.push({ index, text });
  }

  return { textMessages, _textMessageHeader, bytesConsumed: pos - offset };
}

function parseGroupLists(
  view: DataView,
  buffer: ArrayBuffer,
  offset: number,
  fileSize: number,
): { groupLists: GroupList[]; _groupListsRaw: Uint8Array; bytesConsumed: number } {
  const sectionStart = offset;

  // Determine where this section ends by finding the APRS marker
  let sectionEnd: number;
  const aprsPos = findString(buffer, offset, 'My current GPS');
  if (aprsPos > 0) {
    sectionEnd = aprsPos;
  } else {
    // Fallback: consume only the structured part (no gap)
    sectionEnd = fileSize;
  }

  // Parse structured group list data within the section
  let pos = offset;

  // 3-byte header: byte[2] appears to be group list count
  const count = view.getUint8(pos + 2);
  pos += 3;

  const groupLists: GroupList[] = [];

  for (let i = 0; i < count; i++) {
    const recordStart = pos;

    // 4+4 = 8 bytes of settings
    pos += 8;

    // Name (null-terminated, max 16)
    const { name, nameLen } = readName(view, pos);
    pos += nameFieldSize(nameLen);

    // 4-byte entry header: last byte is entry count
    const entryCount = view.getUint8(pos + 3);
    pos += 4;

    // Entries: entryCount × 5 bytes each
    const contactIndices: number[] = [];
    for (let j = 0; j < entryCount; j++) {
      // Each 5-byte entry: position(1) + contactIdx(1) + extra(3)
      // The second byte appears to be the digital contact index
      const contactIdx = view.getUint8(pos + 1);
      contactIndices.push(contactIdx);
      pos += 5;
    }

    const _raw = new Uint8Array(buffer.slice(recordStart, pos));
    groupLists.push({ index: i, name, contactIndices, _raw });
  }

  // The full section raw includes everything up to APRS (including post-entries config gap)
  const bytesConsumed = sectionEnd - sectionStart;
  const _groupListsRaw = new Uint8Array(buffer.slice(sectionStart, sectionEnd));

  return { groupLists, _groupListsRaw, bytesConsumed };
}

function parseAprsSettings(
  view: DataView,
  buffer: ArrayBuffer,
  offset: number,
  fileSize: number,
): { aprsSettings: AprsSettings; _aprsRaw: Uint8Array; bytesConsumed: number } {
  const sectionStart = offset;

  // Determine section end by finding the first "Roaming CH" marker
  let sectionEnd: number;
  const roamPos = findString(buffer, offset + 10, 'Roaming CH');
  if (roamPos > 0) {
    sectionEnd = roamPos;
  } else {
    // Fallback: APRS section is typically 114 bytes for D578UV
    sectionEnd = Math.min(offset + 114, fileSize);
  }

  const bytesConsumed = sectionEnd - sectionStart;
  const _aprsRaw = new Uint8Array(buffer.slice(sectionStart, sectionEnd));

  // Extract fields from the APRS blob using known D578UV layout:
  // GPS message (null-term) + config bytes + destination (null-term) +
  // callsign (6 bytes) + SSID (1 byte) + paths (null-term, concatenated) + comment (null-term) + config tail
  let pos = offset;

  // GPS message (null-terminated, up to 128 bytes)
  const gpsMsg = readNullTermString(view, pos, 128);
  const gpsMessage = gpsMsg.text;
  pos += gpsMsg.bytesConsumed;

  // Scan remaining bytes for null-terminated ASCII string fields
  // Find all printable string runs separated by non-printable bytes
  const stringEntries: { text: string; startPos: number }[] = [];
  let currentStr = '';
  let strStart = pos;
  for (let i = pos; i < sectionEnd; i++) {
    const b = view.getUint8(i);
    if (b >= 0x20 && b < 0x7f) {
      if (currentStr.length === 0) strStart = i;
      currentStr += String.fromCharCode(b);
    } else {
      if (currentStr.length >= 3) {
        stringEntries.push({ text: currentStr, startPos: strStart });
      }
      currentStr = '';
    }
  }
  if (currentStr.length >= 3) {
    stringEntries.push({ text: currentStr, startPos: strStart });
  }

  // Assign strings: destination, callsign, paths (concatenated), comment
  const destination = stringEntries.length > 0 ? stringEntries[0].text : '';
  const callsign = stringEntries.length > 1 ? stringEntries[1].text : '';

  // SSID byte sits right after callsign (before paths)
  let ssid = 0;
  if (stringEntries.length > 1) {
    const afterCallsign = stringEntries[1].startPos + stringEntries[1].text.length;
    if (afterCallsign < sectionEnd) {
      ssid = view.getUint8(afterCallsign);
    }
  }

  // Paths are concatenated (e.g. "WIDE1-1WIDE2-1") — split at digit→uppercase boundaries
  const rawPathStr = stringEntries.length > 2 ? stringEntries[2].text : '';
  const paths: string[] = [];
  if (rawPathStr) {
    let current = '';
    for (let i = 0; i < rawPathStr.length; i++) {
      current += rawPathStr[i];
      // Split when a digit is followed by an uppercase letter (next path segment)
      if (i + 1 < rawPathStr.length &&
          rawPathStr[i] >= '0' && rawPathStr[i] <= '9' &&
          rawPathStr[i + 1] >= 'A' && rawPathStr[i + 1] <= 'Z') {
        paths.push(current);
        current = '';
      }
    }
    if (current) paths.push(current);
  }

  const comment = stringEntries.length > 3 ? stringEntries[3].text : '';

  // Compute field offsets relative to sectionStart for the writer to patch
  const _fieldOffsets: AprsSettings['_fieldOffsets'] = {
    gpsMessage: { pos: 0, maxLen: gpsMessage.length },
    destination: {
      pos: stringEntries.length > 0 ? stringEntries[0].startPos - sectionStart : 0,
      maxLen: stringEntries.length > 0 ? stringEntries[0].text.length : 0,
    },
    callsign: {
      pos: stringEntries.length > 1 ? stringEntries[1].startPos - sectionStart : 0,
      maxLen: stringEntries.length > 1 ? stringEntries[1].text.length : 0,
    },
    ssid: {
      pos: stringEntries.length > 1
        ? (stringEntries[1].startPos + stringEntries[1].text.length) - sectionStart
        : 0,
    },
    paths: {
      pos: stringEntries.length > 2 ? stringEntries[2].startPos - sectionStart : 0,
      maxLen: stringEntries.length > 2 ? stringEntries[2].text.length : 0,
    },
    comment: {
      pos: stringEntries.length > 3 ? stringEntries[3].startPos - sectionStart : 0,
      maxLen: stringEntries.length > 3 ? stringEntries[3].text.length : 0,
    },
  };

  const aprsSettings: AprsSettings = {
    gpsMessage,
    callsign,
    ssid,
    destination,
    paths,
    comment,
    _raw: _aprsRaw,
    _fieldOffsets,
  };

  return { aprsSettings, _aprsRaw, bytesConsumed };
}

function parseRoaming(
  view: DataView,
  buffer: ArrayBuffer,
  offset: number,
  fileSize: number,
): { roamingChannels: RoamingChannel[]; roamingZones: RoamingZone[]; _roamingRaw: Uint8Array; bytesConsumed: number } {
  const sectionStart = offset;
  let pos = offset;

  // Parse roaming channels: each starts with a null-terminated name
  const roamingChannels: RoamingChannel[] = [];

  // Find all "Roaming CH" names to determine channel count and positions
  const channelPositions: number[] = [];
  let searchPos = offset;
  while (true) {
    const found = findString(buffer, searchPos, 'Roaming CH');
    if (found < 0 || found >= fileSize) break;
    channelPositions.push(found);
    searchPos = found + 10; // skip past "Roaming CH"
  }

  // Find the roaming zone start
  const zoneStart = findString(buffer, offset, 'ROAM ZONE');

  // Parse each roaming channel
  for (let i = 0; i < channelPositions.length; i++) {
    const chStart = channelPositions[i];
    const chEnd = i + 1 < channelPositions.length ? channelPositions[i + 1] :
                  (zoneStart >= 0 ? zoneStart : fileSize);

    const { text: name } = readNullTermString(view, chStart);
    const _raw = new Uint8Array(buffer.slice(chStart, chEnd));

    roamingChannels.push({ index: i + 1, name, _raw });
    pos = chEnd;
  }

  // Parse roaming zone(s)
  const roamingZones: RoamingZone[] = [];

  if (zoneStart >= 0) {
    pos = zoneStart;
    const { text: zoneName, bytesConsumed: nameBytes } = readNullTermString(view, pos);
    pos += nameBytes;

    // After name: channel count(1) + padding(1) + channel refs
    const channelCount = view.getUint8(pos);
    pos += 1;
    pos += 1; // padding byte

    const channelIndices: number[] = [];
    for (let j = 0; j < channelCount; j++) {
      channelIndices.push(view.getUint8(pos));
      pos += 1;
    }

    // Consume remaining zone config bytes until we hit a run of zeros (>=16)
    // or reach the file end
    let zoneEnd = pos;
    let zeroCount = 0;
    for (let i = pos; i < fileSize; i++) {
      if (view.getUint8(i) === 0) {
        zeroCount++;
        if (zeroCount >= 16) {
          zoneEnd = i - zeroCount + 1;
          break;
        }
      } else {
        zeroCount = 0;
        zoneEnd = i + 1;
      }
    }

    const _raw = new Uint8Array(buffer.slice(zoneStart, zoneEnd));
    roamingZones.push({ index: 0, name: zoneName, channelIndices, _raw });
    pos = zoneEnd;
  }

  const bytesConsumed = pos - sectionStart;
  const _roamingRaw = new Uint8Array(buffer.slice(sectionStart, pos));

  return { roamingChannels, roamingZones, _roamingRaw, bytesConsumed };
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

  // --- Digital Contacts ---
  const { digitalContacts, _digitalContactsRaw, bytesConsumed: digitalContactBytes } =
    parseDigitalContacts(view, buffer, pos);
  pos += digitalContactBytes;

  // --- Text Messages ---
  const { textMessages, _textMessageHeader, bytesConsumed: textMessageBytes } =
    parseTextMessages(view, buffer, pos);
  pos += textMessageBytes;

  // --- Group Lists ---
  const { groupLists, _groupListsRaw, bytesConsumed: groupListBytes } =
    parseGroupLists(view, buffer, pos, buffer.byteLength);
  pos += groupListBytes;

  // --- APRS Settings ---
  const { aprsSettings, _aprsRaw, bytesConsumed: aprsBytes } =
    parseAprsSettings(view, buffer, pos, buffer.byteLength);
  pos += aprsBytes;

  // --- Roaming ---
  const { roamingChannels, roamingZones, _roamingRaw, bytesConsumed: roamingBytes } =
    parseRoaming(view, buffer, pos, buffer.byteLength);
  pos += roamingBytes;

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
    digitalContacts,
    _digitalContactsRaw,
    textMessages,
    _textMessageHeader,
    groupLists,
    _groupListsRaw,
    aprsSettings,
    _aprsRaw,
    roamingChannels,
    roamingZones,
    _roamingRaw,
    _trailingBytes,
  };
}
