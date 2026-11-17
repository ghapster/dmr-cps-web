/**
 * Full-codeplug writer for the AnyTone D578UV.
 *
 * WHY THIS EXISTS
 * The D578UV does not accept partial updates. When a programming session writes
 * into a table (contacts, channels, ...), the radio discards that table's old
 * contents and keeps only what was written in the same session; it then fixes
 * up dependent data on END. A single 16-byte contact write therefore erased all
 * other contacts and damaged channels/zones (verified on a real radio,
 * 2026-11-17). The radio also ignores writes that are not 16-byte aligned.
 *
 * So, like qdmr and the AnyTone CPS, every write session rewrites *every*
 * table completely, in one session, in address order:
 *   - the same set of memory elements qdmr 0.13.3 writes for a D578UV upload
 *     (channels + extensions, zones, scan lists, radio IDs, group lists,
 *     contacts + contact index + contact-ID lookup table, messages + message
 *     index, roaming, all bitmaps, and the settings/keys/tone sections),
 *   - each element filled from the radio's current memory, with the user's
 *     edits overlaid (bytes the app does not model are preserved),
 *   - derived lookup tables regenerated from the edited codeplug.
 *
 * buildFullWritePlan() is pure apart from the `read` callback, so it can be
 * tested against an emulated radio (see ~/radio-tools/emu) before touching
 * hardware.
 */
import type { Codeplug } from './types';
import { readRegion, writeRegion } from './radio-protocol';
import type { RadioConnection } from './radio-protocol';
import { readRadioCodeplug, serializeToRadioMemory } from './radio-codeplug';
import type { ReadProgress, WriteRegion } from './radio-codeplug';

const BLOCK = 16;

// --- Memory map (qdmr 0.13.3, D578UV) ---------------------------------------
const CHANNEL_BANKS = 0x00800000, CHANNEL_BANK_SPACING = 0x40000, CHANNELS_PER_BANK = 128;
const CHANNEL_SIZE = 0x40, CHANNEL_EXT_OFFSET = 0x2000;
const ZONE_CHANNELS = 0x01000000, ZONE_CHANNELS_SIZE = 0x200;
const ZONE_NAMES = 0x02540000, ZONE_NAME_SIZE = 0x20;
const SCAN_LISTS = 0x01080000, SCAN_LIST_BANK_SPACING = 0x40000, SCAN_LISTS_PER_BANK = 16;
const SCAN_LIST_SPACING = 0x200, SCAN_LIST_SIZE = 0x90;
const RADIO_IDS = 0x02580000, RADIO_ID_SIZE = 0x20;
const GROUP_LISTS = 0x02980000, GROUP_LIST_SPACING = 0x200, GROUP_LIST_SIZE = 0x120;
const CONTACT_BANKS = 0x02680000, CONTACT_BANK_SPACING = 0x40000, CONTACTS_PER_BANK = 1000;
const CONTACT_BLOCK = 0x190; // qdmr allocates 0x190 bytes per contact index
const CONTACT_SIZE = 100;
const CONTACT_INDEX = 0x02600000;
const CONTACT_ID_TABLE = 0x04800000;
const MESSAGE_INDEX = 0x01640000, MESSAGE_INDEX_SIZE = 0x10;
const MESSAGE_BANKS = 0x02140000, MESSAGE_BANK_SPACING = 0x40000, MESSAGES_PER_BANK = 8;
const MESSAGE_BANK_SIZE = 0x800;
const ROAMING_CHANNELS = 0x01040000, ROAMING_CHANNEL_SIZE = 0x20;
const ROAMING_ZONES = 0x01043000, ROAMING_ZONE_SIZE = 0x80;
const DTMF_BYTEMAP = 0x02900100, DTMF_CONTACTS = 0x02940000, DTMF_PAIR_SIZE = 0x30, NUM_DTMF = 128;
const AIRBAND_BITMAP = 0x02BC1020, AIRBAND_CHANNELS = 0x02BC0000, AIRBAND_SIZE = 0x20;
const AIRBAND_VFO = 0x02BC1000, NUM_AIRBAND = 100;
const GENERAL_SETTINGS = 0x02500000;

/** Sections qdmr always writes back (read from the radio, mostly untouched). */
const FIXED_ELEMENTS: [number, number][] = [
  [0x00FC0800, 0x80], [0x00FC2800, 0x80],            // VFO A/B + extensions
  [0x01042000, 0x20], [0x01042080, 0x10],            // roaming channel / zone bitmaps
  [0x01640800, 0x90],                                // message bytemap
  [0x02480000, 0x230],                               // FM broadcast channels, VFO, bitmap
  [0x024C0000, 0xC90], [0x024C0D00, 0x200],          // 5-tone IDs + bitmap, 5-tone functions
  [0x024C1000, 0xD0], [0x024C1100, 0x1A0],           // 5-tone/DTMF settings, 2-tone
  [0x024C1300, 0x80],                                // zone, radio-ID, scan-list, hidden-zone bitmaps
  [0x024C1400, 0x20], [0x024C1440, 0x30],            // alarm settings
  [0x024C1500, 0x240],                               // channel bitmap
  [0x024C1800, 0x500],                               // enhanced encryption keys
  [0x024C2000, 0x3F0], [0x024C2400, 0x210],          // offset frequencies, 2-tone functions
  [0x024C4000, 0x3FC0], [0x024C8000, 0x20],          // AES keys + bitmap
  [0x02500000, 0xF0], [0x02500100, 0x530],           // general settings, zone channels/DTMF IDs/boot
  [0x02501000, 0x100], [0x02501200, 0x40],           // APRS settings, analog APRS message
  [0x02501280, 0x30], [0x02501400, 0x200],           // GPS messages, settings extension
  [0x02501800, 0x100], [0x02502000, 0x80],           // APRS RX list, FM APRS frequency names
  [0x025C0500, 0x970],                               // hot keys, status/group-list bitmaps, keys
  [0x025C1C00, 0x20],                                // ARC4 key bitmap
  [0x02640000, 0x500],                               // contact bitmap
  [0x02900000, 0x80], [0x02900100, 0x100],           // DTMF contact index + bytemap
];

const align = (n: number) => Math.ceil(n / BLOCK) * BLOCK;

/** Sparse memory image in 16-byte blocks. */
class Image {
  readonly blocks = new Map<number, Uint8Array>();
  /** Mark [addr, addr+len) as part of the write set. */
  allocate(addr: number, len: number) {
    for (let a = addr - (addr % BLOCK); a < addr + len; a += BLOCK)
      if (!this.blocks.has(a)) this.blocks.set(a, new Uint8Array(BLOCK).fill(0xff));
  }
  set(addr: number, value: number) {
    const b = this.blocks.get(addr - (addr % BLOCK));
    if (!b) throw new Error(`write plan bug: 0x${addr.toString(16)} is not allocated`);
    b[addr % BLOCK] = value;
  }
  setBytes(addr: number, data: Uint8Array) { data.forEach((v, i) => this.set(addr + i, v)); }
  sortedRuns(): { address: number; length: number }[] {
    const runs: { address: number; length: number }[] = [];
    for (const a of [...this.blocks.keys()].sort((x, y) => x - y)) {
      const last = runs[runs.length - 1];
      if (last && last.address + last.length === a) last.length += BLOCK;
      else runs.push({ address: a, length: BLOCK });
    }
    return runs;
  }
  toWrites(): WriteRegion[] {
    return this.sortedRuns().map(r => {
      const data = new Uint8Array(r.length);
      for (let o = 0; o < r.length; o += BLOCK) data.set(this.blocks.get(r.address + o)!, o);
      return { address: r.address, data };
    });
  }
}

const channelAddr = (slot: number) =>
  CHANNEL_BANKS + Math.floor(slot / CHANNELS_PER_BANK) * CHANNEL_BANK_SPACING + (slot % CHANNELS_PER_BANK) * CHANNEL_SIZE;
const scanListAddr = (slot: number) =>
  SCAN_LISTS + Math.floor(slot / SCAN_LISTS_PER_BANK) * SCAN_LIST_BANK_SPACING + (slot % SCAN_LISTS_PER_BANK) * SCAN_LIST_SPACING;

/** DMR ID as 8 BCD digits, little-endian, as a uint32 (qdmr encode_dmr_id_bcd_le). */
function bcdLe(id: number): number {
  const s = id.toString().padStart(8, '0');
  let v = 0;
  for (let i = 0; i < 4; i++) {
    const byte = (parseInt(s[6 - 2 * i], 10) << 4) | parseInt(s[7 - 2 * i], 10);
    v |= byte << (8 * i);
  }
  return v >>> 0;
}
const u32le = (buf: Uint8Array, off: number, v: number) => {
  buf[off] = v & 0xff; buf[off + 1] = (v >>> 8) & 0xff; buf[off + 2] = (v >>> 16) & 0xff; buf[off + 3] = (v >>> 24) & 0xff;
};

/**
 * Prepare the codeplug for a full write: messages are renumbered 0..n-1
 * (nothing references them), contacts must already be contiguous because
 * channels and group lists refer to them by slot.
 */
function normalize(cp: Codeplug): Codeplug {
  const contacts = [...cp.digitalContacts].sort((a, b) => a.index - b.index);
  contacts.forEach((c, i) => {
    if (c.index !== i + 1)
      throw new Error(`Digital contacts must be numbered 1..${contacts.length} without gaps ` +
        `(found #${c.index} at position ${i + 1}). Not writing.`);
  });
  const textMessages = [...cp.textMessages].sort((a, b) => a.index - b.index).map((m, i) => ({ ...m, index: i }));
  // Zones and scan lists must not reference channels that do not exist.
  const channelIds = new Set(cp.channels.map(c => c.index));
  const zones = cp.zones.map(z => z.channelIndices.every(i => channelIds.has(i)) ? z
    : { ...z, channelIndices: z.channelIndices.filter(i => channelIds.has(i)) });
  const scanLists = cp.scanLists.map(sl => {
    if (sl.channelIndices.every(i => channelIds.has(i))) return sl;
    const keep = sl.channelIndices.map(i => channelIds.has(i));
    return { ...sl, channelIndices: sl.channelIndices.filter((_, p) => keep[p]), entryFlags: sl.entryFlags.filter((_, p) => keep[p]) };
  });
  return { ...cp, digitalContacts: contacts, textMessages, zones, scanLists };
}

/**
 * Build the complete write plan.
 * @param edit   codeplug to write
 * @param base   codeplug as read from the radio in this session
 * @param read   reads radio memory (aligned address, length multiple of 16)
 */
export async function buildFullWritePlan(
  editIn: Codeplug,
  base: Codeplug,
  read: (address: number, length: number) => Promise<Uint8Array>,
  onProgress?: (done: number, total: number) => void,
): Promise<WriteRegion[]> {
  const edit = normalize(editIn);
  const img = new Image();

  // ---- 1. Allocate the write set (same elements as a qdmr upload) ----------
  for (const [a, n] of FIXED_ELEMENTS) img.allocate(a, n);

  for (const ch of edit.channels) {
    const slot = ch.index - 1;
    img.allocate(channelAddr(slot), CHANNEL_SIZE);
    img.allocate(channelAddr(slot) + CHANNEL_EXT_OFFSET, CHANNEL_SIZE);
  }
  // Editor indices: channels, zones, scan lists, radio IDs, contacts and roaming
  // channels are 1-based; group lists, messages and roaming zones are 0-based.
  for (const z of edit.zones) {
    img.allocate(ZONE_CHANNELS + (z.index - 1) * ZONE_CHANNELS_SIZE, ZONE_CHANNELS_SIZE);
    img.allocate(ZONE_NAMES + (z.index - 1) * ZONE_NAME_SIZE, ZONE_NAME_SIZE);
  }
  for (const s of edit.scanLists) img.allocate(scanListAddr(s.index - 1), SCAN_LIST_SIZE);
  for (const r of edit.radioIds) img.allocate(RADIO_IDS + (r.index - 1) * RADIO_ID_SIZE, RADIO_ID_SIZE);
  for (const g of edit.groupLists) img.allocate(GROUP_LISTS + g.index * GROUP_LIST_SPACING, GROUP_LIST_SIZE);

  const nContacts = edit.digitalContacts.length;
  for (let bank = 0; bank * CONTACTS_PER_BANK < nContacts; bank++) {
    const inBank = Math.min(CONTACTS_PER_BANK, nContacts - bank * CONTACTS_PER_BANK);
    img.allocate(CONTACT_BANKS + bank * CONTACT_BANK_SPACING, Math.min(inBank * CONTACT_BLOCK, CONTACT_BANK_SPACING));
  }
  if (nContacts) {
    img.allocate(CONTACT_INDEX, align(4 * nContacts));
    img.allocate(CONTACT_ID_TABLE, align(8 * (nContacts + 1)));
  }

  const nMessages = edit.textMessages.length;
  for (let bank = 0; bank * MESSAGES_PER_BANK < nMessages; bank++)
    img.allocate(MESSAGE_BANKS + bank * MESSAGE_BANK_SPACING, MESSAGE_BANK_SIZE);
  if (nMessages) img.allocate(MESSAGE_INDEX, MESSAGE_INDEX_SIZE * nMessages);

  for (const rc of edit.roamingChannels) img.allocate(ROAMING_CHANNELS + (rc.index - 1) * ROAMING_CHANNEL_SIZE, ROAMING_CHANNEL_SIZE);
  for (const rz of edit.roamingZones) img.allocate(ROAMING_ZONES + rz.index * ROAMING_ZONE_SIZE, ROAMING_ZONE_SIZE);

  // Elements the app does not model but qdmr rewrites: DTMF contacts, air-band channels.
  const dtmfMap = await read(DTMF_BYTEMAP, 0x100);
  for (let i = 0; i < NUM_DTMF; i++)
    if (dtmfMap[i] === 0x00) img.allocate(DTMF_CONTACTS + Math.floor(i / 2) * DTMF_PAIR_SIZE, DTMF_PAIR_SIZE);
  const airMap = await read(AIRBAND_BITMAP, 0x20);
  let allAir = true;
  for (let i = 0; i < NUM_AIRBAND; i++) {
    if (!(airMap[i >> 3] & (1 << (i & 7)))) { allAir = false; break; }
    img.allocate(AIRBAND_CHANNELS + i * AIRBAND_SIZE, AIRBAND_SIZE);
  }
  if (allAir) img.allocate(AIRBAND_VFO, AIRBAND_SIZE);
  img.allocate(AIRBAND_BITMAP, 0x40); // channel + scan bitmaps

  // ---- 2. Fill every allocated block from the radio's current memory -------
  const runs = img.sortedRuns();
  const totalBytes = runs.reduce((s, r) => s + r.length, 0);
  let done = 0;
  for (const r of runs) {
    for (let off = 0; off < r.length; off += 0x400) {
      const len = Math.min(0x400, r.length - off);
      const data = await read(r.address + off, len);
      for (let o = 0; o < len; o += BLOCK) img.blocks.get(r.address + off + o)!.set(data.subarray(o, o + BLOCK));
      done += len;
      onProgress?.(done, totalBytes);
    }
  }

  // ---- 3. Overlay the user's edits ------------------------------------------
  // A byte is taken from the edited serialization where it differs from the
  // serialization of what the radio holds (so unmodelled bytes are preserved);
  // records with no counterpart on the radio are written as serialized.
  const baseByAddr = new Map(serializeToRadioMemory(base).map(w => [w.address, w.data]));
  for (const w of serializeToRadioMemory(edit)) {
    const b = baseByAddr.get(w.address);
    for (let i = 0; i < w.data.length; i++) {
      if (b && i < b.length && w.data[i] === b[i]) continue;
      const a = w.address + i;
      if (img.blocks.has(a - (a % BLOCK))) img.set(a, w.data[i]);
    }
  }

  // New channels get a cleared extension record (as qdmr does).
  const baseChannelSlots = new Set(base.channels.map(c => c.index - 1));
  for (const ch of edit.channels)
    if (!baseChannelSlots.has(ch.index - 1)) img.setBytes(channelAddr(ch.index - 1) + CHANNEL_EXT_OFFSET, new Uint8Array(CHANNEL_SIZE));

  // General settings (240 bytes) when edited in the app.
  if (edit.generalSettingsRaw && base.generalSettingsRaw) {
    edit.generalSettingsRaw.forEach((v, i) => {
      if (v !== base.generalSettingsRaw![i]) img.set(GENERAL_SETTINGS + i, v);
    });
  }

  // ---- 4. Regenerate derived lookup tables ----------------------------------
  if (nContacts) {
    const idx = new Uint8Array(align(4 * nContacts)).fill(0xff);
    edit.digitalContacts.forEach((_c, i) => u32le(idx, 4 * i, i));
    img.setBytes(CONTACT_INDEX, idx);

    const table = new Uint8Array(align(8 * (nContacts + 1))).fill(0xff);
    const sorted = [...edit.digitalContacts].sort((a, b) => a.dmrId - b.dmrId);
    sorted.forEach((c, i) => {
      u32le(table, 8 * i, ((bcdLe(c.dmrId) << 1) | (c.callType === 'group' ? 1 : 0)) >>> 0);
      u32le(table, 8 * i + 4, c.index - 1); // radio slot
    });
    img.setBytes(CONTACT_ID_TABLE, table);
  }
  // Space after the last contact record inside the written contact area is
  // zero-filled, as qdmr does.
  for (let bank = 0; bank * CONTACTS_PER_BANK < nContacts; bank++) {
    const inBank = Math.min(CONTACTS_PER_BANK, nContacts - bank * CONTACTS_PER_BANK);
    const start = CONTACT_BANKS + bank * CONTACT_BANK_SPACING;
    const end = start + Math.min(inBank * CONTACT_BLOCK, CONTACT_BANK_SPACING);
    for (let a = start + inBank * CONTACT_SIZE; a < end; a++) img.set(a, 0);
  }

  // Unused message slots inside written banks are cleared, as qdmr does.
  for (let slot = nMessages; slot < Math.ceil(nMessages / MESSAGES_PER_BANK) * MESSAGES_PER_BANK; slot++) {
    const addr = MESSAGE_BANKS + Math.floor(slot / MESSAGES_PER_BANK) * MESSAGE_BANK_SPACING + (slot % MESSAGES_PER_BANK) * 0x100;
    img.setBytes(addr, new Uint8Array(0x100));
  }
  if (nMessages) {
    // Same layout qdmr writes (verified accepted by the radio).
    const mi = new Uint8Array(MESSAGE_INDEX_SIZE * nMessages);
    for (let i = 0; i < nMessages; i++) mi[i * MESSAGE_INDEX_SIZE + 3] = i < nMessages - 1 ? i + 1 : i;
    img.setBytes(MESSAGE_INDEX, mi);
  }

  return img.toWrites();
}

/**
 * Write a codeplug to the radio: read current state, build the full plan,
 * write every element in one session. The caller ends the session (END).
 */
export async function writeFullCodeplug(
  conn: RadioConnection,
  codeplug: Codeplug,
  onProgress?: (p: ReadProgress) => void,
): Promise<void> {
  const report = (phase: string, current: number, total: number) => onProgress?.({ phase, current, total });

  report('Reading current radio state...', 0, 100);
  const baseline = await readRadioCodeplug(conn);

  const writes = await buildFullWritePlan(codeplug, baseline,
    (address, length) => readRegion(conn, address, length),
    (d, t) => report('Reading radio memory...', d, t));

  const totalBytes = writes.reduce((sum, w) => sum + w.data.length, 0);
  let written = 0;
  for (const w of writes) {
    await writeRegion(conn, w.address, w.data, n => report('Writing to radio...', written + n, totalBytes));
    written += w.data.length;
  }
  report('Write complete', totalBytes, totalBytes);
}
