export default function MockDashboard() {
  const sidebarItems = [
    { name: 'Channels', count: 247, active: true },
    { name: 'Zones', count: 18, active: false },
    { name: 'Radio IDs', count: 3, active: false },
    { name: 'Contacts', count: 12, active: false },
    { name: 'Digital Contacts', count: 84, active: false },
    { name: 'Scan Lists', count: 6, active: false },
    { name: 'Text Messages', count: 4, active: false },
    { name: 'Group Lists', count: 9, active: false },
    { name: 'APRS', count: null, active: false },
    { name: 'Roaming', count: 2, active: false },
    { name: 'Settings', count: null, active: false },
  ];

  const channels = [
    { id: 1, name: 'W6DTR Rptr', rx: '440.2000', tx: '445.2000', mode: 'DMR', power: 'High', bw: '12.5', cc: '1', ts: '1' },
    { id: 2, name: 'K6LNK Link', rx: '441.8250', tx: '446.8250', mode: 'DMR', power: 'High', bw: '12.5', cc: '3', ts: '2' },
    { id: 3, name: 'N6ME Rptr', rx: '442.5500', tx: '447.5500', mode: 'DMR', power: 'Mid', bw: '12.5', cc: '1', ts: '1' },
    { id: 4, name: 'Simplex 1', rx: '446.5000', tx: '446.5000', mode: 'DMR', power: 'Low', bw: '12.5', cc: '1', ts: '1' },
    { id: 5, name: 'Simplex 2', rx: '446.0750', tx: '446.0750', mode: 'DMR', power: 'Low', bw: '12.5', cc: '1', ts: '2' },
    { id: 6, name: 'WR6ABD', rx: '449.1800', tx: '444.1800', mode: 'FM', power: 'High', bw: '25', cc: '—', ts: '—' },
    { id: 7, name: 'K6OTR Rptr', rx: '447.0600', tx: '442.0600', mode: 'FM', power: 'High', bw: '25', cc: '—', ts: '—' },
    { id: 8, name: 'NOAA WX', rx: '162.5500', tx: '—', mode: 'FM', power: '—', bw: '25', cc: '—', ts: '—' },
    { id: 9, name: 'N6FDR Mt W', rx: '440.9750', tx: '445.9750', mode: 'DMR', power: 'High', bw: '12.5', cc: '2', ts: '1' },
    { id: 10, name: 'K7DMR Net', rx: '443.3000', tx: '448.3000', mode: 'DMR', power: 'Mid', bw: '12.5', cc: '1', ts: '2' },
    { id: 11, name: 'Local FM', rx: '146.5200', tx: '146.5200', mode: 'FM', power: 'Low', bw: '25', cc: '—', ts: '—' },
    { id: 12, name: 'W7TUS RPT', rx: '444.6500', tx: '449.6500', mode: 'DMR', power: 'High', bw: '12.5', cc: '3', ts: '1' },
    { id: 13, name: 'Parrot', rx: '446.0000', tx: '446.0000', mode: 'DMR', power: 'Low', bw: '12.5', cc: '1', ts: '1' },
    { id: 14, name: 'KG7BZ', rx: '145.3300', tx: '144.7300', mode: 'FM', power: 'High', bw: '25', cc: '—', ts: '—' },
  ];

  return (
    <div className="bg-[#09090b] text-left select-none" style={{ fontFamily: 'system-ui, sans-serif' }}>
      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-[#09090b] border-b border-[#1f1f23]">
        {/* Logo */}
        <div className="flex items-center gap-1.5">
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#818cf8]" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M5.636 18.364a9 9 0 0 1 0-12.728M18.364 5.636a9 9 0 0 1 0 12.728" />
            <path d="M8.464 15.536a5 5 0 0 1 0-7.072M15.536 8.464a5 5 0 0 1 0 7.072" />
            <circle cx="12" cy="12" r="1" fill="currentColor" />
          </svg>
          <span className="text-[10px] sm:text-xs font-semibold text-[#818cf8] tracking-wide">AnyProg</span>
          <span className="text-[8px] text-[#71717a]">V2.13</span>
        </div>

        {/* Buttons */}
        <div className="hidden sm:flex items-center gap-1 ml-3">
          <span className="text-[8px] px-2 py-1 rounded bg-[#6366f1] text-white font-medium">Open .RDT</span>
          <span className="text-[8px] px-2 py-1 rounded bg-[#18181b] border border-[#27272a] text-[#a1a1aa]">Save</span>
          <span className="text-[8px] px-2 py-1 rounded bg-[#18181b] border border-[#27272a] text-[#a1a1aa]">Export CSV</span>
        </div>

        <div className="hidden sm:flex items-center gap-1 ml-2">
          <span className="text-[8px] px-2 py-1 rounded bg-[#18181b] border border-[#27272a] text-[#71717a]">Undo</span>
          <span className="text-[8px] px-2 py-1 rounded bg-[#18181b] border border-[#27272a] text-[#71717a]">Redo</span>
        </div>

        {/* Connected badge */}
        <div className="flex items-center gap-1.5 ml-auto px-2 py-1 rounded-full bg-[#22c55e]/10 border border-[#22c55e]/20">
          <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
          <span className="text-[8px] sm:text-[9px] font-medium text-[#22c55e]">D578UV</span>
        </div>

        <div className="hidden sm:flex items-center gap-1 ml-2">
          <span className="text-[8px] px-2 py-1 rounded bg-[#22c55e]/10 text-[#22c55e] font-medium border border-[#22c55e]/20">Read</span>
          <span className="text-[8px] px-2 py-1 rounded bg-[#18181b] border border-[#27272a] text-[#a1a1aa]">Write</span>
        </div>

        {/* File name */}
        <div className="hidden md:flex items-center gap-1.5 ml-3">
          <span className="text-[8px] text-[#a1a1aa]">my_codeplug.rdt</span>
          <span className="text-[7px] px-1.5 py-0.5 rounded bg-[#f59e0b]/10 text-[#f59e0b] font-medium">Modified</span>
        </div>
      </div>

      {/* ── Body: Sidebar + Table ── */}
      <div className="flex">
        {/* Sidebar */}
        <div className="hidden sm:block w-36 md:w-44 flex-shrink-0 border-r border-[#1f1f23] bg-[#09090b]">
          <div className="py-1.5">
            {sidebarItems.map(item => (
              <button
                key={item.name}
                className={`w-full flex items-center justify-between px-3 py-1.5 text-[9px] md:text-[10px] ${
                  item.active
                    ? 'text-white bg-[#18181b] border-l-2 border-l-[#6366f1]'
                    : 'text-[#71717a] hover:text-[#a1a1aa] border-l-2 border-l-transparent'
                }`}
              >
                <span className={item.active ? 'font-medium' : ''}>{item.name}</span>
                {item.count !== null && (
                  <span className="text-[8px] text-[#52525b] font-mono">{item.count}</span>
                )}
              </button>
            ))}
          </div>

          {/* Validation footer */}
          <div className="border-t border-[#1f1f23] px-3 py-2 mt-1">
            <div className="flex items-center gap-1.5 text-[8px]">
              <span className="text-[#22c55e]">0 errors</span>
              <span className="text-[#52525b]">&middot;</span>
              <span className="text-[#f59e0b]">3 warnings</span>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Channel toolbar */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-[#1f1f23]">
            <div className="flex items-center gap-1 px-2 py-1 rounded bg-[#18181b] border border-[#27272a] flex-1 max-w-[160px]">
              <svg className="w-3 h-3 text-[#52525b]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <span className="text-[8px] text-[#52525b]">Search channels...</span>
            </div>
            <span className="text-[8px] px-2 py-1 rounded bg-[#18181b] border border-[#27272a] text-[#a1a1aa]">All Modes</span>
            <span className="text-[8px] px-2 py-1 rounded bg-[#6366f1]/10 text-[#818cf8] font-medium border border-[#6366f1]/20">+ Add Channel</span>
            <span className="hidden md:inline text-[8px] px-2 py-1 rounded bg-[#18181b] border border-[#27272a] text-[#a1a1aa]">Repeater Lookup</span>
            <span className="hidden md:inline text-[8px] px-2 py-1 rounded bg-[#18181b] border border-[#27272a] text-[#a1a1aa]">Scanner Lookup</span>
            <span className="text-[8px] text-[#52525b] ml-auto">247 channels</span>
          </div>

          {/* Table */}
          <div className="overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[20px_24px_1fr_68px_68px_36px_36px_28px_24px_24px] px-2 py-1 bg-[#18181b] text-[7px] sm:text-[8px] text-[#71717a] font-medium uppercase tracking-wider">
              <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-sm border border-[#333] bg-[#18181b]" /></span>
              <span>#</span>
              <span>Name</span>
              <span>RX Freq</span>
              <span>TX Freq</span>
              <span>Mode</span>
              <span>Pwr</span>
              <span>BW</span>
              <span>CC</span>
              <span>TS</span>
            </div>
            {/* Rows */}
            {channels.map((ch, i) => (
              <div
                key={ch.id}
                className={`grid grid-cols-[20px_24px_1fr_68px_68px_36px_36px_28px_24px_24px] px-2 py-[5px] text-[8px] sm:text-[9px] border-t border-[#1f1f23] ${
                  i === 3
                    ? 'bg-[#6366f1]/[0.06] border-l-2 border-l-[#6366f1]'
                    : i === 8
                    ? 'bg-[#22c55e]/[0.05]'
                    : i % 2 === 0
                    ? 'bg-[#0c0c0e]'
                    : 'bg-[#09090b]'
                }`}
              >
                <span className="flex items-center">
                  <span className={`w-2.5 h-2.5 rounded-sm border ${
                    i === 3 ? 'bg-[#6366f1] border-[#6366f1]' : 'border-[#333] bg-[#18181b]'
                  }`}>
                    {i === 3 && (
                      <svg className="w-2.5 h-2.5 text-white p-[1px]" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    )}
                  </span>
                </span>
                <span className="text-[#52525b] font-mono">{ch.id}</span>
                <span className="text-white font-medium truncate">{ch.name}</span>
                <span className="text-[#06b6d4] font-mono text-[8px]">{ch.rx}</span>
                <span className="text-[#06b6d4] font-mono text-[8px]">{ch.tx}</span>
                <span>
                  <span className={`text-[7px] px-1 py-[1px] rounded ${
                    ch.mode === 'DMR' ? 'bg-[#6366f1]/15 text-[#818cf8]' : 'bg-[#22c55e]/10 text-[#22c55e]'
                  }`}>
                    {ch.mode}
                  </span>
                </span>
                <span className="text-[#a1a1aa] text-[8px]">{ch.power}</span>
                <span className="text-[#52525b] text-[8px]">{ch.bw}</span>
                <span className="text-[#52525b] font-mono text-[8px]">{ch.cc}</span>
                <span className="text-[#52525b] font-mono text-[8px]">{ch.ts}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
