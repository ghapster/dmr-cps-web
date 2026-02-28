/**
 * Map all remaining sections from after digital contacts (0x370F) to end of file.
 * Run: npx tsx analyze-remaining.ts
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

function findStrings(start: number, end: number, minLen = 3) {
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

// Digital contacts section: 0x34A3 + 2 (uint16_le size) + 618 bytes = 0x370F
// So the next section starts at 0x370F
const NEXT_START = 0x370F;

console.log('═══ POST-DIGITAL-CONTACTS SECTION MAPPING ═══');
console.log(`Starting at 0x${NEXT_START.toString(16)} (${NEXT_START})`);
console.log(`File ends at 0x${FILE_SIZE.toString(16)} (${FILE_SIZE})`);
console.log(`Remaining: ${FILE_SIZE - NEXT_START} bytes\n`);

// Dump first 128 bytes of remaining
hexDump(NEXT_START, 128, 'First 128 bytes after digital contacts:');

// Find all strings in remaining
console.log('\n═══ ALL STRINGS IN REMAINING BYTES ═══');
const strs = findStrings(NEXT_START, FILE_SIZE, 3);
for (const s of strs) {
  console.log(`  0x${s.offset.toString(16).padStart(5, '0')}: "${s.text}"`);
}

// Now let's try to parse section by section
let pos = NEXT_START;

// The first bytes at 0x370F are: 01 00 00 00 35 00 00 05 00 48 65 6c 6c 6f 21 00
// Let me see if this is a section with uint16_le size like digital contacts
const sz1 = view.getUint16(pos, true);
console.log(`\n\nAt 0x${pos.toString(16)}: uint16_le = ${sz1} (0x${sz1.toString(16)})`);

// Let's try: maybe there's a byte or small header, then text messages
// Try: count(1)=0x01? then something?
// Or try: the section before text messages

// Actually let me try to identify text messages directly
console.log('\n═══ TEXT MESSAGE LOCATIONS ═══');
const knownMsgs = ['Hello!', 'Welcome!', 'Thank you!', 'Good bye!', 'Happy every day!'];
for (const msg of knownMsgs) {
  for (let i = NEXT_START; i < FILE_SIZE - msg.length; i++) {
    let match = true;
    for (let j = 0; j < msg.length; j++) {
      if (original[i + j] !== msg.charCodeAt(j)) { match = false; break; }
    }
    if (match) {
      const prev8 = Array.from(original.slice(Math.max(0, i - 8), i)).map(b => b.toString(16).padStart(2, '0')).join(' ');
      const after8 = Array.from(original.slice(i + msg.length, i + msg.length + 8)).map(b => b.toString(16).padStart(2, '0')).join(' ');
      console.log(`  "${msg}" at 0x${i.toString(16)} (prev: ${prev8}) (after: ${after8})`);
    }
  }
}

// Now dump the region right before "Hello!"
console.log('\n═══ DETAILED: TEXT MESSAGE SECTION ═══');
hexDump(0x370F, 0x3770 - 0x370F, 'From 0x370F through text messages:');

// Parse text messages
// It looks like: header bytes, then for each message: length(1)? + index? + text + null
// Let me analyze the bytes between/around messages
console.log('\nByte-by-byte around "Hello!":');
for (let i = 0x3714; i < 0x3722; i++) {
  const b = original[i];
  const ch = (b >= 0x20 && b < 0x7f) ? `'${String.fromCharCode(b)}'` : '';
  console.log(`  0x${i.toString(16)}: 0x${b.toString(16).padStart(2, '0')} = ${b} ${ch}`);
}

// After last text message, identify what comes next
// Find "Happy every day!"
let happyEnd = 0;
for (let i = NEXT_START; i < FILE_SIZE - 16; i++) {
  if (original[i] === 0x48 && original[i+1] === 0x61 && original[i+2] === 0x70 &&
      original[i+3] === 0x70 && original[i+4] === 0x79) {
    happyEnd = i + 16; // "Happy every day!" = 16 chars
    // Look for null terminator
    while (happyEnd < FILE_SIZE && original[happyEnd] !== 0) happyEnd++;
    happyEnd++; // include the null
    break;
  }
}

if (happyEnd > 0) {
  console.log(`\nText messages end at: 0x${happyEnd.toString(16)}`);
  hexDump(happyEnd, 128, 'After text messages:');
}

// Now find "Group List 1"
console.log('\n═══ GROUP LIST SECTION ═══');
for (let i = NEXT_START; i < FILE_SIZE - 12; i++) {
  if (original[i] === 0x47 && original[i+1] === 0x72 && original[i+2] === 0x6f &&
      original[i+3] === 0x75 && original[i+4] === 0x70) {
    const { name } = readName(i, 32);
    const prev16 = Array.from(original.slice(Math.max(0, i - 16), i)).map(b => b.toString(16).padStart(2, '0')).join(' ');
    console.log(`  "${name}" at 0x${i.toString(16)} (prev16: ${prev16})`);
    hexDump(i - 16, 64, `  Context around "${name}":`);
  }
}

// Find APRS section - look for callsign patterns (letters/numbers followed by dash and number)
console.log('\n═══ APRS SECTION ═══');
for (const callsign of ['KB1CAD', 'WIDE1', 'WIDE2', 'APD578']) {
  for (let i = NEXT_START; i < FILE_SIZE - callsign.length; i++) {
    let match = true;
    for (let j = 0; j < callsign.length; j++) {
      if (original[i + j] !== callsign.charCodeAt(j)) { match = false; break; }
    }
    if (match) {
      console.log(`  "${callsign}" at 0x${i.toString(16)}`);
      hexDump(i - 8, 48, `  Context:`);
    }
  }
}

// Find roaming section
console.log('\n═══ ROAMING SECTION ═══');
for (const name of ['Roaming CH', 'ROAM ZONE']) {
  for (let i = NEXT_START; i < FILE_SIZE - name.length; i++) {
    let match = true;
    for (let j = 0; j < name.length; j++) {
      if (original[i + j] !== name.charCodeAt(j)) { match = false; break; }
    }
    if (match) {
      const full = readName(i, 32);
      console.log(`  "${full.name}" at 0x${i.toString(16)}`);
      hexDump(i - 16, 64, `  Context:`);
    }
  }
}

// Find footer
console.log('\n═══ FILE FOOTER ═══');
for (let i = FILE_SIZE - 20; i < FILE_SIZE - 4; i++) {
  if (original[i] === 0x56 && original[i+1] === 0x31 && original[i+2] === 0x30) { // "V10"
    const { name } = readName(i, 10);
    console.log(`  "${name}" at 0x${i.toString(16)}`);
    hexDump(i - 16, 32, '  Footer context:');
  }
}

// Zero runs between sections
console.log('\n═══ ZERO RUNS IN REMAINING BYTES ═══');
let zeroStart = -1;
for (let i = NEXT_START; i < FILE_SIZE; i++) {
  if (original[i] === 0) {
    if (zeroStart === -1) zeroStart = i;
  } else {
    if (zeroStart !== -1 && i - zeroStart >= 16) {
      console.log(`  0x${zeroStart.toString(16).padStart(5, '0')} - 0x${(i-1).toString(16).padStart(5, '0')}: ${i - zeroStart} zero bytes`);
    }
    zeroStart = -1;
  }
}
if (zeroStart !== -1 && FILE_SIZE - zeroStart >= 16) {
  console.log(`  0x${zeroStart.toString(16).padStart(5, '0')} - 0x${(FILE_SIZE-1).toString(16).padStart(5, '0')}: ${FILE_SIZE - zeroStart} zero bytes`);
}

// Non-zero data islands between zero runs
console.log('\n═══ NON-ZERO DATA ISLANDS ═══');
let dataStart = -1;
let inZero = false;
for (let i = NEXT_START; i < FILE_SIZE; i++) {
  if (original[i] === 0) {
    if (!inZero && dataStart !== -1) {
      // Check if there are enough zeros ahead to be a "gap"
      let zeroCount = 0;
      for (let j = i; j < Math.min(i + 16, FILE_SIZE); j++) {
        if (original[j] === 0) zeroCount++;
        else break;
      }
      if (zeroCount >= 8) {
        console.log(`  0x${dataStart.toString(16).padStart(5, '0')} - 0x${(i-1).toString(16).padStart(5, '0')}: ${i - dataStart} bytes of data`);
        const snippet = findStrings(dataStart, i, 3);
        if (snippet.length > 0) {
          console.log(`    Strings: ${snippet.map(s => `"${s.text}"`).join(', ')}`);
        }
        dataStart = -1;
        inZero = true;
      }
    }
  } else {
    if (inZero || dataStart === -1) {
      dataStart = i;
      inZero = false;
    }
  }
}
if (dataStart !== -1 && !inZero) {
  console.log(`  0x${dataStart.toString(16).padStart(5, '0')} - 0x${(FILE_SIZE-1).toString(16).padStart(5, '0')}: ${FILE_SIZE - dataStart} bytes of data`);
}

// Dump the area between text messages and APRS
console.log('\n═══ BETWEEN TEXT MESSAGES AND APRS (0x3760-0x3870) ═══');
hexDump(0x3760, 0x3870 - 0x3760);

// Dump the end of file (last 128 bytes)
hexDump(FILE_SIZE - 128, 128, 'Last 128 bytes of file:');

// Summary section map
console.log('\n\n═══ REFINED SECTION MAP ═══');
console.log(`File size: ${FILE_SIZE} bytes (0x${FILE_SIZE.toString(16)})`);
