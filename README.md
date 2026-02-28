# DMR CPS — Web Edition

A browser-based codeplug editor for the **Anytone D578UV** DMR radio. Open, edit, and save `.RDT` codeplug files entirely client-side — no installs, no uploads, no server.

**Live:** [ghapster.github.io/dmr-cps-web](https://ghapster.github.io/dmr-cps-web/)

## Features

- **Drag-and-drop** or click to open `.RDT` files
- **Round-trip safe** — binary-identical save (unmodified fields preserved byte-for-byte)
- **Undo/Redo** with Ctrl+Z / Ctrl+Y (50-level stack)
- **Keyboard shortcuts** — Ctrl+S to save
- **Validation** — frequency band checks, duplicate warnings, reference integrity, clickable issue list with section navigation
- **CSV export** of channel data
- **Toast notifications** on all add/delete/save/export actions
- **Confirm dialogs** on all destructive delete actions
- **Drag-to-reorder** channels in zones, scan lists, and contacts in group lists
- **Repeater lookup** — search radioid.net for DMR repeaters and batch-import as channels

## Sections

| Section | Status | Notes |
|---------|--------|-------|
| Channels | **Editable** | Inline editing (name, RX/TX freq, mode, power, CC, TS). Sort, filter by mode/search, multi-select delete, add new, duplicate. Repeater lookup + batch import. |
| Zones | **Editable** | Add/delete zones, drag-to-reorder channels within zones. Confirm on delete. |
| Radio IDs | **Editable** | Add/delete radio IDs, edit DMR ID and name. Confirm on delete. |
| DTMF Contacts | **Editable** | Add/delete contacts, edit DTMF code and name. Confirm on delete. |
| Digital Contacts | **Editable** | Edit DMR ID and Call Type (group/private). Names use proprietary encoding — not yet decoded. |
| Scan Lists | **Editable** | Add/delete scan lists, drag-to-reorder channels within scan lists. Confirm on delete. |
| Text Messages | **Editable** | Add/delete messages, edit message text (144 char max). |
| Group Lists | **Editable** | Add/delete/rename group lists, drag-to-reorder contacts within group lists. Confirm on delete. |
| APRS | **Editable** | GPS message, destination, callsign, SSID, paths, comment. Field length limits enforced. |
| Roaming | **Editable** | Add/delete roaming channels and zones, edit names. Confirm on delete. |
| Settings | Read-only | File header info + hex dump of settings block. |

## Validation Rules

| Rule | Severity | Section |
|------|----------|---------|
| Duplicate RX frequencies | Warning | Channels |
| Duplicate TX frequencies | Warning | Channels |
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
- Zero runtime dependencies beyond React
- Custom binary parser/writer for the RDT format (~1,400 lines)

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
│   ├── FileToolbar.tsx            Top bar (open/save/undo/redo/export)
│   ├── ChannelTable.tsx           Sortable/filterable channel editor + repeater lookup
│   ├── ZoneEditor.tsx             Zone list + drag-to-reorder channel assignment
│   ├── ContactTable.tsx           Radio IDs + DTMF contacts with confirm dialogs
│   ├── DigitalContactEditor.tsx   DMR contacts (call type + ID)
│   ├── TextMessageEditor.tsx      Text message editor
│   ├── ScanListEditor.tsx         Scan list editor (drag-to-reorder channels)
│   ├── GroupListEditor.tsx        Group list editor (drag-to-reorder contacts)
│   ├── AprsEditor.tsx             APRS settings form
│   ├── RoamingEditor.tsx          Roaming channels/zones editor with confirm dialogs
│   ├── ConfirmDialog.tsx          Reusable confirmation modal
│   ├── Toast.tsx                  Toast notification context/provider
│   ├── RepeaterLookup.tsx         Repeater database search modal (radioid.net API)
│   └── SettingsViewer.tsx         File header + settings hex dump
├── hooks/
│   └── useCodeplug.ts             State management (load, save, undo/redo, edit, validate, import)
└── lib/
    ├── types.ts                   TypeScript interfaces
    ├── rdt-parser.ts              Binary RDT file parser
    ├── rdt-writer.ts              Binary RDT file writer
    ├── validator.ts               Codeplug validation (18 rules)
    └── csv.ts                     Channel CSV export
```

## Version History

| Version | Changes |
|---------|---------|
| V1.5 | RepeaterBook lookup + batch import, confirm dialogs on all deletes, toast notifications, drag-to-reorder in zones/scan lists/group lists, expanded validation (18 rules), clickable validation list |
| V1.4 | Add/delete for radio IDs, DTMF contacts, text messages, roaming |
| V1.3 | Add/delete/rename group lists |
| V1.2 | Click-to-edit names for zones and scan lists |
| V1.1 | Add/delete zones and scan lists |
| V1.0 | Initial release — binary RDT parse/write, channel editing, CSV export |

## Roadmap

### Next Up

- [ ] Settings editing (power-on message, display settings, key assignments, etc.)
- [ ] Digital contact name decoding (proprietary encoding — needs reverse engineering)
- [ ] CORS proxy or fallback for repeater lookup (radioid.net may block direct browser requests)

### Future

- [ ] Multi-file merge (combine channels/zones from multiple codeplugs)
- [ ] Import from CSV (roundtrip with export)
- [ ] Codeplug diff (compare two `.RDT` files side by side)
- [ ] Bulk edit (apply changes to multiple selected channels at once)
- [ ] D878UV / D878UV Plus / D578UV Pro / AT-D878UV II Plus support

## License

MIT
