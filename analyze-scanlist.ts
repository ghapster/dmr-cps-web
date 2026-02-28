/**
 * Focused scan list format analysis — find exact record boundaries
 * by locating all scan list names in the binary.
 * Run: npx tsx analyze-scanlist.ts
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

// Find all scan list names by searching for known strings
const scanListNames = [
  'POLICE&FIRE',
  'REPEATER NEAR ME',
  'JOHNSTON',
  'Diwato2 PO101',
  'SATELLITE',
];

console.log('═══ LOCATING SCAN LIST NAMES ═══\n');

for (const name of scanListNames) {
  for (let i = 0x3300; i < 0x3500; i++) {
    let match = true;
    for (let j = 0; j < name.length; j++) {
      if (original[i + j] !== name.charCodeAt(j)) { match = false; break; }
    }
    if (match) {
      const prevByte = original[i - 1];
      console.log(`"${name}" at 0x${i.toString(16)} (prev byte: 0x${prevByte.toString(16)} = ${prevByte})`);
      hexDump(i - 2, name.length + 32, `  Context around "${name}":`);
    }
  }
}

// Now let's dump the ENTIRE scan list section with clear annotations
console.log('\n\n═══ FULL SCAN LIST SECTION HEX DUMP ═══');
// Scan list count at 0x333E
const slCount = original[0x333E];
console.log(`\nScan list count: ${slCount} at offset 0x333e`);

// Dump from scan list start through the end of all scan lists
// We know scan lists are followed by analog contacts, then the trailing data
hexDump(0x333E, 0x3494 - 0x333E + 32, 'Full scan list + analog contact + start of trailing:');

// Now let's specifically look at the channel entries pattern
// In the POLICE&FIRE scan list, after 14 1e 1f 1f, the count and channels
console.log('\n\n═══ CHANNEL ENTRY PATTERN ANALYSIS ═══');

// POLICE&FIRE: 14 1e 1f 1f at 0x3357
const pfHeaderAt = 0x3357;
console.log(`\nPOLICE&FIRE "14 1e 1f 1f" at 0x${pfHeaderAt.toString(16)}`);
hexDump(pfHeaderAt, 80, '  After the timing bytes:');

// The bytes after 14 1e 1f 1f for POLICE&FIRE:
// 19 00 0d 00 0c 00 00 0e 00 00 20 00 00 26 ...
// 0x19 = 25 (channel count?), then 00 0d (??), then what looks like 3-byte entries

console.log('\nTrying 3-byte channel entries after "14 1e 1f 1f XX 00 0d":');
let pos = pfHeaderAt + 4; // after 14 1e 1f 1f
const countByte = original[pos]; // 0x19 = 25
console.log(`  Count byte at 0x${pos.toString(16)}: ${countByte}`);
pos += 1; // skip count

// What are the next 2 bytes before channel data?
console.log(`  Next 2 bytes: 0x${original[pos].toString(16).padStart(2,'0')} 0x${original[pos+1].toString(16).padStart(2,'0')}`);

// Try reading channel entries as 3-byte: 00 XX 00 pattern
console.log('\n  Reading as 3-byte entries (flag + uint16_le):');
const chStart = pos + 2; // skip the 2 mystery bytes
for (let i = 0; i < Math.min(countByte, 30); i++) {
  const off = chStart + i * 3;
  const flag = original[off];
  const chIdx = view.getUint16(off + 1, true);
  console.log(`    [${i}] flag=0x${flag.toString(16).padStart(2,'0')} ch=${chIdx} (at 0x${off.toString(16)})`);
}

// Also try: reading uint16_le + 1 flag byte
console.log('\n  Reading as 3-byte entries (uint16_le + flag):');
for (let i = 0; i < Math.min(countByte, 30); i++) {
  const off = chStart + i * 3;
  const chIdx = view.getUint16(off, true);
  const flag = original[off + 2];
  console.log(`    [${i}] ch=${chIdx} flag=0x${flag.toString(16).padStart(2,'0')} (at 0x${off.toString(16)})`);
}

// Also try 2-byte entries with a different count/start
console.log('\n  Reading as 2-byte entries (uint16_le) from same start:');
for (let i = 0; i < Math.min(countByte, 30); i++) {
  const off = chStart + i * 2;
  const chIdx = view.getUint16(off, true);
  console.log(`    [${i}] ch=${chIdx} (at 0x${off.toString(16)})`);
}

// JOHNSTON has known zone channels, let's find them
console.log('\n\n═══ JOHNSTON SCAN LIST CHANNEL ANALYSIS ═══');
// From the zone data, JOHNSTON zone has these channels: 87-103 range (0x57-0x67)
// Let me look at the JOHNSTON scan list data
const joHeaderAt = 0x33E9; // where 14 1e 1f 1f starts for JOHNSTON
hexDump(joHeaderAt, 60, 'JOHNSTON scan list data:');

const joCount = original[joHeaderAt + 4]; // count after timing bytes
console.log(`\nJOHNSTON count byte: ${joCount} (0x${joCount.toString(16)})`);

console.log('\n  Reading as 3-byte entries (flag + uint16_le) after 6-byte header:');
const joChStart = joHeaderAt + 6;
for (let i = 0; i < Math.min(joCount, 25); i++) {
  const off = joChStart + i * 3;
  const flag = original[off];
  const chIdx = view.getUint16(off + 1, true);
  console.log(`    [${i}] flag=0x${flag.toString(16).padStart(2,'0')} ch=${chIdx} (0x${off.toString(16)})`);
}

// Try JOHNSTON with just the bytes after 14 1e 1f 1f as: count(1) + 2mystery + entries
console.log('\n  Reading with count+2+3*N from 14 1e 1f 1f:');
const joPos2 = joHeaderAt + 4;
const joCnt2 = original[joPos2];
console.log(`  Count: ${joCnt2}`);
const joChStart2 = joPos2 + 3; // 1 count + 2 unknown
for (let i = 0; i < Math.min(joCnt2, 25); i++) {
  const off = joChStart2 + i * 3;
  const b0 = original[off];
  const b1 = original[off+1];
  const b2 = original[off+2];
  const asLE = view.getUint16(off, true);
  const asLE2 = view.getUint16(off + 1, true);
  console.log(`    [${i}] bytes: ${b0.toString(16).padStart(2,'0')} ${b1.toString(16).padStart(2,'0')} ${b2.toString(16).padStart(2,'0')} → LE16@0=${asLE} LE16@1=${asLE2} (0x${off.toString(16)})`);
}

// Let me look at what channels are in the JOHNSTON ZONE to cross-reference
console.log('\n\n═══ CROSS-REFERENCE: JOHNSTON ZONE CHANNELS ═══');
// Re-parse zones to find JOHNSTON
let zPos = 0x317C; // after radio IDs
const zCount = original[zPos];
zPos++;
for (let i = 0; i < zCount; i++) {
  const zIdx = original[zPos];
  const zChCount = original[zPos + 1];
  const chListSize = zChCount * 2;
  const padOff = zPos + 2 + chListSize;
  // Read zone name
  const nameBytes: number[] = [];
  for (let j = 0; j < 16; j++) {
    const b = original[padOff + 4 + j];
    if (b === 0) break;
    nameBytes.push(b);
  }
  const zName = String.fromCharCode(...nameBytes);

  if (zName === 'JOHNSTON') {
    console.log(`JOHNSTON zone: ${zChCount} channels`);
    const chIndices: number[] = [];
    for (let c = 0; c < zChCount; c++) {
      chIndices.push(view.getUint16(zPos + 2 + c * 2, true));
    }
    console.log(`  Channel indices: ${chIndices.join(', ')}`);
    console.log(`  Decimal: ${chIndices.map(c => `${c} (0x${c.toString(16)})`).join(', ')}`);
  }

  const nLen = nameBytes.length;
  const nameFieldSz = nLen + (nLen < 16 ? 1 : 0);
  zPos += 1 + 1 + chListSize + 4 + nameFieldSz;
}

// Also check POLICE&FIRE zone
zPos = 0x317C;
zPos++; // skip count
for (let i = 0; i < zCount; i++) {
  const zIdx = original[zPos];
  const zChCount = original[zPos + 1];
  const chListSize = zChCount * 2;
  const padOff = zPos + 2 + chListSize;
  const nameBytes: number[] = [];
  for (let j = 0; j < 16; j++) {
    const b = original[padOff + 4 + j];
    if (b === 0) break;
    nameBytes.push(b);
  }
  const zName = String.fromCharCode(...nameBytes);

  if (zName === 'POLICE & FIRE' || zName === 'POLICE&FIRE' || zName.includes('POLICE')) {
    console.log(`\n${zName} zone: ${zChCount} channels`);
    const chIndices: number[] = [];
    for (let c = 0; c < zChCount; c++) {
      chIndices.push(view.getUint16(zPos + 2 + c * 2, true));
    }
    console.log(`  Channel indices: ${chIndices.join(', ')}`);
  }

  const nLen = nameBytes.length;
  const nameFieldSz = nLen + (nLen < 16 ? 1 : 0);
  zPos += 1 + 1 + chListSize + 4 + nameFieldSz;
}
