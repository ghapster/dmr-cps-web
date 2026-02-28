/**
 * Verify the corrected scan list format.
 * Format: idx(1) + name(var+null) + settings(7) + timing(4) + count(1) + entries(count*3)
 * Each entry: flag(1) + channel_index(uint16_le)
 * Run: npx tsx verify-scanlist.ts
 */
import { readFileSync } from 'fs';

const RDT_PATH = 'C:\\Users\\CO-OP\\DMR RADIO PROJECT\\DMR Radio FEQ List.rdt';
const original = readFileSync(RDT_PATH);
const view = new DataView(original.buffer.slice(original.byteOffset, original.byteOffset + original.byteLength));
const FILE_SIZE = original.length;

function readName(offset: number): { name: string; len: number } {
  const bytes: number[] = [];
  for (let i = 0; i < 16; i++) {
    if (offset + i >= FILE_SIZE) break;
    const b = original[offset + i];
    if (b === 0) break;
    bytes.push(b);
  }
  return { name: String.fromCharCode(...bytes), len: bytes.length };
}

function nameFieldSize(len: number): number {
  return len + (len < 16 ? 1 : 0);
}

// Scan list count at 0x333E
const scanListStart = 0x333E;
const count = original[scanListStart];
let pos = scanListStart + 1;

console.log(`Scan list count: ${count}\n`);
console.log(`${'#'.padEnd(3)} ${'Name'.padEnd(18)} ${'Settings'.padEnd(24)} ${'Timing'.padEnd(14)} Cnt  Channels`);
console.log(`${'─'.repeat(3)} ${'─'.repeat(18)} ${'─'.repeat(24)} ${'─'.repeat(14)} ${'─'.repeat(3)}  ${'─'.repeat(40)}`);

for (let i = 0; i < count; i++) {
  const idx = original[pos];
  const { name, len: nameLen } = readName(pos + 1);
  const nfs = nameFieldSize(nameLen);

  // Settings: 7 bytes after name
  const settingsOff = pos + 1 + nfs;
  const settings = Array.from(original.slice(settingsOff, settingsOff + 7))
    .map(b => b.toString(16).padStart(2, '0')).join(' ');

  // Timing: 4 bytes after settings
  const timingOff = settingsOff + 7;
  const timing = Array.from(original.slice(timingOff, timingOff + 4))
    .map(b => b.toString(16).padStart(2, '0')).join(' ');

  // Count: 1 byte after timing
  const chCount = original[timingOff + 4];

  // Channel entries: 3 bytes each (flag + uint16_le)
  const entriesOff = timingOff + 5;
  const channels: string[] = [];
  for (let c = 0; c < chCount; c++) {
    const flag = original[entriesOff + c * 3];
    const chIdx = view.getUint16(entriesOff + c * 3 + 1, true);
    channels.push(`${chIdx}${flag ? '*' : ''}`);
  }

  const recordSize = 1 + nfs + 7 + 4 + 1 + chCount * 3;

  console.log(
    `${String(idx).padEnd(3)} ${name.padEnd(18)} ${settings.padEnd(24)} ${timing.padEnd(14)} ${String(chCount).padEnd(3)}  ${channels.join(', ')}`
  );

  pos += recordSize;
}

console.log(`\nScan lists end at: 0x${pos.toString(16)} (${pos})`);

// Check what's right after scan lists
console.log(`\nNext byte: 0x${original[pos].toString(16)} (${original[pos]})`);

// Parse DTMF contacts
const dtmfCount = original[pos];
pos++;
console.log(`\n═══ DTMF/ANALOG CONTACTS: ${dtmfCount} ═══`);
for (let i = 0; i < dtmfCount; i++) {
  const idx = original[pos];
  const codeLen = original[pos + 1];
  const code = String.fromCharCode(...Array.from(original.slice(pos + 2, pos + 2 + codeLen)));
  const { name, len: nameLen } = readName(pos + 2 + codeLen);
  const nfs = nameFieldSize(nameLen);
  console.log(`  [${idx}] Code="${code}" Name="${name}"`);
  pos += 1 + 1 + codeLen + nfs;
}

console.log(`\nDTMF contacts end at: 0x${pos.toString(16)} (${pos})`);

// Now analyze the NEXT section (digital contacts?)
console.log(`\n═══ NEXT SECTION at 0x${pos.toString(16)} ═══`);
console.log(`First 8 bytes: ${Array.from(original.slice(pos, pos + 8)).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);

// Let me try: this might be a digital contacts section
// Try uint8 count
const dcCount = original[pos];
console.log(`\nAs uint8 count: ${dcCount}`);

// Try to read records with different sizes
// Digital contacts in Anytone are typically: callType(1) + contactId(4) + name(16) + flags
// But some use compressed/encoded formats

// Let me scan for ALL instances of sequential index bytes 01, 02, 03... in the next 700 bytes
console.log('\nSearching for all sequential indices in next 700 bytes:');
const searchEnd = Math.min(pos + 700, FILE_SIZE);

// Find all byte pairs that look like uint16_le index + type byte
interface IndexHit { offset: number; idx: number; nextTwo: string; }
const hits: IndexHit[] = [];

for (let off = pos; off < searchEnd - 3; off++) {
  const b = original[off];
  const b1 = original[off + 1];
  const b2 = original[off + 2];
  if (b >= 1 && b <= 40 && b1 === 0x00 && (b2 === 0x00 || b2 === 0x10)) {
    hits.push({
      offset: off,
      idx: b,
      nextTwo: `${b1.toString(16).padStart(2, '0')} ${b2.toString(16).padStart(2, '0')}`,
    });
  }
}

// Group by idx to find consistent patterns
const byIdx = new Map<number, IndexHit[]>();
for (const h of hits) {
  const arr = byIdx.get(h.idx) || [];
  arr.push(h);
  byIdx.set(h.idx, arr);
}

// For each index value, show all hits
for (let idx = 1; idx <= 35; idx++) {
  const arr = byIdx.get(idx);
  if (arr) {
    for (const h of arr) {
      const context = Array.from(original.slice(h.offset - 2, h.offset + 20))
        .map(b => b.toString(16).padStart(2, '0')).join(' ');
      console.log(`  idx=${h.idx.toString().padEnd(2)} at 0x${h.offset.toString(16).padStart(5, '0')} next=${h.nextTwo} context: ${context}`);
    }
  }
}

// Also try: look at the data as fixed-size records of various sizes
console.log('\n\nTrying fixed-size records from section start:');
for (const recSize of [16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26]) {
  let sequential = 0;
  // Check if bytes at each record boundary form sequential indices
  for (let r = 0; r < 35; r++) {
    const off = pos + 3 + r * recSize; // skip 3-byte header
    if (off >= searchEnd) break;
    if (original[off] === r + 1) sequential++;
  }
  if (sequential >= 4) {
    console.log(`  recSize=${recSize}: ${sequential} sequential indices (starting idx=1 at offset+3)`);
  }

  // Also try with offset+2
  sequential = 0;
  for (let r = 0; r < 35; r++) {
    const off = pos + 2 + r * recSize;
    if (off >= searchEnd) break;
    if (original[off] === r + 1) sequential++;
  }
  if (sequential >= 4) {
    console.log(`  recSize=${recSize}: ${sequential} sequential indices (starting idx=1 at offset+2)`);
  }

  // Try with various field offsets within record
  for (let fieldOff = 0; fieldOff <= 4; fieldOff++) {
    sequential = 0;
    for (let r = 0; r < 35; r++) {
      const off = pos + fieldOff + r * recSize;
      if (off >= searchEnd) break;
      if (original[off] === r + 1) sequential++;
    }
    if (sequential >= 5) {
      console.log(`  recSize=${recSize}, fieldOff=${fieldOff}: ${sequential} sequential indices`);
    }
  }
}

// Print the text message section start precisely
console.log('\n\n═══ LOCATING TEXT MESSAGES ═══');
// Search for "Hello!" in the file
for (let i = pos; i < FILE_SIZE - 6; i++) {
  if (original[i] === 0x48 && original[i+1] === 0x65 && original[i+2] === 0x6c &&
      original[i+3] === 0x6c && original[i+4] === 0x6f && original[i+5] === 0x21) {
    console.log(`"Hello!" at 0x${i.toString(16)}`);
    // Dump the 32 bytes before it
    const before = Array.from(original.slice(i - 32, i))
      .map(b => b.toString(16).padStart(2, '0')).join(' ');
    console.log(`  32 bytes before: ${before}`);
    break;
  }
}

// ═══ FULL SECTION MAP ═══
console.log('\n\n═══ PROPOSED SECTION MAP ═══');
console.log(`0x0000 - 0x0016: File header (23 bytes)`);
console.log(`0x0017 - 0x01D3: Settings block (445 bytes)`);
console.log(`0x01D4 - 0x316E: Channels (${143} channels)`);
console.log(`0x316F - 0x317B: Radio IDs`);
console.log(`0x317C - 0x333D: Zones`);
console.log(`0x333E - 0x3491: Scan lists (6 lists, CORRECTED format)`);
console.log(`0x3492 - 0x34A2: DTMF contacts (1 entry)`);
console.log(`0x34A3 - ????: Digital contacts section`);
console.log(`0x3717 - ????: Text messages`);
console.log(`0x385C - ????: APRS settings`);
console.log(`0x38CE - ????: Roaming channels/zones`);
console.log(`0x7DBD - 0x7DC1: File footer "V1039"`);
