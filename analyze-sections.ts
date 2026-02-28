/**
 * Deep analysis of the trailing bytes — decode each section.
 * Run: npx tsx analyze-sections.ts
 */
import { readFileSync } from 'fs';

const RDT_PATH = 'C:\\Users\\CO-OP\\DMR RADIO PROJECT\\DMR Radio FEQ List.rdt';
const original = readFileSync(RDT_PATH);
const buf = original.buffer.slice(original.byteOffset, original.byteOffset + original.byteLength);
const view = new DataView(buf);
const FILE_SIZE = original.length;

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

function nameFieldSize(len: number): number {
  return len + (len < 16 ? 1 : 0);
}

function hexBytes(start: number, len: number): string {
  return Array.from(original.slice(start, start + len)).map(b => b.toString(16).padStart(2, '0')).join(' ');
}

function hexDump(start: number, len: number, label?: string) {
  if (label) console.log(`\n${label}`);
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
      }
    }
    console.log(`  ${offset}  ${hex.slice(0, 8).join(' ')}  ${hex.slice(8).join(' ')}  |${ascii}|`);
  }
}

// ─── First, let's carefully re-parse scan lists to see if our format is right ──

// Re-parse from channel count to verify where scan lists really end
const HEADER_SIZE = 23;
const SETTINGS_SIZE = 445;
let pos = HEADER_SIZE + SETTINGS_SIZE;

// Skip channels
const channelCount = view.getUint16(pos, true);
pos += 2;
for (let i = 0; i < channelCount; i++) {
  const { len: nameLen } = readName(pos + 0x30);
  pos += 0x30 + nameFieldSize(nameLen) + 0x1A;
}
console.log(`After channels: offset 0x${pos.toString(16)} (${pos})`);

// Skip radio IDs
const radioIdCount = view.getUint8(pos);
pos += 1;
for (let i = 0; i < radioIdCount; i++) {
  const { len: nameLen } = readName(pos + 4);
  pos += 1 + 3 + nameFieldSize(nameLen);
}
console.log(`After radio IDs: offset 0x${pos.toString(16)} (${pos})`);

// Skip zones
const zoneCount = view.getUint8(pos);
pos += 1;
for (let i = 0; i < zoneCount; i++) {
  const chCount = view.getUint8(pos + 1);
  const { len: nameLen } = readName(pos + 2 + chCount * 2 + 4);
  pos += 1 + 1 + chCount * 2 + 4 + nameFieldSize(nameLen);
}
console.log(`After zones: offset 0x${pos.toString(16)} (${pos})`);

// ─── Now carefully parse scan lists ──────────────────────────────────────────
const scanListStart = pos;
const scanListCount = view.getUint8(pos);
pos += 1;
console.log(`\n${'═'.repeat(70)}`);
console.log(`SCAN LIST SECTION at 0x${scanListStart.toString(16)}`);
console.log(`Count byte: ${scanListCount}`);

for (let i = 0; i < scanListCount; i++) {
  const recStart = pos;
  const idx = view.getUint8(pos);
  const { name, len: nameLen } = readName(pos + 1);
  const nameTotalBytes = nameFieldSize(nameLen);
  const headerOffset = pos + 1 + nameTotalBytes;

  // Read the 14-byte header
  const headerBytes = hexBytes(headerOffset, 0x0E);
  const chCount = view.getUint8(headerOffset + 0x0B);
  const recSize = 1 + nameTotalBytes + 0x0E + chCount * 2;

  console.log(`\n  Scan List ${i}: idx=${idx}, name="${name}" (nameLen=${nameLen})`);
  console.log(`    Record start: 0x${recStart.toString(16)}, size=${recSize}`);
  console.log(`    Header (14 bytes): ${headerBytes}`);
  console.log(`    Channel count (at header+0x0B): ${chCount}`);

  if (chCount > 50) {
    console.log(`    *** SUSPICIOUS: ${chCount} channels seems too many! ***`);
    console.log(`    This is likely a misparse. Let me dump raw context:`);
    hexDump(recStart, Math.min(64, FILE_SIZE - recStart), `    Raw at 0x${recStart.toString(16)}:`);

    // Try alternate interpretation: maybe the scan list format is different
    // Let's see what comes after the header if we assume fewer channels
    console.log(`    --- Stopping scan list parse here ---`);
    break;
  }

  // Print channels
  const chIndices: number[] = [];
  for (let c = 0; c < chCount; c++) {
    chIndices.push(view.getUint16(headerOffset + 0x0E + c * 2, true));
  }
  if (chCount > 0) {
    console.log(`    Channels: ${chIndices.join(', ')}`);
  }

  pos += recSize;
}

console.log(`\nScan list parsing ended at: 0x${pos.toString(16)} (${pos})`);

// ─── Now look at what's AFTER the scan lists ─────────────────────────────────
console.log(`\n${'═'.repeat(70)}`);
console.log(`POST-SCAN-LIST DATA`);

// Check if there's a recognizable section start
const postScanPos = pos;
hexDump(postScanPos, 128, `Raw data at 0x${postScanPos.toString(16)}:`);

// Try reading as analog contact count + DTMF contacts
const acCount = view.getUint8(postScanPos);
console.log(`\nByte at 0x${postScanPos.toString(16)}: ${acCount} (analog contact count?)`);

// Skip analog contacts (count=0)
pos = postScanPos + 1;

// Now what's here?
console.log(`\n${'═'.repeat(70)}`);
console.log(`TRAILING SECTIONS STARTING AT 0x${pos.toString(16)} (${pos})`);

// ─── DTMF Contact at 0x3494 ─────────────────────────────────────────────────
hexDump(pos, 48, `Section 1: Possible DTMF contacts`);

// Try: 1 byte = DTMF code length, N bytes = code, then name
let dtmfPos = pos;
const dtmfCodeLen = view.getUint8(dtmfPos);
console.log(`  DTMF code length: ${dtmfCodeLen}`);
if (dtmfCodeLen > 0 && dtmfCodeLen <= 16) {
  const codeBytes: number[] = [];
  for (let i = 0; i < dtmfCodeLen; i++) codeBytes.push(view.getUint8(dtmfPos + 1 + i));
  const code = String.fromCharCode(...codeBytes);
  const { name: dtmfName, len: dtmfNameLen } = readName(dtmfPos + 1 + dtmfCodeLen);
  console.log(`  DTMF code: "${code}"`);
  console.log(`  DTMF name: "${dtmfName}"`);
  dtmfPos += 1 + dtmfCodeLen + nameFieldSize(dtmfNameLen);
  console.log(`  Next position: 0x${dtmfPos.toString(16)}`);
}

// ─── Now try to decode the big block of structured data ──────────────────────
console.log(`\n${'═'.repeat(70)}`);
console.log(`DIGITAL CONTACTS SECTION? Starting at 0x${dtmfPos.toString(16)}`);
hexDump(dtmfPos, 16, `Count/header bytes?`);

// Try: first 2 bytes as uint16_le count
const dcCount16 = view.getUint16(dtmfPos, true);
// Try: first byte as count
const dcCount8 = view.getUint8(dtmfPos);
console.log(`  As uint8 count: ${dcCount8}`);
console.log(`  As uint16_le count: ${dcCount16}`);

// Let me try to find fixed-size records by looking for repeating index patterns
console.log(`\n${'═'.repeat(70)}`);
console.log(`LOOKING FOR FIXED-SIZE RECORD PATTERNS`);

// Scan for sequential uint16_le values 1,2,3...
for (let stride = 16; stride <= 32; stride++) {
  let startOff = dtmfPos;
  // Try different starting offsets
  for (let skip = 0; skip < 8; skip++) {
    const testOff = startOff + skip;
    let matchCount = 0;
    for (let idx = 1; idx <= 30; idx++) {
      const off = testOff + (idx - 1) * stride;
      if (off + 2 > FILE_SIZE) break;
      const val = view.getUint16(off, true);
      if (val === idx) matchCount++;
    }
    if (matchCount >= 5) {
      console.log(`  stride=${stride}, skip=${skip}: ${matchCount} sequential indices found starting at 0x${testOff.toString(16)}`);
      // Show first few records
      for (let idx = 1; idx <= Math.min(5, matchCount); idx++) {
        const off = testOff + (idx - 1) * stride;
        console.log(`    [${idx}] at 0x${off.toString(16)}: ${hexBytes(off, stride)}`);
      }
    }
  }
}

// Also try uint8 index pattern (0, 1, 2, ...)
for (let stride = 16; stride <= 32; stride++) {
  let startOff = dtmfPos;
  for (let skip = 0; skip < 8; skip++) {
    const testOff = startOff + skip;
    let matchCount = 0;
    for (let idx = 0; idx <= 30; idx++) {
      const off = testOff + idx * stride;
      if (off + 1 > FILE_SIZE) break;
      const val = view.getUint8(off);
      if (val === idx) matchCount++;
    }
    if (matchCount >= 5) {
      console.log(`  uint8 stride=${stride}, skip=${skip}: ${matchCount} sequential indices (0-based) starting at 0x${testOff.toString(16)}`);
      for (let idx = 0; idx <= Math.min(4, matchCount - 1); idx++) {
        const off = testOff + idx * stride;
        console.log(`    [${idx}] at 0x${off.toString(16)}: ${hexBytes(off, stride)}`);
      }
    }
  }
}

// ─── Try variable-size records: look for index + type/flags + data ──────────
console.log(`\n${'═'.repeat(70)}`);
console.log(`VARIABLE-SIZE RECORD SCAN (index uint16_le + 0x00 + 0x10 pattern)`);

// I noticed patterns like "XX 00 10" or "XX 00 00" in the data
// Let me search for index patterns: uint16_le index followed by specific bytes
let p = dtmfPos;
const endSearch = Math.min(dtmfPos + 2000, FILE_SIZE);
console.log(`Searching from 0x${p.toString(16)} to 0x${endSearch.toString(16)}`);

// Find all positions where we see sequential uint16_le values
const indexPositions: { offset: number; index: number }[] = [];
for (let off = dtmfPos; off < endSearch - 4; off++) {
  const val = view.getUint16(off, true);
  if (val >= 1 && val <= 40) {
    // Check if next byte looks like a type flag (0x00 = group call, 0x01 = private, 0x10 = all call?)
    const nextByte = view.getUint8(off + 2);
    const nextByte2 = view.getUint8(off + 3);
    if ((nextByte === 0x00 || nextByte === 0x10) && nextByte2 !== 0xFF) {
      indexPositions.push({ offset: off, index: val });
    }
  }
}

// Find runs of sequential indices
let prevIdx = -1;
let runStart = -1;
let runPositions: { offset: number; index: number }[] = [];
for (const ip of indexPositions) {
  if (ip.index === prevIdx + 1 && runPositions.length > 0) {
    runPositions.push(ip);
    const spacing = ip.offset - runPositions[runPositions.length - 2].offset;
    if (runPositions.length === 2) {
      // First pair — record the spacing
    } else {
      // Check if spacing is consistent
      const firstSpacing = runPositions[1].offset - runPositions[0].offset;
      if (Math.abs(spacing - firstSpacing) > 2) {
        // Inconsistent spacing — restart
        runPositions = [ip];
      }
    }
  } else {
    if (runPositions.length >= 4) {
      const spacing = runPositions[1].offset - runPositions[0].offset;
      console.log(`  Run of ${runPositions.length} sequential indices starting at 0x${runPositions[0].offset.toString(16)}, spacing=${spacing}`);
      for (const rp of runPositions.slice(0, 5)) {
        console.log(`    idx=${rp.index} at 0x${rp.offset.toString(16)}: ${hexBytes(rp.offset, Math.min(spacing, 24))}`);
      }
    }
    runPositions = [ip];
  }
  prevIdx = ip.index;
}
if (runPositions.length >= 4) {
  const spacing = runPositions[1].offset - runPositions[0].offset;
  console.log(`  Run of ${runPositions.length} sequential indices starting at 0x${runPositions[0].offset.toString(16)}, spacing=${spacing}`);
  for (const rp of runPositions.slice(0, 5)) {
    console.log(`    idx=${rp.index} at 0x${rp.offset.toString(16)}: ${hexBytes(rp.offset, Math.min(spacing, 24))}`);
  }
}

// ─── Known sections: text messages, APRS, roaming ──────────────────────────
console.log(`\n${'═'.repeat(70)}`);
console.log(`KNOWN SECTION: TEXT MESSAGES`);
// Find "Hello!" and work backwards to find the section start
const helloOffset = 0x3719;
hexDump(helloOffset - 16, 128, `Text messages area (starting 16 bytes before "Hello!"):`);

// The messages seem to be null-terminated strings with some length/header bytes
// Let me decode them
const msgArea = helloOffset - 2; // Look for count or length
console.log(`\n  Possible message count at 0x${(msgArea).toString(16)}: ${view.getUint8(msgArea)}`);
console.log(`  Possible message count at 0x${(msgArea-1).toString(16)}: ${view.getUint8(msgArea-1)}`);

// Read sequential null-terminated strings
let msgPos = helloOffset;
const messages: string[] = [];
for (let i = 0; i < 10; i++) {
  const { name: msg, len: msgLen } = readName(msgPos, 64);
  if (msgLen === 0) break;
  messages.push(msg);
  msgPos += msgLen + 1; // + null terminator
}
console.log(`\n  Messages found:`);
messages.forEach((m, i) => console.log(`    [${i}] "${m}"`));

console.log(`\n${'═'.repeat(70)}`);
console.log(`KNOWN SECTION: APRS`);
hexDump(0x385C, 128, `APRS settings area:`);

console.log(`\n${'═'.repeat(70)}`);
console.log(`KNOWN SECTION: ROAMING`);
hexDump(0x38CE, 128, `Roaming channels/zones area:`);

// ─── Decode roaming channels ────────────────────────────────────────────────
console.log(`\nDecoding roaming channels:`);
let roamPos = 0x38CE;
for (let i = 0; i < 4; i++) {
  const { name: rName, len: rLen } = readName(roamPos);
  console.log(`  [${i}] "${rName}" at 0x${roamPos.toString(16)}, len=${rLen}`);
  hexDump(roamPos, nameFieldSize(rLen) + 16, `    Full record:`);
  roamPos += nameFieldSize(rLen);
  // Check for additional data after name
  console.log(`    Next bytes: ${hexBytes(roamPos, 12)}`);
  // Try to figure out the record size
}

// ─── Last section: file footer ──────────────────────────────────────────────
console.log(`\n${'═'.repeat(70)}`);
console.log(`FILE FOOTER`);
hexDump(FILE_SIZE - 48, 48, `Last 48 bytes of file:`);

// Check for version string at the end
const { name: footerVersion } = readName(FILE_SIZE - 5, 5);
console.log(`\nFooter version string: "${footerVersion}"`);

// ─── Summary: map all non-zero regions ──────────────────────────────────────
console.log(`\n${'═'.repeat(70)}`);
console.log(`NON-ZERO REGION MAP (trailing bytes only)`);

const TRAIL_START = 13460;
let regionStart = -1;
for (let i = TRAIL_START; i <= FILE_SIZE; i++) {
  const isZero = i === FILE_SIZE || original[i] === 0;
  const wasZero = i === TRAIL_START || (regionStart === -1);

  if (!isZero && regionStart === -1) {
    regionStart = i;
  } else if (isZero && regionStart !== -1) {
    // Check if this is a short zero gap (< 4 bytes) within a region
    let gapLen = 0;
    for (let j = i; j < FILE_SIZE && original[j] === 0; j++) gapLen++;
    if (gapLen < 4 && i + gapLen < FILE_SIZE) {
      // Skip short zero gaps — they're within records
      continue;
    }
    const len = i - regionStart;
    console.log(`  0x${regionStart.toString(16).padStart(5, '0')} - 0x${(i-1).toString(16).padStart(5, '0')}: ${len} bytes of data`);
    regionStart = -1;
  }
}
