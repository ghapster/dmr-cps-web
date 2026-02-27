/**
 * Round-trip test: parse .RDT → serialize → binary diff
 * Run: npx tsx test-roundtrip.ts
 */
import { readFileSync, writeFileSync } from 'fs';

// We can't directly import browser-targeting TS with DOM types,
// so we'll inline the parsing logic for testing.

const RDT_PATH = 'C:\\Users\\CO-OP\\DMR RADIO PROJECT\\DMR Radio FEQ List.rdt';

const original = readFileSync(RDT_PATH);
const buffer = original.buffer.slice(original.byteOffset, original.byteOffset + original.byteLength);
const view = new DataView(buffer);

console.log(`\nFile: ${RDT_PATH}`);
console.log(`Size: ${original.length} bytes`);
console.log('─'.repeat(60));

// ─── Parse Header ──────────────────────────────────────────────────────────
const version = String.fromCharCode(...Array.from({length: 5}, (_, i) => view.getUint8(i)));
const payloadSize = view.getUint32(5, true);
const modelBytes: number[] = [];
for (let i = 0; i < 7; i++) { const b = view.getUint8(9 + i); if (b === 0) break; modelBytes.push(b); }
const modelName = String.fromCharCode(...modelBytes);
const cpsVersion = String.fromCharCode(...Array.from({length: 4}, (_, i) => view.getUint8(19 + i)));

console.log(`\nHEADER:`);
console.log(`  Version:      ${version}`);
console.log(`  Payload Size: ${payloadSize} (expected ${original.length - 14})`);
console.log(`  Model:        ${modelName}`);
console.log(`  CPS Version:  ${cpsVersion}`);

// ─── Settings Block ────────────────────────────────────────────────────────
const HEADER_SIZE = 23;
const SETTINGS_SIZE = 445;
const channelCountOffset = HEADER_SIZE + SETTINGS_SIZE;

console.log(`\nSETTINGS BLOCK:`);
console.log(`  Offset: ${HEADER_SIZE} - ${channelCountOffset - 1} (${SETTINGS_SIZE} bytes)`);

// ─── Helpers ───────────────────────────────────────────────────────────────
function readName(offset: number): { name: string; nameLen: number } {
  const bytes: number[] = [];
  for (let i = 0; i < 16; i++) {
    if (offset + i >= view.byteLength) break;
    const b = view.getUint8(offset + i);
    if (b === 0) break;
    bytes.push(b);
  }
  return { name: String.fromCharCode(...bytes), nameLen: bytes.length };
}

function nameFieldSize(nameLen: number): number {
  return nameLen + (nameLen < 16 ? 1 : 0);
}

function readUint24LE(offset: number): number {
  return view.getUint8(offset) | (view.getUint8(offset + 1) << 8) | (view.getUint8(offset + 2) << 16);
}

// ─── Parse Channels ────────────────────────────────────────────────────────
let pos = channelCountOffset;
const channelCount = view.getUint16(pos, true);
pos += 2;

console.log(`\nCHANNELS: ${channelCount}`);

const channels: { index: number; name: string; rx: number; tx: number; mode: string; rawSize: number }[] = [];
for (let i = 0; i < channelCount; i++) {
  const index = view.getUint16(pos + 0x00, true);
  const rxRaw = view.getUint32(pos + 0x02, true);
  const rx = rxRaw / 100000;

  const repMode = view.getUint8(pos + 0x06);
  const txOffRaw = view.getUint32(pos + 0x07, true);
  const txOff = txOffRaw / 100000;

  let tx: number;
  if (repMode === 1) tx = rx + txOff;
  else if (repMode === 2) tx = rx - txOff;
  else tx = rx;

  const mode = view.getUint8(pos + 0x0B) === 1 ? 'DMR' : 'FM';
  const { name, nameLen } = readName(pos + 0x30);
  const recordSize = 0x30 + nameFieldSize(nameLen) + 0x1A;

  channels.push({ index, name, rx, tx, mode, rawSize: recordSize });
  pos += recordSize;
}

// Print first 10 and last 5
console.log(`  ${'#'.padEnd(5)} ${'Name'.padEnd(18)} ${'RX'.padEnd(12)} ${'TX'.padEnd(12)} Mode`);
console.log(`  ${'─'.repeat(5)} ${'─'.repeat(18)} ${'─'.repeat(12)} ${'─'.repeat(12)} ${'─'.repeat(4)}`);
for (const ch of channels.slice(0, 10)) {
  console.log(`  ${String(ch.index).padEnd(5)} ${ch.name.padEnd(18)} ${ch.rx.toFixed(5).padEnd(12)} ${ch.tx.toFixed(5).padEnd(12)} ${ch.mode}`);
}
if (channels.length > 15) console.log(`  ... (${channels.length - 15} more) ...`);
for (const ch of channels.slice(-5)) {
  console.log(`  ${String(ch.index).padEnd(5)} ${ch.name.padEnd(18)} ${ch.rx.toFixed(5).padEnd(12)} ${ch.tx.toFixed(5).padEnd(12)} ${ch.mode}`);
}

// ─── Parse Radio IDs ───────────────────────────────────────────────────────
const radioIdCount = view.getUint8(pos);
pos += 1;

console.log(`\nRADIO IDs: ${radioIdCount}`);
for (let i = 0; i < radioIdCount; i++) {
  const idx = view.getUint8(pos);
  const dmrId = readUint24LE(pos + 1);
  const { name, nameLen } = readName(pos + 4);
  const recSize = 1 + 3 + nameFieldSize(nameLen);
  console.log(`  [${idx}] ${dmrId} — ${name}`);
  pos += recSize;
}

// ─── Parse Zones ───────────────────────────────────────────────────────────
const zoneCount = view.getUint8(pos);
pos += 1;

console.log(`\nZONES: ${zoneCount}`);
for (let i = 0; i < zoneCount; i++) {
  const idx = view.getUint8(pos);
  const chCount = view.getUint8(pos + 1);
  const chListSize = chCount * 2;
  const padOffset = pos + 2 + chListSize;
  const { name, nameLen } = readName(padOffset + 4);
  const recSize = 1 + 1 + chListSize + 4 + nameFieldSize(nameLen);
  console.log(`  [${idx}] ${name} — ${chCount} channels`);
  pos += recSize;
}

// ─── Parse Scan Lists (CORRECTED FORMAT) ───────────────────────────────────
const scanListCount = view.getUint8(pos);
pos += 1;

console.log(`\nSCAN LISTS: ${scanListCount}`);
const scanListRecordSizes: number[] = [];
for (let i = 0; i < scanListCount; i++) {
  const idx = view.getUint8(pos);
  const { name, nameLen } = readName(pos + 1);
  const nameTotalBytes = nameFieldSize(nameLen);
  // 7 settings + 4 timing + 1 count byte
  const settingsOffset = pos + 1 + nameTotalBytes;
  const timingOffset = settingsOffset + 7;
  const chCount = view.getUint8(timingOffset + 4);
  const entriesSize = chCount * 3; // flag(1) + uint16_le(2) per entry
  const recSize = 1 + nameTotalBytes + 7 + 4 + 1 + entriesSize;
  console.log(`  [${idx}] ${name} — ${chCount} channels`);
  scanListRecordSizes.push(recSize);
  pos += recSize;
}

// ─── Parse DTMF Contacts ───────────────────────────────────────────────────
const dtmfContactCount = view.getUint8(pos);
pos += 1;

console.log(`\nDTMF CONTACTS: ${dtmfContactCount}`);
const dtmfRecordSizes: number[] = [];
for (let i = 0; i < dtmfContactCount; i++) {
  const idx = view.getUint8(pos);
  const codeLen = view.getUint8(pos + 1);
  const code = String.fromCharCode(...Array.from({length: codeLen}, (_, j) => view.getUint8(pos + 2 + j)));
  const { name, nameLen } = readName(pos + 2 + codeLen);
  const recSize = 1 + 1 + codeLen + nameFieldSize(nameLen);
  console.log(`  [${idx}] Code="${code}" Name="${name}"`);
  dtmfRecordSizes.push(recSize);
  pos += recSize;
}

// ─── Trailing bytes ────────────────────────────────────────────────────────
const trailingLen = original.length - pos;
console.log(`\nTRAILING: ${trailingLen} bytes (offset ${pos})`);

// ─── Total coverage ────────────────────────────────────────────────────────
console.log(`\nPARSE COVERAGE: ${pos} of ${original.length} bytes parsed (${trailingLen} trailing)`);

// ─── Round-trip test ───────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(60));
console.log('ROUND-TRIP TEST');
console.log('═'.repeat(60));

// Re-parse from the beginning and rebuild
// Rebuild by concatenating all sections
const outputParts: Uint8Array[] = [];

// Header
outputParts.push(new Uint8Array(buffer, 0, HEADER_SIZE));

// Settings block
outputParts.push(new Uint8Array(buffer, HEADER_SIZE, SETTINGS_SIZE));

// Channel count
const chCountBuf = new Uint8Array(2);
new DataView(chCountBuf.buffer).setUint16(0, channelCount, true);
outputParts.push(chCountBuf);

// Channel records - we need to track offsets again
let rPos = channelCountOffset + 2;
for (let i = 0; i < channelCount; i++) {
  const { nameLen } = readName(rPos + 0x30);
  const recordSize = 0x30 + nameFieldSize(nameLen) + 0x1A;
  outputParts.push(new Uint8Array(buffer, rPos, recordSize));
  rPos += recordSize;
}

// Radio ID count + records
const ridCountPos = rPos;
outputParts.push(new Uint8Array(buffer, rPos, 1));
rPos += 1;
for (let i = 0; i < radioIdCount; i++) {
  const { nameLen } = readName(rPos + 4);
  const recSize = 1 + 3 + nameFieldSize(nameLen);
  outputParts.push(new Uint8Array(buffer, rPos, recSize));
  rPos += recSize;
}

// Zone count + records
outputParts.push(new Uint8Array(buffer, rPos, 1));
rPos += 1;
for (let i = 0; i < zoneCount; i++) {
  const chCount = view.getUint8(rPos + 1);
  const chListSize = chCount * 2;
  const padOff = rPos + 2 + chListSize;
  const { nameLen } = readName(padOff + 4);
  const recSize = 1 + 1 + chListSize + 4 + nameFieldSize(nameLen);
  outputParts.push(new Uint8Array(buffer, rPos, recSize));
  rPos += recSize;
}

// Scan list count + records (CORRECTED FORMAT)
outputParts.push(new Uint8Array(buffer, rPos, 1));
rPos += 1;
for (let i = 0; i < scanListCount; i++) {
  outputParts.push(new Uint8Array(buffer, rPos, scanListRecordSizes[i]));
  rPos += scanListRecordSizes[i];
}

// DTMF contact count + records
outputParts.push(new Uint8Array(buffer, rPos, 1));
rPos += 1;
for (let i = 0; i < dtmfContactCount; i++) {
  outputParts.push(new Uint8Array(buffer, rPos, dtmfRecordSizes[i]));
  rPos += dtmfRecordSizes[i];
}

// Trailing
if (rPos < original.length) {
  outputParts.push(new Uint8Array(buffer, rPos, original.length - rPos));
}

// Combine and compare
const totalLen = outputParts.reduce((s, p) => s + p.length, 0);
const output = new Uint8Array(totalLen);
let offset = 0;
for (const part of outputParts) {
  output.set(part, offset);
  offset += part.length;
}

console.log(`\nOriginal: ${original.length} bytes`);
console.log(`Rebuilt:  ${output.length} bytes`);

if (original.length !== output.length) {
  console.log(`\n*** SIZE MISMATCH: ${original.length} vs ${output.length} ***`);
} else {
  let diffs = 0;
  const firstDiffs: string[] = [];
  for (let i = 0; i < original.length; i++) {
    if (original[i] !== output[i]) {
      diffs++;
      if (firstDiffs.length < 10) {
        firstDiffs.push(`  offset 0x${i.toString(16).padStart(4, '0')}: original=0x${original[i].toString(16).padStart(2, '0')} rebuilt=0x${output[i].toString(16).padStart(2, '0')}`);
      }
    }
  }

  if (diffs === 0) {
    console.log(`\n*** PERFECT ROUND-TRIP: 0 bytes differ ***`);
  } else {
    console.log(`\n*** ROUND-TRIP FAILED: ${diffs} bytes differ ***`);
    console.log('First differences:');
    firstDiffs.forEach(d => console.log(d));
  }
}

console.log('');
