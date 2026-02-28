/**
 * Decode the digital contacts section at 0x34A3.
 * Run: npx tsx analyze-digital-contacts.ts
 */
import { readFileSync } from 'fs';

const RDT_PATH = 'C:\\Users\\CO-OP\\DMR RADIO PROJECT\\DMR Radio FEQ List.rdt';
const original = readFileSync(RDT_PATH);
const buf = original.buffer.slice(original.byteOffset, original.byteOffset + original.byteLength);
const view = new DataView(buf);
const FILE_SIZE = original.length;

function hexDump(start: number, len: number, label?: string) {
  if (label) console.log(`\n${label}`);
  const end = Math.min(start + len, FILE_SIZE);
  for (let i = start; i < end; i += 16) {
    const off = i.toString(16).padStart(5, '0');
    const hex: string[] = [];
    let ascii = '';
    for (let j = 0; j < 16; j++) {
      if (i + j < end) {
        const b = original[i + j];
        hex.push(b.toString(16).padStart(2, '0'));
        ascii += (b >= 0x20 && b < 0x7f) ? String.fromCharCode(b) : '.';
      }
    }
    console.log(`  ${off}  ${hex.slice(0, 8).join(' ')}  ${hex.slice(8).join(' ')}  |${ascii}|`);
  }
}

const SECTION_START = 0x34A3;

// First 3 bytes look like a header
const hdr0 = original[SECTION_START];     // 0x6a = 106
const hdr1 = original[SECTION_START + 1]; // 0x02
const hdr2 = original[SECTION_START + 2]; // 0x00
const countLE16 = view.getUint16(SECTION_START, true); // uint16_le at start
console.log(`Section starts at 0x${SECTION_START.toString(16)}`);
console.log(`First 3 bytes: ${hdr0.toString(16)} ${hdr1.toString(16)} ${hdr2.toString(16)}`);
console.log(`As uint16_le count: ${countLE16} (0x${countLE16.toString(16)})`);
console.log(`Byte[2]: ${hdr2}`);

// The fixed-size record search found recSize=20 with fieldOff=1 gives 5 sequential indices
// But let's be more precise. Let me look at the data assuming:
// Header: uint16_le count (0x026a = 618? unlikely) OR count(1)=0x6a=106, then 2 more header bytes

// Let's try: count as first byte = 106 (too many), or as uint16_le = 618 (way too many)
// Actually 0x6a = 106 decimal — that could be a digital contact count
// For a D578UV codeplug, 32 digital contacts is more realistic

// Let me look at the actual sequential pattern more carefully
// From the verify output, sequential indices 1-32 appear at consistent intervals
// Let me find the exact positions of indices 1, 2, 3, 4...

console.log('\n═══ FINDING SEQUENTIAL INDEX POSITIONS ═══');

interface Hit { off: number; idx: number; }
const indexHits: Map<number, Hit[]> = new Map();

// Search for bytes 1-35 followed by 00 and then either 00 or 10
const searchStart = SECTION_START;
const searchEnd = 0x3717; // text messages start

for (let off = searchStart; off < searchEnd; off++) {
  const b = original[off];
  if (b >= 1 && b <= 35) {
    // Check if followed by 00 and then a known pattern byte
    if (off + 2 < FILE_SIZE && original[off + 1] === 0x00 && original[off + 2] === 0x10) {
      const arr = indexHits.get(b) || [];
      arr.push({ off, idx: b });
      indexHits.set(b, arr);
    }
  }
}

// Find the set of hits that form a consistent sequential pattern
// For each hit of idx=1, check if there's an idx=2 at a consistent distance
console.log('\nHits for pattern: idx 00 10 (likely digital contact record markers):');
for (let idx = 1; idx <= 35; idx++) {
  const hits = indexHits.get(idx);
  if (hits) {
    for (const h of hits) {
      console.log(`  idx=${idx.toString().padStart(2)} at 0x${h.off.toString(16).padStart(5, '0')}`);
    }
  }
}

// Let me try a different approach: look at the data with hex dump and identify records visually
console.log('\n═══ HEX DUMP OF DIGITAL CONTACTS SECTION ═══');
hexDump(SECTION_START, 128, 'First 128 bytes:');

// The pattern `XX 00 10` appears to be within records
// Let me look at it differently: what if the record has:
// 2 bytes header (some kind of ID/hash), then index(uint16_le), then 00 10 marker, then data

// Actually, let me look at the hits sorted by offset
const allHits: { off: number; idx: number }[] = [];
for (const [idx, hits] of indexHits) {
  for (const h of hits) allHits.push(h);
}
allHits.sort((a, b) => a.off - b.off);

console.log('\n═══ ALL "idx 00 10" HITS SORTED BY OFFSET ═══');
let prevOff = 0;
for (const h of allHits) {
  const gap = prevOff ? h.off - prevOff : 0;
  console.log(`  0x${h.off.toString(16).padStart(5, '0')} idx=${h.idx.toString().padStart(2)} gap=${gap}`);
  prevOff = h.off;
}

// Now look for the actual record structure by examining what's BEFORE each "idx 00 10"
// For the first occurrence (idx=1 at 0x034a9), what are the preceding bytes?
console.log('\n═══ RECORDS AROUND FIRST FEW INDICES ═══');
for (const h of allHits.slice(0, 10)) {
  const start = Math.max(SECTION_START, h.off - 6);
  hexDump(start, 24, `idx=${h.idx} at 0x${h.off.toString(16)}:`);
}

// Let me try another approach: look at the data as records starting right after the header
// If header is 3 bytes (6a 02 00), the first record starts at 0x34A6
// From the "recSize=20, fieldOff=1" hint, try:
// offset 0x34A6 + 1 = 0x34A7 should be idx byte
// But 0x34A6 is: 35 0c 00 01 00 10 ...
// 35 = some field, 0c 00 = field, 01 = index, 00 10 = type marker

// Actually let me try the pattern: each record is exactly N bytes
// Starting from 0x34A3+3 = 0x34A6 with various record sizes
console.log('\n═══ TRYING FIXED RECORD SIZES ═══');
for (let recSize = 15; recSize <= 25; recSize++) {
  let matches = 0;
  const firstFew: string[] = [];
  for (let r = 0; r < 35; r++) {
    const off = SECTION_START + 3 + r * recSize;
    if (off >= searchEnd) break;
    // Try different field offsets within record for the index
    for (let fo = 0; fo <= 5; fo++) {
      if (original[off + fo] === r + 1 && original[off + fo + 1] === 0x00 && original[off + fo + 2] === 0x10) {
        matches++;
        if (r < 5) firstFew.push(`r${r}@fo${fo}`);
        break;
      }
    }
  }
  if (matches >= 5) {
    console.log(`  recSize=${recSize}: ${matches} matches (${firstFew.join(', ')})`);
  }
}

// Try with 2-byte header instead of 3
for (let recSize = 15; recSize <= 25; recSize++) {
  let matches = 0;
  const firstFew: string[] = [];
  for (let r = 0; r < 35; r++) {
    const off = SECTION_START + 2 + r * recSize;
    if (off >= searchEnd) break;
    for (let fo = 0; fo <= 5; fo++) {
      if (original[off + fo] === r + 1 && original[off + fo + 1] === 0x00 && original[off + fo + 2] === 0x10) {
        matches++;
        if (r < 5) firstFew.push(`r${r}@fo${fo}`);
        break;
      }
    }
  }
  if (matches >= 5) {
    console.log(`  recSize=${recSize} (2-byte hdr): ${matches} matches (${firstFew.join(', ')})`);
  }
}

// The data format might be: count(1) + records where each record has variable parts
// Or the entire section could use a format like qdmr does
// Let me dump the first 20 bytes and try to interpret them

console.log('\n═══ TRYING: 1-BYTE COUNT + 2-BYTE HEADER + VARIABLE RECORDS ═══');
// What if byte 0 (0x6a=106) is NOT count, and instead the section header is different?
// Let me look at what 0x6a 0x02 0x00 could mean:
// As uint16_le: 0x026a = 618 — section size in bytes?
// Section is from 0x34A3 to 0x3717 = 0x274 = 628 bytes — close to 618!
// So maybe: section_size(uint16_le) = 0x026a = 618, then 1 byte something, then records

const sectionSize = view.getUint16(SECTION_START, true);
const actualSize = 0x3717 - SECTION_START;
console.log(`uint16_le at start: ${sectionSize} (0x${sectionSize.toString(16)})`);
console.log(`Actual section size (to text msgs): ${actualSize} (0x${actualSize.toString(16)})`);
console.log(`Difference: ${actualSize - sectionSize}`);

// 618 vs 628... off by 10. If the size doesn't include the 2-byte header: 618+2=620, still 8 off
// But what if the text messages section starts a bit earlier? Or the size is to end of records only?

// Let me try: the third byte (0x00) is the count of SOMETHING, then byte 4 (0x35=53) starts data
// Or: 3 header bytes, count at byte 3 = 0x35 = 53

// Actually let me look at what bytes appear before each "XX 00 10" pattern
// If each record has a consistent structure, the bytes before the index should be meaningful
console.log('\n═══ BYTE PATTERNS BEFORE INDEX FIELD ═══');
// From the sorted hits, the consistent ones (with 00 10 after) that have sequential indices
// Let me filter to find the TRUE sequential set

// Start from the first idx=1 hit at 0x34A9
const firstIdx1 = 0x34A9;
console.log(`\nStarting from idx=1 at 0x${firstIdx1.toString(16)}`);
console.log(`Bytes at idx=1: ${Array.from(original.slice(firstIdx1 - 3, firstIdx1 + 17)).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);

// Look for idx=2 in a window after idx=1
for (let off = firstIdx1 + 10; off < firstIdx1 + 30; off++) {
  if (original[off] === 2 && original[off + 1] === 0x00 && original[off + 2] === 0x10) {
    const gap = off - firstIdx1;
    console.log(`idx=2 at 0x${off.toString(16)} (gap=${gap} from idx=1)`);
    // Look for idx=3
    for (let off2 = off + 10; off2 < off + 30; off2++) {
      if (original[off2] === 3 && off2 + 2 < FILE_SIZE && original[off2 + 1] === 0x00) {
        const gap2 = off2 - off;
        console.log(`  idx=3 at 0x${off2.toString(16)} (gap=${gap2})`);
      }
    }
    break;
  }
}

// Let me just dump the entire section and look at it manually
console.log('\n═══ FULL SECTION HEX DUMP (0x34A3 to 0x3720) ═══');
hexDump(SECTION_START, 0x3720 - SECTION_START);

// Also try: look at consistent spacing between the sequential idx 00 10 hits
// Filter to keep only the "good" sequential set
const goodHits: { off: number; idx: number }[] = [];
// Build a chain: start from any idx=1 hit, find the nearest idx=2, idx=3, etc.
for (const h of allHits) {
  if (h.idx === 1 && h.off === 0x34A9) {
    goodHits.push(h);
    break;
  }
}

for (let nextIdx = 2; nextIdx <= 35; nextIdx++) {
  const prevHit = goodHits[goodHits.length - 1];
  if (!prevHit) break;
  // Find the hit for nextIdx that's closest to prevHit + ~17-20 bytes
  const candidates = allHits.filter(h => h.idx === nextIdx && h.off > prevHit.off && h.off < prevHit.off + 30);
  if (candidates.length === 1) {
    goodHits.push(candidates[0]);
  } else if (candidates.length > 1) {
    // Pick the one closest to prevHit + expected gap
    const expectedGap = goodHits.length >= 2 ? goodHits[goodHits.length - 1].off - goodHits[goodHits.length - 2].off : 17;
    candidates.sort((a, b) => Math.abs((a.off - prevHit.off) - expectedGap) - Math.abs((b.off - prevHit.off) - expectedGap));
    goodHits.push(candidates[0]);
  } else {
    break;
  }
}

console.log('\n═══ CHAINED SEQUENTIAL RECORDS ═══');
for (let i = 0; i < goodHits.length; i++) {
  const h = goodHits[i];
  const gap = i > 0 ? h.off - goodHits[i - 1].off : 0;
  const context = Array.from(original.slice(h.off - 3, h.off + 14)).map(b => b.toString(16).padStart(2, '0')).join(' ');
  console.log(`  idx=${h.idx.toString().padStart(2)} at 0x${h.off.toString(16).padStart(5, '0')} gap=${gap.toString().padStart(2)} context: ${context}`);
}

// If the gaps are consistent, the record size is the gap
// Each record then starts at (hit.off - someFixedOffset)
if (goodHits.length >= 3) {
  const gaps = [];
  for (let i = 1; i < goodHits.length; i++) {
    gaps.push(goodHits[i].off - goodHits[i - 1].off);
  }
  console.log(`\nGap distribution: ${gaps.join(', ')}`);
  const uniqueGaps = [...new Set(gaps)];
  console.log(`Unique gaps: ${uniqueGaps.join(', ')}`);

  if (uniqueGaps.length === 1) {
    const recSize = uniqueGaps[0];
    console.log(`\nConsistent record size: ${recSize} bytes`);
    // Now figure out record boundaries
    // idx=1 is at offset 0x34A9, and it's at position 3 within the record (if recSize=20, fieldOff=1 hint)
    // So record 0 starts at 0x34A9 - fieldOffset
    // The 3 bytes before idx=1 at 0x34A9 are at 0x34A6: 35 0c 00
    console.log(`\nFirst record probably starts at 0x${(goodHits[0].off - 3).toString(16)} (3 bytes before idx=1)`);
    console.log(`Section header: 0x34A3 to 0x${(goodHits[0].off - 3 - 1).toString(16)}`);

    // Parse each record
    const recordStart = goodHits[0].off - 3;
    const headerSize = recordStart - SECTION_START;
    console.log(`Header: ${headerSize} bytes: ${Array.from(original.slice(SECTION_START, recordStart)).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);

    const count = (0x3717 - recordStart) / recSize;
    console.log(`\nEstimated record count: ${count.toFixed(1)}`);

    console.log('\n═══ DECODED DIGITAL CONTACT RECORDS ═══');
    for (let r = 0; r < Math.min(Math.floor(count), 35); r++) {
      const off = recordStart + r * recSize;
      const bytes = Array.from(original.slice(off, off + recSize));
      const hex = bytes.map(b => b.toString(16).padStart(2, '0')).join(' ');

      // Try to decode: first 3 bytes = ?, idx(1) 00 10 = marker, then data
      // The "00 10" after idx might be: callType(uint8) + flag(uint8)
      // Or the index could be uint16_le and 10 is call type
      const pre = bytes.slice(0, 3);
      const idx = bytes[3]; // index
      const marker1 = bytes[4]; // 0x00
      const marker2 = bytes[5]; // 0x10

      // Bytes 6-12 are 7 bytes of data — could be DMR ID as uint32_le + name hash?
      const dmrId1 = (bytes[6] | (bytes[7] << 8) | (bytes[8] << 16) | (bytes[9] << 24)) >>> 0;
      const dmrId2 = (bytes[6] | (bytes[7] << 8) | (bytes[8] << 16));

      // Try BCD encoding for DMR ID
      const bcd = bytes.slice(6, 10).map(b =>
        ((b >> 4) & 0xf).toString() + (b & 0xf).toString()
      ).join('');

      console.log(`  [${idx.toString().padStart(2)}] ${hex}  pre=${pre.map(b=>b.toString(16).padStart(2,'0')).join(':')} dmrId32=${dmrId1} dmrId24=${dmrId2} bcd=${bcd}`);
    }
  }
}
