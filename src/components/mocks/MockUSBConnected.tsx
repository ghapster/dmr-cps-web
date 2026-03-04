export default function MockUSBConnected() {
  const channels = [
    { id: 1, name: 'W6DTR Rptr', rx: '440.2000', tx: '445.2000', mode: 'DMR', power: 'High' },
    { id: 2, name: 'K6LNK Link', rx: '441.8250', tx: '446.8250', mode: 'DMR', power: 'High' },
    { id: 3, name: 'N6ME Rptr', rx: '442.5500', tx: '447.5500', mode: 'DMR', power: 'Mid' },
    { id: 4, name: 'Simplex 1', rx: '446.5000', tx: '446.5000', mode: 'DMR', power: 'Low' },
    { id: 5, name: 'WR6ABD', rx: '449.1800', tx: '444.1800', mode: 'FM', power: 'High' },
    { id: 6, name: 'K6OTR Rptr', rx: '447.0600', tx: '442.0600', mode: 'FM', power: 'High' },
    { id: 7, name: 'NOAA WX', rx: '162.5500', tx: '—', mode: 'FM', power: '—' },
    { id: 8, name: 'N6FDR Mt W', rx: '440.9750', tx: '445.9750', mode: 'DMR', power: 'High' },
  ];

  return (
    <div className="bg-[#09090b] text-left select-none" style={{ fontFamily: 'system-ui, sans-serif' }}>
      {/* Toolbar with connected status */}
      <div className="flex items-center gap-2 px-3 sm:px-4 py-2.5 bg-[#111] border-b border-[#1f1f23]">
        <div className="flex items-center gap-1.5">
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#818cf8]" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M5.636 18.364a9 9 0 0 1 0-12.728M18.364 5.636a9 9 0 0 1 0 12.728" />
            <path d="M8.464 15.536a5 5 0 0 1 0-7.072M15.536 8.464a5 5 0 0 1 0 7.072" />
            <circle cx="12" cy="12" r="1" fill="currentColor" />
          </svg>
          <span className="text-xs font-semibold text-[#818cf8]">AnyProg</span>
        </div>

        {/* Connected badge */}
        <div className="flex items-center gap-1.5 ml-3 px-2.5 py-1 rounded-full bg-[#22c55e]/10 border border-[#22c55e]/20">
          <div className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
          <span className="text-[10px] font-medium text-[#22c55e]">D578UV Connected</span>
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          <button className="text-[9px] px-3 py-1.5 rounded-md bg-[#6366f1] text-white font-medium">
            Read
          </button>
          <button className="text-[9px] px-3 py-1.5 rounded-md bg-[#18181b] border border-[#27272a] text-gray-300 font-medium">
            Write
          </button>
        </div>
      </div>

      {/* Progress bar (reading state) */}
      <div className="px-3 sm:px-4 py-2 bg-[#0c0c0e] border-b border-[#1f1f23]">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] text-gray-400">Reading codeplug...</span>
          <span className="text-[9px] text-[#818cf8] font-mono">78%</span>
        </div>
        <div className="w-full h-1.5 bg-[#18181b] rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#6366f1] to-[#818cf8] rounded-full" style={{ width: '78%' }} />
        </div>
      </div>

      {/* Table */}
      <div className="px-3 sm:px-4 py-3">
        <div className="rounded-lg border border-[#27272a] overflow-hidden">
          <div className="grid grid-cols-[28px_1fr_80px_80px_44px_44px] bg-[#18181b] px-2 py-1.5 text-[8px] sm:text-[9px] text-gray-500 font-medium uppercase tracking-wider">
            {['#', 'Channel Name', 'RX Freq', 'TX Freq', 'Mode', 'Power'].map(h => (
              <span key={h}>{h}</span>
            ))}
          </div>
          {channels.map((ch, i) => (
            <div
              key={ch.id}
              className={`grid grid-cols-[28px_1fr_80px_80px_44px_44px] px-2 py-1.5 text-[9px] sm:text-[10px] border-t border-[#1f1f23] ${
                i % 2 === 0 ? 'bg-[#0c0c0e]' : 'bg-[#09090b]'
              }`}
            >
              <span className="text-gray-600 font-mono">{ch.id}</span>
              <span className="text-white font-medium truncate">{ch.name}</span>
              <span className="text-[#06b6d4] font-mono">{ch.rx}</span>
              <span className="text-[#06b6d4] font-mono">{ch.tx}</span>
              <span>
                <span className={`text-[8px] px-1 py-0.5 rounded ${ch.mode === 'DMR' ? 'bg-[#6366f1]/20 text-[#818cf8]' : 'bg-[#22c55e]/15 text-[#22c55e]'}`}>
                  {ch.mode}
                </span>
              </span>
              <span className="text-gray-400">{ch.power}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
