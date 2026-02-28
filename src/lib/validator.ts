import type { Codeplug, ValidationIssue, Channel } from './types';

/**
 * Validate a full codeplug and return an array of issues found.
 * Issues are sorted by severity: errors first, then warnings, then info.
 */
export function validateCodeplug(codeplug: Codeplug): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  validateChannels(codeplug.channels, issues);
  validateZones(codeplug.zones, codeplug.channels, issues);
  validateScanLists(codeplug.scanLists, codeplug.channels, issues);
  validateRadioIds(codeplug.radioIds, issues);
  validateGroupLists(codeplug.groupLists, codeplug.digitalContacts, issues);
  validateRoamingZones(codeplug.roamingZones, codeplug.roamingChannels, issues);

  // Sort: errors first, then warnings, then info
  const severityOrder: Record<string, number> = { error: 0, warning: 1, info: 2 };
  issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return issues;
}

// ─── Frequency band definitions ──────────────────────────────────────────────

interface FrequencyBand {
  name: string;
  min: number;
  max: number;
}

const KNOWN_BANDS: FrequencyBand[] = [
  { name: 'VHF', min: 136, max: 174 },
  { name: '220 MHz', min: 222, max: 225 },
  { name: 'UHF', min: 400, max: 480 },
  { name: '900 MHz', min: 902, max: 928 },
];

function isInKnownBand(freq: number): boolean {
  return KNOWN_BANDS.some((b) => freq >= b.min && freq <= b.max);
}

// ─── Channel validation ─────────────────────────────────────────────────────

function validateChannels(channels: Channel[], issues: ValidationIssue[]): void {
  // Rule: Duplicate channel names
  const nameMap = new Map<string, number[]>();
  for (const ch of channels) {
    if (!ch.name || ch.name.trim() === '') continue;
    const key = ch.name.trim().toLowerCase();
    const existing = nameMap.get(key);
    if (existing) existing.push(ch.index);
    else nameMap.set(key, [ch.index]);
  }
  for (const [, indices] of nameMap) {
    if (indices.length > 1) {
      issues.push({
        severity: 'warning',
        message: `Duplicate channel name shared by channels: ${indices.join(', ')}`,
        section: 'channel',
      });
    }
  }

  for (const ch of channels) {
    // Rule: Empty channel name
    if (!ch.name || ch.name.trim() === '') {
      issues.push({
        severity: 'warning',
        message: `Channel ${ch.index} has an empty name`,
        section: 'channel',
        index: ch.index,
      });
    }

    // Rule: Zero RX or TX frequency
    if (ch.rxFrequency === 0) {
      issues.push({
        severity: 'warning',
        message: `Channel ${ch.index} "${ch.name}" has RX frequency 0`,
        section: 'channel',
        index: ch.index,
      });
    }
    if (ch.txFrequency === 0) {
      issues.push({
        severity: 'warning',
        message: `Channel ${ch.index} "${ch.name}" has TX frequency 0`,
        section: 'channel',
        index: ch.index,
      });
    }

    // Rule: Frequency band check (RX)
    if (ch.rxFrequency > 0 && !isInKnownBand(ch.rxFrequency)) {
      issues.push({
        severity: 'warning',
        message: `Channel ${ch.index} "${ch.name}" RX frequency ${ch.rxFrequency.toFixed(4)} MHz is outside known amateur/commercial bands`,
        section: 'channel',
        index: ch.index,
      });
    }

    // Rule: TX frequency outside known bands
    if (ch.txFrequency > 0 && !isInKnownBand(ch.txFrequency)) {
      issues.push({
        severity: 'warning',
        message: `Channel ${ch.index} "${ch.name}" TX frequency ${ch.txFrequency.toFixed(4)} MHz is outside known bands`,
        section: 'channel',
        index: ch.index,
      });
    }

    // Rule: Color code range (0-15)
    if (ch.colorCode < 0 || ch.colorCode > 15) {
      issues.push({
        severity: 'error',
        message: `Channel ${ch.index} "${ch.name}" has invalid color code ${ch.colorCode} (must be 0-15)`,
        section: 'channel',
        index: ch.index,
      });
    }

    // Rule: Time slot validation (must be 1 or 2)
    if (ch.timeSlot !== 1 && ch.timeSlot !== 2) {
      issues.push({
        severity: 'error',
        message: `Channel ${ch.index} "${ch.name}" has invalid time slot ${ch.timeSlot} (must be 1 or 2)`,
        section: 'channel',
        index: ch.index,
      });
    }

    // Rule: Analog channel with DMR-specific settings
    if (ch.mode === 'analog') {
      if (ch.colorCode !== 0) {
        issues.push({
          severity: 'warning',
          message: `Channel ${ch.index} "${ch.name}" is analog but has color code ${ch.colorCode} set (expected 0)`,
          section: 'channel',
          index: ch.index,
        });
      }
      if (ch.timeSlot !== 1) {
        issues.push({
          severity: 'warning',
          message: `Channel ${ch.index} "${ch.name}" is analog but has time slot ${ch.timeSlot} set`,
          section: 'channel',
          index: ch.index,
        });
      }
    }
  }
}

// ─── Zone validation ─────────────────────────────────────────────────────────

function validateZones(
  zones: import('./types').Zone[],
  channels: Channel[],
  issues: ValidationIssue[],
): void {
  const validChannelIndices = new Set(channels.map((ch) => ch.index));

  for (const zone of zones) {
    // Rule: Empty zones
    if (zone.channelIndices.length === 0) {
      issues.push({
        severity: 'warning',
        message: `Zone ${zone.index} "${zone.name}" contains no channels`,
        section: 'zone',
        index: zone.index,
      });
    }

    // Rule: Orphaned zone channel references
    for (const chIdx of zone.channelIndices) {
      if (!validChannelIndices.has(chIdx)) {
        issues.push({
          severity: 'error',
          message: `Zone ${zone.index} "${zone.name}" references channel index ${chIdx} which does not exist`,
          section: 'zone',
          index: zone.index,
        });
      }
    }
  }
}

// ─── Scan list validation ────────────────────────────────────────────────────

function validateScanLists(
  scanLists: import('./types').ScanList[],
  channels: Channel[],
  issues: ValidationIssue[],
): void {
  const validChannelIndices = new Set(channels.map((ch) => ch.index));

  for (const sl of scanLists) {
    // Rule: Empty scan lists
    if (sl.channelIndices.length === 0) {
      issues.push({
        severity: 'warning',
        message: `Scan list ${sl.index} "${sl.name}" contains no channels`,
        section: 'scanList',
        index: sl.index,
      });
    }

    // Rule: Orphaned scan list channel references
    for (const chIdx of sl.channelIndices) {
      if (!validChannelIndices.has(chIdx)) {
        issues.push({
          severity: 'error',
          message: `Scan list ${sl.index} "${sl.name}" references channel index ${chIdx} which does not exist`,
          section: 'scanList',
          index: sl.index,
        });
      }
    }
  }
}

// ─── Radio ID validation ────────────────────────────────────────────────────

function validateRadioIds(
  radioIds: import('./types').RadioId[],
  issues: ValidationIssue[],
): void {
  for (const rid of radioIds) {
    if (rid.dmrId === 0) {
      issues.push({
        severity: 'warning',
        message: `Radio ID ${rid.index} "${rid.name}" has DMR ID 0 (unset)`,
        section: 'general',
        index: rid.index,
      });
    } else if (rid.dmrId > 16776415) {
      issues.push({
        severity: 'warning',
        message: `Radio ID ${rid.index} "${rid.name}" has DMR ID ${rid.dmrId} which exceeds the 24-bit maximum (16776415)`,
        section: 'general',
        index: rid.index,
      });
    }
  }
}

// ─── Group list validation ──────────────────────────────────────────────────

function validateGroupLists(
  groupLists: import('./types').GroupList[],
  digitalContacts: import('./types').DigitalContact[],
  issues: ValidationIssue[],
): void {
  const validContactIndices = new Set(digitalContacts.map((dc) => dc.index));

  for (const gl of groupLists) {
    // Rule: Empty group lists
    if (gl.contactIndices.length === 0) {
      issues.push({
        severity: 'warning',
        message: `Group list ${gl.index} "${gl.name}" contains no contacts`,
        section: 'groupList',
        index: gl.index,
      });
    }

    // Rule: Orphaned contact references
    for (const cIdx of gl.contactIndices) {
      if (!validContactIndices.has(cIdx)) {
        issues.push({
          severity: 'error',
          message: `Group list ${gl.index} "${gl.name}" references digital contact index ${cIdx} which does not exist`,
          section: 'groupList',
          index: gl.index,
        });
      }
    }
  }
}

// ─── Roaming zone validation ────────────────────────────────────────────────

function validateRoamingZones(
  roamingZones: import('./types').RoamingZone[],
  roamingChannels: import('./types').RoamingChannel[],
  issues: ValidationIssue[],
): void {
  const validChannelIndices = new Set(roamingChannels.map((rc) => rc.index));

  for (const rz of roamingZones) {
    for (const chIdx of rz.channelIndices) {
      if (!validChannelIndices.has(chIdx)) {
        issues.push({
          severity: 'error',
          message: `Roaming zone ${rz.index} "${rz.name}" references roaming channel index ${chIdx} which does not exist`,
          section: 'roaming',
          index: rz.index,
        });
      }
    }
  }
}
