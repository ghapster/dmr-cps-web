/**
 * Analyze the trailing 18,734 bytes of the RDT file to identify data sections.
 * Run: npx tsx analyze-trailing.ts
 */
import { readFileSync } from 'fs';

const RDT_PATH = 'C:\\Users\\CO-OP\\DMR RADIO PROJECT\\DMR Radio FEQ List.rdt';
const original = readFileSync(RDT_PATH);
const buffer = original.buffer.slice(original.byteOffset, original.byteOffset + original.byteLength);
const view = new DataView(buffer);

// The parser stops at offset 13460. Everything after is trailing bytes.
const TRAIL_START = 13460;
const FILE_SIZE = original.length;

console.log(`\nAnalyzing trailing bytes: offset ${TRAIL_START} (0x${TRAIL_START.toString(16)}) to ${FILE_SIZE} (0x${FILE_SIZE.toString(16)})`);
console.log(`Total trailing: ${FILE_SIZE - TRAIL_START} bytes`);
console.log('═'.repeat(70));

// Helper: hex dump a region
function hexDump(start: number, len: number, label?: string) {
  if (label) console.log(`\n--- ${label} ---`);
  const end = Math.min(start + len, FILE_SIZE);
  for (let i = start; i < end; i += 16) {
    const offset = i.toString(16).padStart(5, '0');
    const hex: string[] = [];
    let ascii = '';
    for (let j = 0; j < 16; j++) {
      if (i + j < end) {
        const b = original[i + j];
        hex.push(b.toString(16).padStart(2, '0'));
        ascii += (b >= 0x20 && b < 0x7f) ? String.fromCharCode(b) : '.';
      } else {
        hex.push('  ');
        ascii += ' ';
      }
    }
    console.log(`${offset}  ${hex.slice(0, 8).join(' ')}  ${hex.slice(8).join(' ')}  |${ascii}|`);
  }
}

// Helper: read ASCII name up to 16 bytes
function readName(offset: number, maxLen = 16): { name: string; len: number } {
  const bytes: number[] = [];
  for (let i = 0; i < maxLen; i++) {
    if (offset + i >= FILE_SIZE) break;
    const b = original[offset + i];
    if (b === 0) break;
    bytes.push(b);
  }
  return { name: String.fromCharCode(...bytes), len: bytes.length };
}

// Helper: scan for ASCII strings in a region
function findStrings(start: number, end: number, minLen = 4) {
  const strings: { offset: number; text: string }[] = [];
  let current = '';
  let strStart = start;
  for (let i = start; i < end; i++) {
    const b = original[i];
    if (b >= 0x20 && b < 0x7f) {
      if (current.length === 0) strStart = i;
      current += String.fromCharCode(b);
    } else {
      if (current.length >= minLen) {
        strings.push({ offset: strStart, text: current });
      }
      current = '';
    }
  }
  if (current.length >= minLen) {
    strings.push({ offset: strStart, text: current });
  }
  return strings;
}

// Helper: scan for potential count+records patterns
function findCountByte(offset: number): { count: number; nextByte: number } {
  const count = original[offset];
  const nextByte = original[offset + 1];
  return { count, nextByte };
}

// ─── First, dump the first 256 bytes of trailing to get oriented ───────────
hexDump(TRAIL_START, 256, `First 256 bytes at offset 0x${TRAIL_START.toString(16)}`);

// ─── Look for all readable strings in the trailing section ─────────────────
console.log('\n\n═══ ALL STRINGS (4+ chars) IN TRAILING BYTES ═══');
const strings = findStrings(TRAIL_START, FILE_SIZE, 4);
for (const s of strings) {
  console.log(`  0x${s.offset.toString(16).padStart(5, '0')}: "${s.text}"`);
}

// ─── Look for section boundaries — scan for count bytes followed by patterns ─
console.log('\n\n═══ POTENTIAL SECTION BOUNDARIES ═══');
console.log('(Looking for count bytes followed by index patterns)');

let pos = TRAIL_START;
// Walk through looking for patterns
while (pos < FILE_SIZE - 10) {
  const b = original[pos];

  // Look for a byte that could be a count (1-255) followed by index 0
  if (b > 0 && b < 100 && original[pos + 1] === 0) {
    // Check if this could be a section: count + records starting with index 0
    // Look for increasing indices
    const potentialCount = b;
    let looksLikeSection = true;

    // Quick check: are there readable strings nearby?
    const nearbyStr = findStrings(pos, Math.min(pos + 100, FILE_SIZE), 3);
    if (nearbyStr.length > 0) {
      console.log(`  0x${pos.toString(16).padStart(5, '0')}: count=${potentialCount}, next=0x${original[pos+1].toString(16)}, nearby strings: ${nearbyStr.map(s => `"${s.text}"`).join(', ')}`);
    }
  }
  pos++;
}

// ─── Hex dump at regular intervals to spot structure ───────────────────────
console.log('\n\n═══ SAMPLED HEX DUMPS ═══');
const samplePoints = [
  TRAIL_START,
  TRAIL_START + 500,
  TRAIL_START + 1000,
  TRAIL_START + 2000,
  TRAIL_START + 4000,
  TRAIL_START + 8000,
  TRAIL_START + 12000,
  TRAIL_START + 16000,
  TRAIL_START + 18000,
  FILE_SIZE - 128,
];

for (const sp of samplePoints) {
  if (sp < FILE_SIZE) {
    hexDump(sp, 64, `Sample at offset 0x${sp.toString(16)} (${sp})`);
  }
}

// ─── Look for frequency patterns (uint32_le values in 136-480 MHz range) ──
console.log('\n\n═══ FREQUENCY-LIKE VALUES (uint32_le / 100000 = 136-480 MHz) ═══');
for (let i = TRAIL_START; i < FILE_SIZE - 4; i++) {
  const val = view.getUint32(i, true);
  const freq = val / 100000;
  if (freq >= 136 && freq <= 480 && val % 100 === 0) { // round to 1kHz
    console.log(`  0x${i.toString(16).padStart(5, '0')}: ${val} → ${freq.toFixed(5)} MHz`);
  }
}

// ─── Look for DMR ID patterns (3-byte values in 1000000-16776415 range) ───
console.log('\n\n═══ DMR ID-LIKE VALUES (uint24_le, 1M-16.7M range) ═══');
for (let i = TRAIL_START; i < FILE_SIZE - 3; i++) {
  const val = original[i] | (original[i+1] << 8) | (original[i+2] << 16);
  if (val >= 1000000 && val <= 16776415) {
    // Check if surrounded by readable text or zero bytes (likely a record)
    const before = original[i - 1];
    const after3 = original[i + 3];
    if (before === 0 || after3 === 0 || (after3 >= 0x20 && after3 < 0x7f)) {
      const { name } = readName(i + 3);
      if (name.length >= 2) {
        console.log(`  0x${i.toString(16).padStart(5, '0')}: DMR ID ${val}, followed by "${name}"`);
      }
    }
  }
}

// ─── Zero-byte runs (section gaps) ────────────────────────────────────────
console.log('\n\n═══ ZERO-BYTE RUNS (50+ bytes) ═══');
let zeroStart = -1;
for (let i = TRAIL_START; i < FILE_SIZE; i++) {
  if (original[i] === 0) {
    if (zeroStart === -1) zeroStart = i;
  } else {
    if (zeroStart !== -1 && i - zeroStart >= 50) {
      console.log(`  0x${zeroStart.toString(16).padStart(5, '0')} - 0x${(i-1).toString(16).padStart(5, '0')}: ${i - zeroStart} zero bytes`);
    }
    zeroStart = -1;
  }
}
if (zeroStart !== -1 && FILE_SIZE - zeroStart >= 50) {
  console.log(`  0x${zeroStart.toString(16).padStart(5, '0')} - 0x${(FILE_SIZE-1).toString(16).padStart(5, '0')}: ${FILE_SIZE - zeroStart} zero bytes`);
}

// ─── Byte value distribution ──────────────────────────────────────────────
console.log('\n\n═══ BYTE VALUE DISTRIBUTION ═══');
const dist = new Uint32Array(256);
for (let i = TRAIL_START; i < FILE_SIZE; i++) dist[original[i]]++;
const nonZero = dist.filter((_, i) => i !== 0).reduce((a, b) => a + b, 0);
console.log(`  Zero bytes: ${dist[0]} (${(dist[0] / (FILE_SIZE - TRAIL_START) * 100).toFixed(1)}%)`);
console.log(`  Non-zero:   ${nonZero} (${(nonZero / (FILE_SIZE - TRAIL_START) * 100).toFixed(1)}%)`);
console.log(`  ASCII printable: ${Array.from(dist).slice(0x20, 0x7f).reduce((a, b) => a + b, 0)}`);
console.log(`  0xFF bytes: ${dist[0xff]}`);

console.log('');
