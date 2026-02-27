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
  // Rule 1: Duplicate RX frequencies
  const freqMap = new Map<number, number[]>();
  for (const ch of channels) {
    const existing = freqMap.get(ch.rxFrequency);
    if (existing) {
      existing.push(ch.index);
    } else {
      freqMap.set(ch.rxFrequency, [ch.index]);
    }
  }
  for (const [freq, indices] of freqMap) {
    if (indices.length > 1) {
      issues.push({
        severity: 'warning',
        message: `Duplicate RX frequency ${freq.toFixed(4)} MHz shared by channels: ${indices.join(', ')}`,
        section: 'channel',
      });
    }
  }

  for (const ch of channels) {
    // Rule 8: Empty channel name
    if (!ch.name || ch.name.trim() === '') {
      issues.push({
        severity: 'warning',
        message: `Channel ${ch.index} has an empty name`,
        section: 'channel',
        index: ch.index,
      });
    }

    // Rule 4: Frequency band check
    if (ch.rxFrequency > 0 && !isInKnownBand(ch.rxFrequency)) {
      issues.push({
        severity: 'warning',
        message: `Channel ${ch.index} "${ch.name}" RX frequency ${ch.rxFrequency.toFixed(4)} MHz is outside known amateur/commercial bands`,
        section: 'channel',
        index: ch.index,
      });
    }

    // Rule 5: Color code range (0-15)
    if (ch.colorCode < 0 || ch.colorCode > 15) {
      issues.push({
        severity: 'error',
        message: `Channel ${ch.index} "${ch.name}" has invalid color code ${ch.colorCode} (must be 0-15)`,
        section: 'channel',
        index: ch.index,
      });
    }

    // Rule 6: Time slot validation (must be 1 or 2)
    if (ch.timeSlot !== 1 && ch.timeSlot !== 2) {
      issues.push({
        severity: 'error',
        message: `Channel ${ch.index} "${ch.name}" has invalid time slot ${ch.timeSlot} (must be 1 or 2)`,
        section: 'channel',
        index: ch.index,
      });
    }

    // Rule 7: Analog channel with DMR-specific settings
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
    // Rule 10: Empty zones
    if (zone.channelIndices.length === 0) {
      issues.push({
        severity: 'warning',
        message: `Zone ${zone.index} "${zone.name}" contains no channels`,
        section: 'zone',
        index: zone.index,
      });
    }

    // Rule 2: Orphaned zone channel references
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
    // Rule 3: Orphaned scan list channel references
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
    // Rule 9: DMR ID range (24-bit: valid 1 - 16776415, warn on 0 or out of range)
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
