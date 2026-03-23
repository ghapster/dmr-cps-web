# DMR CPS — Web Edition

A browser-based codeplug editor for the **Anytone D578UV** DMR radio. Open, edit, and save `.RDT` codeplug files entirely client-side — no installs, no uploads, no server.

**Live:** [ghapster.github.io/dmr-cps-web](https://ghapster.github.io/dmr-cps-web/)

## What Is This?

DMR CPS Web is a free, open-source alternative to the Anytone CPS desktop software. It runs entirely in your browser and lets you:

- **Open and edit** `.RDT` codeplug files (the native Anytone format)
- **Read/write directly to your radio** over USB using the Web Serial API — no drivers needed
- **Look up repeaters and talkgroups** from BrandMeister, TGIF, RadioID.net, and RadioReference
- **Import channels** from CSV files or scanner databases
- **Validate** your codeplug against 17 rules before programming

Everything happens client-side. Your codeplug data never leaves your browser.

## Features

### File Handling
- **Drag-and-drop** or click to open `.RDT` files
- **Round-trip safe** — binary-identical save (unmodified fields preserved byte-for-byte)
- **Undo/Redo** with Ctrl+Z / Ctrl+Y (50-level stack)
- **Keyboard shortcuts** — Ctrl+S to save
- **CSV export/import** of channel data
- **Persistent storage** — auto-saves to IndexedDB, optional GitHub sync

### Radio Communication (V2.0+)
- **Read codeplug from radio** via Web Serial API over USB
- **Write codeplug to radio** — full round-trip editing
- Anytone D578UV USB auto-detection
- 921600 baud with checksums, retries, and progress display
- Mac and Windows USB support (V2.10+ fixes)

### Data Lookups
- **Repeater lookup** — search radioid.net for DMR repeaters, batch-import as channels
- **Talkgroup lookup** — search BrandMeister (~1,750 TGs) and TGIF (~300 TGs), add as digital contacts
- **Scanner lookup** — search RadioReference.com for conventional frequencies

### Editing
- **Inline editing** — click any cell to edit
- **Bulk edit** — select multiple channels, apply changes in one action
- **Drag-to-reorder** channels in zones, scan lists, and contacts in group lists
- **Validation** — 17 rules with clickable issue list and section navigation
- **Toast notifications** and **confirm dialogs** on all actions

## Sections

| Section | Status | Notes |
|---------|--------|-------|
| Channels | **Editable** | Inline editing (name, RX/TX freq, mode, power, CC, TS). Sort, filter, multi-select, bulk edit, duplicate. Repeater + scanner lookup with batch import. |
| Zones | **Editable** | Add/delete zones, drag-to-reorder channels within zones. |
| Radio IDs | **Editable** | Add/delete radio IDs, edit DMR ID and name. |
| DTMF Contacts | **Editable** | Add/delete contacts, edit DTMF code and name. |
| Digital Contacts | **Editable** | Edit DMR ID and Call Type. Add new via Talkgroup Lookup. Names use proprietary encoding — not yet decoded. |
| Scan Lists | **Editable** | Add/delete scan lists, drag-to-reorder channels. |
| Text Messages | **Editable** | Add/delete messages, edit text (144 char max). |
| Group Lists | **Editable** | Add/delete/rename group lists, drag-to-reorder contacts. |
| APRS | **Editable** | GPS message, destination, callsign, SSID, paths, comment. |
| Roaming | **Editable** | Add/delete roaming channels and zones, edit names. |
| Settings | **Editable** | 42+ decoded settings fields + hex viewer for unrecognized fields. |
| TG Lookup | **Tool** | Search BrandMeister and TGIF talkgroup databases, add as digital contacts. |

## Validation Rules

| Rule | Severity | Section |
|------|----------|---------|
| Duplicate channel names | Warning | Channels |
| Zero RX or TX frequency | Warning | Channels |
| RX/TX frequency outside known bands (VHF/220/UHF/900) | Warning | Channels |
| Invalid color code (not 0-15) | Error | Channels |
| Invalid time slot (not 1 or 2) | Error | Channels |
| Analog channel with DMR-specific settings | Warning | Channels |
| Empty channel name | Warning | Channels |
| Empty zones (no channels) | Warning | Zones |
| Orphaned zone channel references | Error | Zones |
| Empty scan lists (no channels) | Warning | Scan Lists |
| Orphaned scan list channel references | Error | Scan Lists |
| Empty group lists (no contacts) | Warning | Group Lists |
| Orphaned group list contact references | Error | Group Lists |
| Orphaned roaming zone channel references | Error | Roaming |
| DMR ID 0 or exceeding 24-bit max | Warning | Radio IDs |

## Tech Stack

- **React 19** + **TypeScript 5.9** + **Vite 7**
- **Tailwind CSS 4** (zinc-neutral dark theme, Inter font)
- **Web Serial API** for direct USB radio communication
- **Cloudflare Workers** for CORS proxy (radioid.net, radioreference.com)
- Zero runtime dependencies beyond React
- Custom binary parser/writer for the RDT format (~2,000 lines)

## Development

```bash
npm install
npm run dev        # Dev server with HMR
npm run build      # Production build
npm run preview    # Preview production build
```

### Round-trip test

Verifies that parsing and re-serializing an RDT file produces byte-identical output:

```bash
npx tsx test-roundtrip.ts
```

### Deploy to GitHub Pages

```bash
bash deploy.sh
```

Builds, switches to `gh-pages` branch, copies `dist/`, commits, and pushes. Returns to `master` when done.

## Project Structure

```
src/
├── App.tsx                        Main app shell, section routing, keyboard shortcuts
├── index.css                      Tailwind theme tokens (colors, shadows, fonts)
├── main.tsx                       React entry point (wraps App in ToastProvider)
├── components/
│   ├── AppShell.tsx               Sidebar navigation + clickable validation list
│   ├── FileToolbar.tsx            Top bar (open/save/undo/redo/export/radio)
│   ├── ChannelTable.tsx           Sortable/filterable channel editor
│   ├── ZoneEditor.tsx             Zone list + drag-to-reorder channel assignment
│   ├── ContactTable.tsx           Radio IDs + DTMF contacts
│   ├── DigitalContactEditor.tsx   DMR contacts (call type + ID)
│   ├── DigitalContactTable.tsx    Digital contact table view
│   ├── TextMessageEditor.tsx      Text message editor
│   ├── ScanListEditor.tsx         Scan list editor (drag-to-reorder channels)
│   ├── GroupListEditor.tsx        Group list editor (drag-to-reorder contacts)
│   ├── AprsEditor.tsx             APRS settings form
│   ├── RoamingEditor.tsx          Roaming channels/zones editor
│   ├── SettingsViewer.tsx         Settings decoder + hex viewer
│   ├── BulkEditPanel.tsx          Multi-channel bulk edit panel
│   ├── RepeaterLookup.tsx         Repeater database search (radioid.net)
│   ├── ScannerLookup.tsx          Scanner frequency search (RadioReference)
│   ├── TalkgroupLookup.tsx        Talkgroup search (BrandMeister + TGIF)
│   ├── CsvImportModal.tsx         CSV import with preview
│   ├── ConfirmDialog.tsx          Reusable confirmation modal
│   └── Toast.tsx                  Toast notification context/provider
├── hooks/
│   ├── useCodeplug.ts             State management (load, save, undo/redo, edit, validate)
│   └── useRadio.ts                Radio USB connection management
└── lib/
    ├── types.ts                   TypeScript interfaces
    ├── rdt-parser.ts              Binary RDT file parser
    ├── rdt-writer.ts              Binary RDT file writer + factory functions
    ├── validator.ts               Codeplug validation (17 rules)
    ├── csv.ts                     Channel CSV export/import
    ├── talkgroups.ts              BrandMeister + TGIF talkgroup API
    ├── radio-protocol.ts          Serial protocol (command/response, checksums)
    ├── radio-codeplug.ts          Radio memory layout codec
    ├── settings-codec.ts          Settings block encoder/decoder
    ├── radioreference.ts          RadioReference + RadioID API integration
    └── storage.ts                 IndexedDB persistence + GitHub sync
```

## Version History

See [CHANGELOG.md](CHANGELOG.md) for the full detailed history.

| Version | Highlights |
|---------|-----------|
| **V2.14** | Talkgroup Lookup — search BrandMeister & TGIF, add as digital contacts |
| **V2.13** | 16KB serial buffer + safe timeouts with resetReader |
| **V2.12** | Per-operation readers — rewrite serial I/O architecture |
| **V2.11** | Fix missing ACK handshake after read blocks |
| **V2.10** | Mac USB serial fix (500ms settle delay, 5s timeout) |
| **V2.9** | Expanded radio settings — dual-codec, 42 new decoded fields |
| **V2.8** | Bulk edit — multi-select channels, apply changes at once |
| **V2.7** | CSV import with duplicate detection |
| **V2.6** | Custom Cloudflare Worker CORS proxy |
| **V2.5** | Radio settings viewer/editor |
| **V2.4** | Scanner lookup (RadioReference.com) |
| **V2.0** | Web Serial — read/write codeplug directly via USB |
| **V1.5** | Repeater lookup, drag-to-reorder, confirm dialogs, 18 validation rules |
| **V1.0** | Initial release — RDT parse/write, channel editing, CSV export |

## Roadmap

### Next Up

- [ ] Digital contact name decoding (proprietary encoding — needs reverse engineering)
- [ ] Add talkgroups directly to group lists from TG Lookup
- [ ] Repeater + talkgroup data combined: auto-create channels with correct TG assignments

### Future

- [ ] Multi-file merge (combine channels/zones from multiple codeplugs)
- [ ] Codeplug diff (compare two `.RDT` files side by side)
- [ ] D878UV / D878UV Plus / D578UV Pro / AT-D878UV II Plus support

## License

MIT
