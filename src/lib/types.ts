// RDT File Header (23 bytes)
export interface FileHeader {
  version: string;       // e.g. "V1039"
  payloadSize: number;   // uint32_le — file_size - 14
  modelName: string;     // e.g. "D578UV"
  reserved: Uint8Array;  // 3 bytes
  cpsVersion: string;    // e.g. "V110"
}

export type RepeaterMode = 'simplex' | 'positive' | 'negative';
export type ChannelMode = 'analog' | 'digital';
export type PowerLevel = 'low' | 'mid' | 'high' | 'turbo';
export type Bandwidth = 'narrow' | 'wide';
export type TimeSlot = 1 | 2;

export interface Channel {
  index: number;
  name: string;
  rxFrequency: number;   // MHz
  txFrequency: number;   // MHz (computed: rx + offset * sign)
  repeaterMode: RepeaterMode;
  txOffset: number;      // MHz (always positive; repeaterMode gives direction)
  mode: ChannelMode;
  power: PowerLevel;
  bandwidth: Bandwidth;
  rxOnly: boolean;
  admitCriteria: number;
  colorCode: number;     // 0-15
  timeSlot: TimeSlot;
  // Raw bytes preserved for fields we don't yet decode, ensuring round-trip fidelity
  _raw: Uint8Array;
  _nameLen: number;      // original name byte length (for serialization)
}

export interface RadioId {
  index: number;
  dmrId: number;         // 24-bit DMR ID
  name: string;
  _raw: Uint8Array;
}

export interface Zone {
  index: number;
  name: string;
  channelIndices: number[];  // uint16 channel indices
  _padding: Uint8Array;      // 4 bytes unknown/padding after channel list
  _raw: Uint8Array;
}

export interface ScanList {
  index: number;
  name: string;
  channelIndices: number[];
  entryFlags: number[];        // flag byte per channel entry (0 or 1)
  _settings: Uint8Array;       // 7 bytes of priority/settings
  _timing: Uint8Array;         // 4 bytes of timing settings
  _raw: Uint8Array;
  _nameLen: number;
}

export interface AnalogContact {
  index: number;
  name: string;
  code: string;    // DTMF dial code (e.g. "12345")
  _raw: Uint8Array;
}

export interface DigitalContact {
  index: number;
  dmrId: number;           // Talk Group ID (group) or DMR ID (private), uint24_le from pre-bytes
  callType: 'group' | 'private' | 'all';
  _raw: Uint8Array;
}

export interface TextMessage {
  index: number;
  text: string;
}

export interface GroupList {
  index: number;
  name: string;
  contactIndices: number[];
  _raw: Uint8Array;
}

export interface AprsSettings {
  gpsMessage: string;
  callsign: string;
  ssid: number;
  destination: string;
  paths: string[];          // e.g. ["WIDE1-1", "WIDE2-1"]
  comment: string;
  _raw: Uint8Array;
}

export interface RoamingChannel {
  index: number;
  name: string;
  _raw: Uint8Array;
}

export interface RoamingZone {
  index: number;
  name: string;
  channelIndices: number[];
  _raw: Uint8Array;
}

export interface Codeplug {
  header: FileHeader;
  settingsBlock: Uint8Array;   // preserved verbatim — not edited in Phase 1
  channels: Channel[];
  radioIds: RadioId[];
  zones: Zone[];
  scanLists: ScanList[];
  analogContacts: AnalogContact[];
  // New parsed sections (previously in _trailingBytes)
  digitalContacts: DigitalContact[];
  _digitalContactsRaw: Uint8Array;   // entire section blob (2-byte size + data)
  textMessages: TextMessage[];
  _textMessageHeader: Uint8Array;    // 8 bytes before count
  groupLists: GroupList[];
  _groupListsRaw: Uint8Array;        // entire section including post-entries config
  aprsSettings: AprsSettings;
  _aprsRaw: Uint8Array;              // entire APRS section
  roamingChannels: RoamingChannel[];
  roamingZones: RoamingZone[];
  _roamingRaw: Uint8Array;           // entire roaming section
  // Keep full raw bytes for anything after the last parsed section
  _trailingBytes: Uint8Array;
}

// Validation
export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  severity: ValidationSeverity;
  message: string;
  section: 'channel' | 'zone' | 'contact' | 'scanList' | 'general';
  index?: number;  // item index, if applicable
}

// UI state
export type ActiveSection =
  | 'channels'
  | 'zones'
  | 'contacts'
  | 'scanLists'
  | 'settings'
  | 'radioIds'
  | 'digitalContacts'
  | 'textMessages'
  | 'groupLists'
  | 'aprs'
  | 'roaming';
