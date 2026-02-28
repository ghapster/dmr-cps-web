import type {
  Codeplug,
  Channel,
  RadioId,
  Zone,
  ScanList,
  AprsSettings,
  RepeaterMode,
  ChannelMode,
  PowerLevel,
  Bandwidth,
  TimeSlot,
} from './types';

// ---------------------------------------------------------------------------
// Lookup tables — maps friendly enum values back to byte values
// ---------------------------------------------------------------------------

const REPEATER_MODE_BYTE: Record<RepeaterMode, number> = {
  simplex: 0,
  positive: 1,
  negative: 2,
};

const CHANNEL_MODE_BYTE: Record<ChannelMode, number> = {
  analog: 0,
  digital: 1,
};

const POWER_BYTE: Record<PowerLevel, number> = {
  low: 0,
  mid: 1,
  high: 2,
  turbo: 3,
};

const BANDWIDTH_BYTE: Record<Bandwidth, number> = {
  narrow: 0,
  wide: 1,
};

const TIMESLOT_BYTE: Record<TimeSlot, number> = {
  1: 0,
  2: 1,
};

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

/** Write a null-terminated (or full-length) ASCII string into a buffer. */
function writeAscii(
  view: DataView,
  offset: number,
  text: string,
  maxLen: number,
): void {
  for (let i = 0; i < maxLen; i++) {
    view.setUint8(offset + i, i < text.length ? text.charCodeAt(i) : 0);
  }
}

/** Write a uint24 in little-endian byte order. */
function writeUint24LE(view: DataView, offset: number, value: number): void {
  view.setUint8(offset, value & 0xff);
  view.setUint8(offset + 1, (value >> 8) & 0xff);
  view.setUint8(offset + 2, (value >> 16) & 0xff);
}

/** Overwrite a string field in a buffer: writes ASCII text then null-pads remaining bytes. */
function patchString(buf: Uint8Array, offset: number, maxLen: number, text: string): void {
  for (let i = 0; i < maxLen; i++) {
    buf[offset + i] = i < text.length ? text.charCodeAt(i) : 0;
  }
}

const MAX_NAME_LEN = 16;

/** Total bytes consumed by a name field (content + optional null terminator). */
function nameFieldSize(nameLen: number): number {
  return nameLen + (nameLen < MAX_NAME_LEN ? 1 : 0);
}

// ---------------------------------------------------------------------------
// Create default channel
// ---------------------------------------------------------------------------

/**
 * Creates a new default channel. Uses the first existing channel as a template
 * for the _raw buffer structure. If no channels exist, builds from scratch.
 */
export function createDefaultChannel(channels: Channel[]): Channel {
  const newIndex = channels.length > 0
    ? Math.max(...channels.map(ch => ch.index)) + 1
    : 1;

  const newName = 'New Channel';
  const newNameLen = newName.length;
  const newNameFieldSize = nameFieldSize(newNameLen);
  const recordSize = 0x30 + newNameFieldSize + 0x1A;

  let buf: Uint8Array;

  if (channels.length > 0) {
    // Use first channel as template
    const template = channels[0]._raw;
    buf = new Uint8Array(recordSize);
    // Copy header bytes (0x30) from template
    buf.set(template.subarray(0, Math.min(0x30, template.byteLength)), 0);
    // Copy trailing 0x1A bytes from template tail
    const templateTail = template.subarray(template.byteLength - 0x1A);
    buf.set(templateTail, recordSize - 0x1A);
  } else {
    buf = new Uint8Array(recordSize);
  }

  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

  // Index
  view.setUint16(0x00, newIndex, true);

  // RX frequency: 146.52 MHz simplex
  view.setUint32(0x02, Math.round(146.52 * 100000), true);

  // Simplex
  view.setUint8(0x06, 0);

  // TX offset: 0
  view.setUint32(0x07, 0, true);

  // Mode: analog
  view.setUint8(0x0B, 0);

  // Power: high
  view.setUint8(0x0C, 2);

  // Bandwidth: wide
  view.setUint8(0x0D, 1);

  // RX only: false
  view.setUint8(0x0F, 0);

  // Admit criteria: 0
  view.setUint8(0x20, 0);

  // Color code: 1
  view.setUint8(0x28, 1);

  // Time slot: TS1 (byte value 0)
  view.setUint8(0x2A, 0);

  // Write name
  writeAscii(view, 0x30, newName, newNameFieldSize);

  return {
    index: newIndex,
    name: newName,
    rxFrequency: 146.52,
    txFrequency: 146.52,
    repeaterMode: 'simplex',
    txOffset: 0,
    mode: 'analog',
    power: 'high',
    bandwidth: 'wide',
    rxOnly: false,
    admitCriteria: 0,
    colorCode: 1,
    timeSlot: 1,
    _raw: buf,
    _nameLen: newNameLen,
  };
}

// ---------------------------------------------------------------------------
// Section-size calculator
// ---------------------------------------------------------------------------

function computeTotalSize(codeplug: Codeplug): number {
  let size = 0;

  // Header: 23 bytes (5 version + 4 payloadSize + 7 model + 3 reserved + 4 cpsVersion)
  size += 23;

  // Settings block
  size += codeplug.settingsBlock.byteLength;

  // Channel count (uint16) + channel records
  size += 2;
  for (const ch of codeplug.channels) {
    size += ch._raw.byteLength;
  }

  // Radio ID count (1 byte) + radio ID records
  size += 1;
  for (const rid of codeplug.radioIds) {
    size += rid._raw.byteLength;
  }

  // Zone count (1 byte) + zone records (computed dynamically)
  size += 1;
  for (const z of codeplug.zones) {
    const zNameLen = z.name.length;
    const zNameBytes = nameFieldSize(zNameLen);
    size += 1 + 1 + z.channelIndices.length * 2 + 4 + zNameBytes;
  }

  // Scan list count (1 byte) + scan list records (computed dynamically)
  size += 1;
  for (const sl of codeplug.scanLists) {
    const slNameBytes = nameFieldSize(sl._nameLen);
    size += 1 + slNameBytes + 7 + 4 + 1 + sl.channelIndices.length * 3;
  }

  // Analog contact count (1 byte) + analog contact records
  size += 1;
  for (const ac of codeplug.analogContacts) {
    size += ac._raw.byteLength;
  }

  // Digital contacts (entire section blob, patched in place)
  size += codeplug._digitalContactsRaw.byteLength;

  // Text messages (rebuilt from editable data)
  size += codeplug._textMessageHeader.byteLength; // 8-byte header
  size += 1; // count byte
  for (const msg of codeplug.textMessages) {
    size += 1 + msg.text.length + 1; // index + text + null terminator
  }

  // Group lists (rebuilt dynamically)
  size += 3; // header
  for (const gl of codeplug.groupLists) {
    const glNameBytes = nameFieldSize(gl._nameLen);
    size += 8 + glNameBytes + 4 + gl.contactIndices.length * 5;
  }
  size += codeplug._groupListTail.byteLength;

  // APRS settings (entire section blob)
  size += codeplug._aprsRaw.byteLength;

  // Roaming (entire section blob)
  size += codeplug._roamingRaw.byteLength;

  // Trailing bytes
  size += codeplug._trailingBytes.byteLength;

  return size;
}

// ---------------------------------------------------------------------------
// Channel serializer
// ---------------------------------------------------------------------------

function serializeChannel(channel: Channel): Uint8Array {
  // Start with a copy of the raw record
  const buf = new Uint8Array(channel._raw.byteLength);
  buf.set(channel._raw);

  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

  // Index — uint16_le at 0x00
  view.setUint16(0x00, channel.index, true);

  // RX frequency — uint32_le at 0x02, stored as freq * 100000
  view.setUint32(0x02, Math.round(channel.rxFrequency * 100000), true);

  // Repeater mode — 1 byte at 0x06
  view.setUint8(0x06, REPEATER_MODE_BYTE[channel.repeaterMode]);

  // TX offset — uint32_le at 0x07, stored as offset * 100000
  view.setUint32(0x07, Math.round(channel.txOffset * 100000), true);

  // Mode (analog/digital) — 1 byte at 0x0B
  view.setUint8(0x0b, CHANNEL_MODE_BYTE[channel.mode]);

  // Power level — 1 byte at 0x0C
  view.setUint8(0x0c, POWER_BYTE[channel.power]);

  // Bandwidth — 1 byte at 0x0D
  view.setUint8(0x0d, BANDWIDTH_BYTE[channel.bandwidth]);

  // RX only — 1 byte at 0x0F (boolean -> 0/1)
  view.setUint8(0x0f, channel.rxOnly ? 1 : 0);

  // Admit criteria — 1 byte at 0x20
  view.setUint8(0x20, channel.admitCriteria);

  // Color code — 1 byte at 0x28
  view.setUint8(0x28, channel.colorCode);

  // Time slot — 1 byte at 0x2A (TS1=0, TS2=1)
  view.setUint8(0x2a, TIMESLOT_BYTE[channel.timeSlot]);

  // Name — write only into the original name field to avoid overwriting trailing data.
  // Field size = nameLen + 1 (for null terminator) if name < 16, else exactly 16.
  const nameFieldLen = channel._nameLen < 16 ? channel._nameLen + 1 : 16;
  writeAscii(view, 0x30, channel.name, nameFieldLen);

  return buf;
}

// ---------------------------------------------------------------------------
// Radio ID serializer
// ---------------------------------------------------------------------------

function serializeRadioId(radioId: RadioId): Uint8Array {
  const buf = new Uint8Array(radioId._raw.byteLength);
  buf.set(radioId._raw);

  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

  // Index — 1 byte at 0x00
  view.setUint8(0x00, radioId.index);

  // DMR ID — uint24_le at 0x01
  writeUint24LE(view, 0x01, radioId.dmrId);

  // Name — write only into the available name field space.
  // _raw size = 1 (index) + 3 (dmrId) + nameFieldLen, so nameFieldLen = _raw.length - 4
  const nameFieldLen = radioId._raw.byteLength - 4;
  writeAscii(view, 0x04, radioId.name, nameFieldLen);

  return buf;
}

// ---------------------------------------------------------------------------
// Zone serializer
// ---------------------------------------------------------------------------

function serializeZone(zone: Zone): Uint8Array {
  // Compute new record size dynamically (channels may have been added/removed)
  const nameLen = zone.name.length;
  const nameTotalBytes = nameFieldSize(nameLen);
  const recordSize = 1 + 1 + zone.channelIndices.length * 2 + 4 + nameTotalBytes;

  const buf = new Uint8Array(recordSize);
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

  // Index — 1 byte at 0x00
  view.setUint8(0x00, zone.index);

  // Channel count — 1 byte at 0x01
  view.setUint8(0x01, zone.channelIndices.length);

  // Channel indices — uint16_le each, starting at 0x02
  for (let i = 0; i < zone.channelIndices.length; i++) {
    view.setUint16(0x02 + i * 2, zone.channelIndices[i], true);
  }

  // 4 bytes padding after channel list
  const padOffset = 0x02 + zone.channelIndices.length * 2;
  buf.set(zone._padding, padOffset);

  // Zone name — starts after channel indices + 4 bytes padding
  const nameOffset = padOffset + 4;
  writeAscii(view, nameOffset, zone.name, nameTotalBytes);

  return buf;
}

// ---------------------------------------------------------------------------
// APRS settings serializer
// ---------------------------------------------------------------------------

function serializeAprsSettings(aprs: AprsSettings): Uint8Array {
  // Start with a copy of the raw section (preserves config bytes and layout)
  const buf = new Uint8Array(aprs._raw.byteLength);
  buf.set(aprs._raw);

  const offsets = aprs._fieldOffsets;

  // Patch each string field at its known position
  if (offsets.gpsMessage.maxLen > 0) {
    patchString(buf, offsets.gpsMessage.pos, offsets.gpsMessage.maxLen, aprs.gpsMessage);
  }
  if (offsets.destination.maxLen > 0) {
    patchString(buf, offsets.destination.pos, offsets.destination.maxLen, aprs.destination);
  }
  if (offsets.callsign.maxLen > 0) {
    patchString(buf, offsets.callsign.pos, offsets.callsign.maxLen, aprs.callsign);
  }

  // SSID — single byte
  if (offsets.ssid.pos > 0) {
    buf[offsets.ssid.pos] = aprs.ssid & 0x0f;
  }

  // Paths — concatenate back into single string (e.g. "WIDE1-1WIDE2-1")
  if (offsets.paths.maxLen > 0) {
    patchString(buf, offsets.paths.pos, offsets.paths.maxLen, aprs.paths.join(''));
  }

  if (offsets.comment.maxLen > 0) {
    patchString(buf, offsets.comment.pos, offsets.comment.maxLen, aprs.comment);
  }

  return buf;
}

// ---------------------------------------------------------------------------
// Scan list serializer
// ---------------------------------------------------------------------------

function serializeScanList(sl: ScanList): Uint8Array {
  // Compute size dynamically: index(1) + name(var) + settings(7) + timing(4) + count(1) + entries(count×3)
  const nameTotalBytes = nameFieldSize(sl._nameLen);
  const recordSize = 1 + nameTotalBytes + 7 + 4 + 1 + sl.channelIndices.length * 3;

  const buf = new Uint8Array(recordSize);
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let pos = 0;

  // Index
  view.setUint8(pos, sl.index);
  pos += 1;

  // Name
  writeAscii(view, pos, sl.name, nameTotalBytes);
  pos += nameTotalBytes;

  // Settings (7 bytes)
  buf.set(sl._settings, pos);
  pos += 7;

  // Timing (4 bytes)
  buf.set(sl._timing, pos);
  pos += 4;

  // Channel count
  view.setUint8(pos, sl.channelIndices.length);
  pos += 1;

  // Entries: flag(1) + channelIdx(uint16_le) per entry
  for (let i = 0; i < sl.channelIndices.length; i++) {
    view.setUint8(pos, sl.entryFlags[i] ?? 0);
    view.setUint16(pos + 1, sl.channelIndices[i], true);
    pos += 3;
  }

  return buf;
}

// ---------------------------------------------------------------------------
// Group list section rebuilder
// ---------------------------------------------------------------------------

function rebuildGroupListsRaw(codeplug: Codeplug): Uint8Array {
  // Calculate total size
  let totalSize = 3; // header
  for (const gl of codeplug.groupLists) {
    const nameTotalBytes = nameFieldSize(gl._nameLen);
    totalSize += 8 + nameTotalBytes + 4 + gl.contactIndices.length * 5;
  }
  totalSize += codeplug._groupListTail.byteLength;

  const buf = new Uint8Array(totalSize);
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let pos = 0;

  // Header (3 bytes) — patch byte[2] with count
  buf.set(codeplug._groupListHeader, 0);
  view.setUint8(2, codeplug.groupLists.length);
  pos += 3;

  // Each group list record
  for (const gl of codeplug.groupLists) {
    // Settings (8 bytes)
    buf.set(gl._settings, pos);
    pos += 8;

    // Name
    const nameTotalBytes = nameFieldSize(gl._nameLen);
    writeAscii(view, pos, gl.name, nameTotalBytes);
    pos += nameTotalBytes;

    // Entry header (4 bytes) — patch byte[3] with entry count
    buf.set(gl._entryHeader, pos);
    view.setUint8(pos + 3, gl.contactIndices.length);
    pos += 4;

    // Entries (5 bytes each)
    for (let i = 0; i < gl.contactIndices.length; i++) {
      if (i < gl._entryExtras.length) {
        // Existing entry: use preserved extras
        const extras = gl._entryExtras[i];
        view.setUint8(pos, extras[0]);          // byte 0
        view.setUint8(pos + 1, gl.contactIndices[i]); // byte 1 = contact index
        view.setUint8(pos + 2, extras[1]);      // byte 2
        view.setUint8(pos + 3, extras[2]);      // byte 3
        view.setUint8(pos + 4, extras[3]);      // byte 4
      } else {
        // New entry: [position, contactIdx, 0, 0, 0]
        view.setUint8(pos, i);
        view.setUint8(pos + 1, gl.contactIndices[i]);
        view.setUint8(pos + 2, 0);
        view.setUint8(pos + 3, 0);
        view.setUint8(pos + 4, 0);
      }
      pos += 5;
    }
  }

  // Tail bytes
  buf.set(codeplug._groupListTail, pos);
  pos += codeplug._groupListTail.byteLength;

  return buf;
}

// ---------------------------------------------------------------------------
// Main writer
// ---------------------------------------------------------------------------

export function writeRdt(codeplug: Codeplug): ArrayBuffer {
  const totalSize = computeTotalSize(codeplug);
  const output = new ArrayBuffer(totalSize);
  const bytes = new Uint8Array(output);
  const view = new DataView(output);

  let pos = 0;

  // -----------------------------------------------------------------------
  // 1. Header (23 bytes)
  // -----------------------------------------------------------------------

  // Version string — 5 bytes ASCII (e.g. "V1039")
  writeAscii(view, pos, codeplug.header.version, 5);
  pos += 5;

  // Payload size — uint32_le = total_size - 14
  view.setUint32(pos, totalSize - 14, true);
  pos += 4;

  // Model name — null-padded to 7 bytes (e.g. "D578UV\0")
  writeAscii(view, pos, codeplug.header.modelName, 7);
  pos += 7;

  // Reserved — 3 bytes
  bytes.set(codeplug.header.reserved, pos);
  pos += 3;

  // CPS version — 4 bytes ASCII (e.g. "V110")
  writeAscii(view, pos, codeplug.header.cpsVersion, 4);
  pos += 4;

  // -----------------------------------------------------------------------
  // 2. Settings block (verbatim copy)
  // -----------------------------------------------------------------------
  bytes.set(codeplug.settingsBlock, pos);
  pos += codeplug.settingsBlock.byteLength;

  // -----------------------------------------------------------------------
  // 3. Channels
  // -----------------------------------------------------------------------
  view.setUint16(pos, codeplug.channels.length, true);
  pos += 2;

  for (const ch of codeplug.channels) {
    const record = serializeChannel(ch);
    bytes.set(record, pos);
    pos += record.byteLength;
  }

  // -----------------------------------------------------------------------
  // 4. Radio IDs
  // -----------------------------------------------------------------------
  view.setUint8(pos, codeplug.radioIds.length);
  pos += 1;

  for (const rid of codeplug.radioIds) {
    const record = serializeRadioId(rid);
    bytes.set(record, pos);
    pos += record.byteLength;
  }

  // -----------------------------------------------------------------------
  // 5. Zones
  // -----------------------------------------------------------------------
  view.setUint8(pos, codeplug.zones.length);
  pos += 1;

  for (const z of codeplug.zones) {
    const record = serializeZone(z);
    bytes.set(record, pos);
    pos += record.byteLength;
  }

  // -----------------------------------------------------------------------
  // 6. Scan Lists (serialized dynamically)
  // -----------------------------------------------------------------------
  view.setUint8(pos, codeplug.scanLists.length);
  pos += 1;

  for (const sl of codeplug.scanLists) {
    const record = serializeScanList(sl);
    bytes.set(record, pos);
    pos += record.byteLength;
  }

  // -----------------------------------------------------------------------
  // 7. Analog Contacts (copy _raw verbatim)
  // -----------------------------------------------------------------------
  view.setUint8(pos, codeplug.analogContacts.length);
  pos += 1;

  for (const ac of codeplug.analogContacts) {
    bytes.set(ac._raw, pos);
    pos += ac._raw.byteLength;
  }

  // -----------------------------------------------------------------------
  // 8. Digital Contacts (copy blob, patch editable fields in place)
  // -----------------------------------------------------------------------
  bytes.set(codeplug._digitalContactsRaw, pos);
  for (const dc of codeplug.digitalContacts) {
    const recPos = pos + dc._blobOffset;
    // DMR ID — uint24_le at bytes 0-2 of record
    view.setUint8(recPos, dc.dmrId & 0xff);
    view.setUint8(recPos + 1, (dc.dmrId >> 8) & 0xff);
    view.setUint8(recPos + 2, (dc.dmrId >> 16) & 0xff);
    // Call type — byte 5 (0x10 = group, 0x00 = private)
    view.setUint8(recPos + 5, dc.callType === 'group' ? 0x10 : 0x00);
  }
  pos += codeplug._digitalContactsRaw.byteLength;

  // -----------------------------------------------------------------------
  // 9. Text Messages (rebuilt from editable data)
  // -----------------------------------------------------------------------
  bytes.set(codeplug._textMessageHeader, pos);
  pos += codeplug._textMessageHeader.byteLength;

  view.setUint8(pos, codeplug.textMessages.length);
  pos += 1;

  for (const msg of codeplug.textMessages) {
    view.setUint8(pos, msg.index);
    pos += 1;
    for (let i = 0; i < msg.text.length; i++) {
      view.setUint8(pos, msg.text.charCodeAt(i));
      pos += 1;
    }
    view.setUint8(pos, 0); // null terminator
    pos += 1;
  }

  // -----------------------------------------------------------------------
  // 10. Group Lists (rebuilt dynamically)
  // -----------------------------------------------------------------------
  {
    const glData = rebuildGroupListsRaw(codeplug);
    bytes.set(glData, pos);
    pos += glData.byteLength;
  }

  // -----------------------------------------------------------------------
  // 11. APRS Settings (rebuilt from patched editable data)
  // -----------------------------------------------------------------------
  {
    const aprsData = serializeAprsSettings(codeplug.aprsSettings);
    bytes.set(aprsData, pos);
    pos += aprsData.byteLength;
  }

  // -----------------------------------------------------------------------
  // 12. Roaming (copy entire section blob verbatim)
  // -----------------------------------------------------------------------
  bytes.set(codeplug._roamingRaw, pos);
  pos += codeplug._roamingRaw.byteLength;

  // -----------------------------------------------------------------------
  // 13. Trailing bytes
  // -----------------------------------------------------------------------
  bytes.set(codeplug._trailingBytes, pos);
  pos += codeplug._trailingBytes.byteLength;

  // Sanity check — pos should equal totalSize
  if (pos !== totalSize) {
    console.warn(
      `[rdt-writer] Size mismatch: wrote ${pos} bytes but expected ${totalSize}`,
    );
  }

  return output;
}

// ---------------------------------------------------------------------------
// Download helper
// ---------------------------------------------------------------------------

/**
 * Triggers a browser download of the given ArrayBuffer as a file.
 */
export function downloadBlob(data: ArrayBuffer, filename: string): void {
  const blob = new Blob([data], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';

  document.body.appendChild(anchor);
  anchor.click();

  // Clean up
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
