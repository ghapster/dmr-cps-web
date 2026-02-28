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
  _nameLen: number;
  _codeLen: number;
}

export interface DigitalContact {
  index: number;
  dmrId: number;           // Talk Group ID (group) or DMR ID (private), uint24_le from pre-bytes
  callType: 'group' | 'private' | 'all';
  _raw: Uint8Array;
  _blobOffset: number;     // byte offset of this record within _digitalContactsRaw
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
  _nameLen: number;
  _settings: Uint8Array;       // 8 bytes: settings1(4) + settings2(4)
  _entryHeader: Uint8Array;    // 4 bytes before entries (last byte = count)
  _entryExtras: Uint8Array[];  // per entry: the 4 non-index bytes of each 5-byte entry [byte0, byte2, byte3, byte4]
}

export interface AprsFieldOffset {
  pos: number;      // byte offset relative to section start
  maxLen: number;   // max string length (allocated space in binary)
}

export interface AprsSettings {
  gpsMessage: string;
  callsign: string;
  ssid: number;
  destination: string;
  paths: string[];          // e.g. ["WIDE1-1", "WIDE2-1"]
  comment: string;
  _raw: Uint8Array;
  _fieldOffsets: {
    gpsMessage: AprsFieldOffset;
    destination: AprsFieldOffset;
    callsign: AprsFieldOffset;
    ssid: { pos: number };
    paths: AprsFieldOffset;
    comment: AprsFieldOffset;
  };
}

export interface RoamingChannel {
  index: number;
  name: string;
  _raw: Uint8Array;
  _nameLen: number;
}

export interface RoamingZone {
  index: number;
  name: string;
  channelIndices: number[];
  _raw: Uint8Array;
  _nameLen: number;
}

export interface Codeplug {
  source?: 'rdt' | 'radio';
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
  _groupListHeader: Uint8Array;      // first 3 bytes of group list section
  _groupListTail: Uint8Array;        // bytes after parsed records to APRS
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
  section: 'channel' | 'zone' | 'contact' | 'scanList' | 'groupList' | 'roaming' | 'general';
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
