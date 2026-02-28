# DMR CPS — Web Edition

A browser-based codeplug editor for the **Anytone D578UV** DMR radio. Open, edit, and save `.RDT` codeplug files entirely client-side — no installs, no uploads, no server.

**Live:** [ghapster.github.io/dmr-cps-web](https://ghapster.github.io/dmr-cps-web/)

## Features

- **Drag-and-drop** or click to open `.RDT` files
- **Round-trip safe** — binary-identical save (unmodified fields preserved byte-for-byte)
- **Undo/Redo** with Ctrl+Z / Ctrl+Y (50-level stack)
- **Keyboard shortcuts** — Ctrl+S to save
- **Validation** — frequency band checks, duplicate warnings, reference integrity
- **CSV export** of channel data

## Sections

| Section | Status | Notes |
|---------|--------|-------|
| Channels | **Editable** | Inline editing (name, RX/TX freq, mode, power, CC, TS). Sort, filter by mode/search, multi-select delete, add new, duplicate. |
| Zones | **Editable** | Add/remove/reorder channels within zones. |
| Radio IDs | **Editable** | Edit DMR ID and name. |
| DTMF Contacts | **Editable** | Edit DTMF code and name (length capped at original). |
| Digital Contacts | **Editable** | Edit DMR ID and Call Type (group/private). Names use proprietary encoding — not yet decoded. |
| Scan Lists | **Editable** | Add/remove/reorder channels within scan lists. |
| Text Messages | **Editable** | Edit message text (144 char max). |
| Group Lists | **Editable** | Add/remove contacts within group lists. |
| APRS | **Editable** | GPS message, destination, callsign, SSID, paths, comment. Field length limits enforced. |
| Roaming | **Editable** | Edit roaming channel and zone names (length capped at original). |
| Settings | Read-only | File header info + hex dump of settings block. |

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
├── main.tsx                       React entry point
├── components/
│   ├── AppShell.tsx               Sidebar navigation + main content layout
│   ├── FileToolbar.tsx            Top bar (open/save/undo/redo/export)
│   ├── ChannelTable.tsx           Sortable/filterable channel editor
│   ├── ZoneEditor.tsx             Zone list + channel assignment
│   ├── ContactTable.tsx           Radio IDs + DTMF contacts
│   ├── DigitalContactEditor.tsx   DMR contacts (call type + ID)
│   ├── TextMessageEditor.tsx      Text message editor
│   ├── ScanListEditor.tsx         Scan list editor (add/remove/reorder channels)
│   ├── GroupListEditor.tsx        Group list editor (add/remove contacts)
│   ├── AprsEditor.tsx             APRS settings form
│   ├── RoamingEditor.tsx          Roaming channels/zones editor
│   └── SettingsViewer.tsx         File header + settings hex dump
├── hooks/
│   └── useCodeplug.ts             State management (load, save, undo/redo, edit, validate)
└── lib/
    ├── types.ts                   TypeScript interfaces
    ├── rdt-parser.ts              Binary RDT file parser
    ├── rdt-writer.ts              Binary RDT file writer
    ├── validator.ts               Codeplug validation
    └── csv.ts                     Channel CSV export
```

## Roadmap

### Phase 2 — Full Editing

- [x] Add new channels (not just edit/duplicate existing)
- [x] Scan list editing (add/remove/reorder channels)
- [x] Group list editing (add/remove contacts)
- [x] DTMF contact editing
- [x] Roaming channel/zone editing
- [ ] Settings editing (power-on message, display settings, key assignments, etc.)
- [ ] Digital contact name decoding (proprietary encoding — needs reverse engineering)

### Phase 3 — Power Features

- [ ] Multi-file merge (combine channels/zones from multiple codeplugs)
- [ ] Import from CSV (roundtrip with export)
- [ ] Repeater database lookup (auto-fill frequencies from RepeaterBook)
- [ ] Codeplug diff (compare two `.RDT` files side by side)
- [ ] Bulk edit (apply changes to multiple selected channels at once)

### Phase 4 — Multi-Radio

- [ ] D878UV / D878UV Plus support
- [ ] D578UV Pro support
- [ ] AT-D878UV II Plus support

## License

MIT
