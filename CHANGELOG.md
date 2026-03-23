# Changelog — DMR CPS Web Edition

All notable changes to this project are documented here.

---

## V2.14 — Talkgroup Lookup (2026-03-23)

- **Talkgroup Lookup panel** — new sidebar section that searches BrandMeister (~1,750 talkgroups) and TGIF (~300 talkgroups) databases via their public APIs
- Search/filter by talkgroup name or ID
- Switch between BrandMeister, TGIF, or both sources
- Multi-select talkgroups and batch-add as Group Call digital contacts
- Duplicate detection — existing TG IDs are flagged and skipped on import
- In-memory caching to avoid repeated API calls
- Both APIs called directly from the browser (no CORS proxy needed)

## V2.13 — Serial Buffer & Safe Timeouts (2026-03-22)

- Increased serial buffer from 255 bytes to 16KB — prevents data loss at 921600 baud
- Safe timeout handling via `resetReader()` — creates fresh reader instead of cascading failures
- Prevents USB buffer overflow during sustained bulk reads

## V2.12 — Per-Operation Readers (2026-03-22)

- Rewrote serial I/O to use per-operation readers
- Eliminates orphaned `reader.read()` promises that could steal future response data
- Each serial command now gets its own reader lifecycle

## V2.11 — ACK Handshake Fix (2026-03-21)

- Fixed missing ACK handshake after `readBlock` — the root cause of Mac USB serial failures
- Radio now receives proper acknowledgment after each memory block read

## V2.10 — Mac USB Serial (2026-03-20)

- 500ms settle delay after serial port open (Mac USB needs time to stabilize)
- Increased read timeout to 5 seconds
- Improved error messages shown to user on connection failure

## V2.9 — Expanded Radio Settings (2026-03-19)

- Dual-codec settings architecture — raw hex editor + structured field editor
- 42 new decoded settings fields mapped from QDMR offset tables
- Settings changes write back to the binary blob correctly

## V2.8 — Bulk Edit (2026-03-18)

- Select multiple channels with Shift+Click or Ctrl+Click
- Apply changes (mode, power, bandwidth, color code, time slot, admit) to all selected channels at once
- Bulk edit panel appears when multiple channels are selected

## V2.7 — CSV Import (2026-03-17)

- Import channels from CSV files with preview and column mapping
- Duplicate detection by name + frequency — duplicates marked with DUP badge and auto-deselected
- Flexible header matching (case-insensitive)

## V2.6 — CORS Proxy (2026-03-16)

- Replaced dead `corsproxy.io` with custom Cloudflare Worker CORS proxy
- Proxy handles radioid.net and radioreference.com API calls
- Deployed at `dmr-cors-proxy.ghapster.workers.dev`

## V2.5 — Radio Settings Viewer (2026-03-15)

- Decode and display the 445-byte settings block
- Hex dump view for unrecognized fields

## V2.4 — Scanner Lookup (2026-03-14)

- RadioReference.com API integration for importing conventional (analog) frequencies
- Search by state, county, and subcategory
- Batch-import scanner frequencies as analog channels

## V2.3 — Repeater Lookup Fixes (2026-03-13)

- Fixed checkbox selection bug — checkboxes no longer toggle all at once
- Use array index for stable selection tracking

## V2.2 — Repeater Lookup Checkbox Fix (2026-03-12)

- Fixed repeater lookup checkboxes toggling all entries simultaneously

## V2.1 — CORS Fix (2026-03-11)

- Fixed CORS error on repeater lookup by proxying radioid.net requests

## V2.0 — Web Serial / USB Radio Support (2026-03-10)

- **Read codeplug directly from radio** via Web Serial API over USB
- **Write codeplug to radio** — full round-trip: read from radio, edit, write back
- Anytone D578UV USB device detection (vendor/product ID filtering)
- 921600 baud serial protocol with command/response framing and checksums
- Progress indicator during read/write operations
- Connection status in toolbar

## V1.10 — Duplicate Channel UX (2026-03-09)

- Duplicated channel row is highlighted and scrolled into view

## V1.9 — Duplicate Channel Placement (2026-03-08)

- Duplicated channel inserts directly below the source channel instead of at the bottom

## V1.8 — Copy Icon (2026-03-07)

- Replaced "dup" text button with a copy icon on channel rows

## V1.7 — Validation Cleanup (2026-03-06)

- Removed duplicate frequency validation — shared repeater frequencies are normal in DMR networks

## V1.6 — Persistent Storage (2026-03-05)

- Auto-save last opened codeplug to IndexedDB
- Optional GitHub Pages sync for cloud backup

## V1.5 — Repeater Lookup & Polish (2026-03-04)

- **Repeater lookup** — search radioid.net for DMR repeaters and batch-import as channels
- Confirm dialogs on all destructive delete actions
- Toast notifications on all add/delete/save/export actions
- Drag-to-reorder channels in zones, scan lists, and contacts in group lists
- Expanded validation engine (18 rules) with clickable issue list and section navigation

## V1.4 — More Editable Sections (2026-03-03)

- Add/delete for radio IDs, DTMF contacts, text messages, and roaming channels/zones

## V1.3 — Group Lists (2026-03-02)

- Add/delete/rename group lists with drag-to-reorder contacts

## V1.2 — Click-to-Edit Names (2026-03-01)

- Click-to-edit names for zones and scan lists

## V1.1 — Zone & Scan List Management (2026-02-28)

- Add/delete zones and scan lists

## V1.0 — Initial Release (2026-02-27)

- Binary RDT file parser and writer with round-trip fidelity
- Channel editing — inline edit name, RX/TX frequency, mode, power, color code, time slot
- Sortable and filterable channel table
- CSV export of channel data
- Undo/Redo with 50-level stack (Ctrl+Z / Ctrl+Y)
- Keyboard shortcut Ctrl+S to save
- Dark theme UI with Tailwind CSS
