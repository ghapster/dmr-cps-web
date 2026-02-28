/**
 * Round-trip test: parse .RDT → serialize → binary diff
 * Run: npx tsx test-roundtrip.ts
 */
import { readFileSync } from 'fs';
import { parseRdt } from './src/lib/rdt-parser';
import { writeRdt } from './src/lib/rdt-writer';

const RDT_PATH = 'C:\\Users\\CO-OP\\DMR RADIO PROJECT\\DMR Radio FEQ List.rdt';

const original = readFileSync(RDT_PATH);
const buffer = original.buffer.slice(original.byteOffset, original.byteOffset + original.byteLength);

console.log(`\nFile: ${RDT_PATH}`);
console.log(`Size: ${original.length} bytes`);
console.log('─'.repeat(60));

// ─── Parse ────────────────────────────────────────────────────────────────
const codeplug = parseRdt(buffer);

console.log(`\nHEADER:`);
console.log(`  Version:      ${codeplug.header.version}`);
console.log(`  Model:        ${codeplug.header.modelName}`);
console.log(`  CPS Version:  ${codeplug.header.cpsVersion}`);

console.log(`\nSECTIONS:`);
console.log(`  Channels:          ${codeplug.channels.length}`);
console.log(`  Radio IDs:         ${codeplug.radioIds.length}`);
console.log(`  Zones:             ${codeplug.zones.length}`);
console.log(`  Scan Lists:        ${codeplug.scanLists.length}`);
console.log(`  Analog Contacts:   ${codeplug.analogContacts.length}`);
console.log(`  Digital Contacts:  ${codeplug.digitalContacts.length}`);
console.log(`  Text Messages:     ${codeplug.textMessages.length}`);
console.log(`  Group Lists:       ${codeplug.groupLists.length}`);
console.log(`  Roaming Channels:  ${codeplug.roamingChannels.length}`);
console.log(`  Roaming Zones:     ${codeplug.roamingZones.length}`);

console.log(`\nRAW SECTION SIZES:`);
console.log(`  _digitalContactsRaw:  ${codeplug._digitalContactsRaw.byteLength} bytes`);
console.log(`  _textMessageHeader:   ${codeplug._textMessageHeader.byteLength} bytes`);
console.log(`  _groupListsRaw:       ${codeplug._groupListsRaw.byteLength} bytes`);
console.log(`  _aprsRaw:             ${codeplug._aprsRaw.byteLength} bytes`);
console.log(`  _roamingRaw:          ${codeplug._roamingRaw.byteLength} bytes`);
console.log(`  _trailingBytes:       ${codeplug._trailingBytes.byteLength} bytes`);

// ─── Display parsed data ─────────────────────────────────────────────────

console.log(`\nDIGITAL CONTACTS:`);
for (const dc of codeplug.digitalContacts.slice(0, 5)) {
  console.log(`  [${dc.index}] ${dc.callType} TG/ID=${dc.dmrId} (${dc._raw.byteLength} bytes)`);
}
if (codeplug.digitalContacts.length > 5)
  console.log(`  ... (${codeplug.digitalContacts.length - 5} more)`);

console.log(`\nTEXT MESSAGES:`);
for (const msg of codeplug.textMessages) {
  console.log(`  [${msg.index}] "${msg.text}"`);
}

console.log(`\nGROUP LISTS:`);
for (const gl of codeplug.groupLists) {
  console.log(`  [${gl.index}] "${gl.name}" — ${gl.contactIndices.length} contacts: [${gl.contactIndices.slice(0, 10).join(', ')}${gl.contactIndices.length > 10 ? '...' : ''}]`);
}

console.log(`\nAPRS SETTINGS:`);
console.log(`  GPS Message:  "${codeplug.aprsSettings.gpsMessage}"`);
console.log(`  Destination:  "${codeplug.aprsSettings.destination}"`);
console.log(`  Callsign:     "${codeplug.aprsSettings.callsign}-${codeplug.aprsSettings.ssid}"`);
console.log(`  Paths:        ${JSON.stringify(codeplug.aprsSettings.paths)}`);
console.log(`  Comment:      "${codeplug.aprsSettings.comment}"`);

console.log(`\nROAMING CHANNELS:`);
for (const rc of codeplug.roamingChannels) {
  console.log(`  [${rc.index}] "${rc.name}" (${rc._raw.byteLength} bytes)`);
}

console.log(`\nROAMING ZONES:`);
for (const rz of codeplug.roamingZones) {
  console.log(`  [${rz.index}] "${rz.name}" — channels: [${rz.channelIndices.join(', ')}]`);
}

// ─── Round-trip test ───────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(60));
console.log('ROUND-TRIP TEST');
console.log('═'.repeat(60));

const rebuilt = writeRdt(codeplug);
const rebuiltBytes = new Uint8Array(rebuilt);

console.log(`\nOriginal: ${original.length} bytes`);
console.log(`Rebuilt:  ${rebuiltBytes.length} bytes`);

if (original.length !== rebuiltBytes.length) {
  console.log(`\n*** SIZE MISMATCH: ${original.length} vs ${rebuiltBytes.length} ***`);
} else {
  let diffs = 0;
  const firstDiffs: string[] = [];
  for (let i = 0; i < original.length; i++) {
    if (original[i] !== rebuiltBytes[i]) {
      diffs++;
      if (firstDiffs.length < 10) {
        firstDiffs.push(`  offset 0x${i.toString(16).padStart(4, '0')}: original=0x${original[i].toString(16).padStart(2, '0')} rebuilt=0x${rebuiltBytes[i].toString(16).padStart(2, '0')}`);
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
