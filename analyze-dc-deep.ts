import { readFileSync } from 'fs';

const RDT_PATH = 'C:\\Users\\CO-OP\\DMR RADIO PROJECT\\DMR Radio FEQ List.rdt';
const original = readFileSync(RDT_PATH);
const buf = original.buffer.slice(original.byteOffset, original.byteOffset + original.byteLength);
const view = new DataView(buf);

// Digital contacts section starts at 0x34A3
const SEC = 0x34A3;
const sizeField = view.getUint16(SEC, true); // 618
const dataStart = SEC + 2;
const dataEnd = SEC + 2 + sizeField;

console.log(`Section: 0x${SEC.toString(16)} size=${sizeField}`);
console.log(`Data: 0x${dataStart.toString(16)} to 0x${dataEnd.toString(16)}\n`);

// Find all records by scanning for sequential idx patterns
interface Record { idx: number; callType: number; offset: number; }
const records: Record[] = [];

let searchStart = dataStart;
for (let expectedIdx = 1; expectedIdx <= 64; expectedIdx++) {
  let found = false;
  for (let off = searchStart; off < dataEnd - 3; off++) {
    if (original[off] === expectedIdx && original[off + 1] === 0x00 &&
        (original[off + 2] === 0x10 || original[off + 2] === 0x00)) {
      records.push({ idx: expectedIdx, callType: original[off + 2], offset: off });
      searchStart = off + 5;
      found = true;
      break;
    }
  }
  if (!found) break;
}

console.log(`Found ${records.length} sequential records\n`);

// Dump each record
for (let i = 0; i < records.length; i++) {
  const r = records[i];
  const recStart = r.offset - 3; // 3 pre-bytes before index
  const recEnd = i + 1 < records.length ? records[i + 1].offset - 3 : dataEnd;
  const recSize = recEnd - recStart;

  const bytes = Array.from(original.slice(recStart, recEnd));
  const hex = bytes.map(b => b.toString(16).padStart(2, '0')).join(' ');
  const callStr = r.callType === 0x10 ? 'Group  ' : 'Private';

  // Data bytes after pre(3) + idx(1) + 00(1) + callType(1) = 6 bytes header
  const dataBytes = bytes.slice(6);

  // Try different DMR ID encodings
  const dmrId32 = dataBytes.length >= 4 ? (dataBytes[0] | (dataBytes[1] << 8) | (dataBytes[2] << 16) | ((dataBytes[3] << 24) >>> 0)) >>> 0 : 0;
  const dmrId24 = dataBytes.length >= 3 ? (dataBytes[0] | (dataBytes[1] << 8) | (dataBytes[2] << 16)) : 0;
  const bcd4 = dataBytes.slice(0, 4).map(b => ((b >> 4) & 0xf).toString() + (b & 0xf).toString()).join('');

  // Try pre-bytes as DMR ID
  const preBytes = bytes.slice(0, 3);
  const preDmrId24 = preBytes[0] | (preBytes[1] << 8) | (preBytes[2] << 16);
  const preBcd = preBytes.map(b => ((b >> 4) & 0xf).toString() + (b & 0xf).toString()).join('');

  // Look at the trailing bytes (after the first 4 data bytes) for possible name
  const trailingData = dataBytes.slice(4);
  const trailingHex = trailingData.map(b => b.toString(16).padStart(2, '0')).join(' ');

  // Count non-zero trailing bytes (potential name length)
  let nameEndIdx = trailingData.findIndex(b => b === 0);
  if (nameEndIdx === -1) nameEndIdx = trailingData.length;

  console.log(`[${r.idx.toString().padStart(2)}] ${callStr} size=${recSize.toString().padStart(2)} pre=${preBytes.map(b => b.toString(16).padStart(2, '0')).join(' ')} | ${hex}`);
  console.log(`     pre24=${preDmrId24} preBCD="${preBcd}" data32=${dmrId32} data24=${dmrId24} dataBCD="${bcd4}" trailing: ${trailingHex}`);
}

// Also look for "known" DMR IDs - the radio has DMR ID 3190119
// Let's search for that value in different encodings
console.log('\n\n═══ SEARCHING FOR KNOWN DMR ID 3190119 ═══');
const knownId = 3190119;
// As uint24_le: bytes would be knownId & 0xFF, (knownId >> 8) & 0xFF, (knownId >> 16) & 0xFF
const b0 = knownId & 0xFF; // 0x67
const b1 = (knownId >> 8) & 0xFF; // 0xAB
const b2 = (knownId >> 16) & 0xFF; // 0x30
console.log(`DMR ID ${knownId} as uint24_le: ${b0.toString(16)} ${b1.toString(16)} ${b2.toString(16)}`);

// As BCD: 3190119 → 03 19 01 19
console.log(`DMR ID ${knownId} as BCD: 03 19 01 19`);

// Search in digital contacts data
for (let i = dataStart; i < dataEnd - 2; i++) {
  if (original[i] === b0 && original[i+1] === b1 && original[i+2] === b2) {
    console.log(`  Found uint24_le at 0x${i.toString(16)}`);
  }
}

// Search for common DMR TG IDs: 91 (worldwide), 310 (TAC310), 3100 (USA), 3172 (New England)
for (const tgId of [91, 310, 3100, 3172, 9, 2, 1, 3181, 31010, 31090]) {
  const tb0 = tgId & 0xFF;
  const tb1 = (tgId >> 8) & 0xFF;
  const tb2 = (tgId >> 16) & 0xFF;
  for (let i = dataStart; i < dataEnd - 2; i++) {
    if (original[i] === tb0 && original[i+1] === tb1 && original[i+2] === tb2) {
      // Check if it's in a likely position (data bytes of a record)
      console.log(`  TG ${tgId} as uint24_le at 0x${i.toString(16)} (relative: ${i - dataStart})`);
    }
  }
}

// APRS Analysis
console.log('\n\n═══ APRS PATH ANALYSIS ═══');
const APRS_START = 0x385C;
const APRS_END = 0x38CE;

// GPS message
let pos = APRS_START;
let gpsMsg = '';
while (pos < APRS_END && original[pos] !== 0) {
  gpsMsg += String.fromCharCode(original[pos]);
  pos++;
}
pos++; // skip null
console.log(`GPS Message: "${gpsMsg}" (${pos - APRS_START} bytes incl null)`);
console.log(`After GPS msg at 0x${pos.toString(16)}:`);

// Dump remaining bytes byte-by-byte
for (let i = pos; i < APRS_END; i++) {
  const b = original[i];
  const ch = (b >= 0x20 && b < 0x7f) ? ` '${String.fromCharCode(b)}'` : '';
  console.log(`  0x${i.toString(16).padStart(4, '0')}: 0x${b.toString(16).padStart(2, '0')} = ${b.toString().padStart(3)}${ch}`);
}
