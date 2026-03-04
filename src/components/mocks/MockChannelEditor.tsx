export default function MockChannelEditor() {
  const channels = [
    { id: 1, name: 'W6DTR Rptr', rx: '440.2000', tx: '445.2000', mode: 'DMR', power: 'High', cc: '1', ts: '1' },
    { id: 2, name: 'K6LNK Link', rx: '441.8250', tx: '446.8250', mode: 'DMR', power: 'High', cc: '3', ts: '2' },
    { id: 3, name: 'N6ME Rptr', rx: '442.5500', tx: '447.5500', mode: 'DMR', power: 'Mid', cc: '1', ts: '1' },
    { id: 4, name: 'Simplex 1', rx: '446.5000', tx: '446.5000', mode: 'DMR', power: 'Low', cc: '1', ts: '1' },
    { id: 5, name: 'Simplex 2', rx: '446.0750', tx: '446.0750', mode: 'DMR', power: 'Low', cc: '1', ts: '2' },
    { id: 6, name: 'WR6ABD', rx: '449.1800', tx: '444.1800', mode: 'FM', power: 'High', cc: '—', ts: '—' },
    { id: 7, name: 'K6OTR Rptr', rx: '447.0600', tx: '442.0600', mode: 'FM', power: 'High', cc: '—', ts: '—' },
    { id: 8, name: 'NOAA WX', rx: '162.5500', tx: '—', mode: 'FM', power: '—', cc: '—', ts: '—' },
    { id: 9, name: 'N6FDR Mt W', rx: '440.9750', tx: '445.9750', mode: 'DMR', power: 'High', cc: '2', ts: '1' },
    { id: 10, name: 'K7DMR Net', rx: '443.3000', tx: '448.3000', mode: 'DMR', power: 'Mid', cc: '1', ts: '2' },
    { id: 11, name: 'Local FM', rx: '146.5200', tx: '146.5200', mode: 'FM', power: 'Low', cc: '—', ts: '—' },
    { id: 12, name: 'W7TUS RPT', rx: '444.6500', tx: '449.6500', mode: 'DMR', power: 'High', cc: '3', ts: '1' },
  ];

  const headers = ['#', 'Channel Name', 'RX Freq', 'TX Freq', 'Mode', 'Power', 'CC', 'TS'];

  return (
    <div className="bg-[#09090b] p-3 sm:p-4 text-left select-none" style={{ fontFamily: 'system-ui, sans-serif' }}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center gap-1.5">
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#818cf8]" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M5.636 18.364a9 9 0 0 1 0-12.728M18.364 5.636a9 9 0 0 1 0 12.728" />
            <path d="M8.464 15.536a5 5 0 0 1 0-7.072M15.536 8.464a5 5 0 0 1 0 7.072" />
            <circle cx="12" cy="12" r="1" fill="currentColor" />
          </svg>
          <span className="text-xs font-semibold text-[#818cf8] tracking-wide">AnyProg</span>
        </div>
        <div className="flex items-center gap-1 ml-auto">
          {['Add', 'Delete', 'Dup'].map(btn => (
            <button key={btn} className="text-[9px] px-2 py-1 rounded bg-[#18181b] border border-[#27272a] text-gray-400">
              {btn}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-[#27272a] overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[28px_1fr_80px_80px_44px_44px_28px_28px] bg-[#18181b] px-2 py-1.5 text-[8px] sm:text-[9px] text-gray-500 font-medium uppercase tracking-wider">
          {headers.map(h => (
            <span key={h}>{h}</span>
          ))}
        </div>
        {/* Rows */}
        {channels.map((ch, i) => (
          <div
            key={ch.id}
            className={`grid grid-cols-[28px_1fr_80px_80px_44px_44px_28px_28px] px-2 py-1.5 text-[9px] sm:text-[10px] border-t border-[#1f1f23] ${
              i === 3 ? 'bg-[#6366f1]/[0.08] border-l-2 border-l-[#6366f1]' : i % 2 === 0 ? 'bg-[#0c0c0e]' : 'bg-[#09090b]'
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
            <span className="text-gray-500 font-mono">{ch.cc}</span>
            <span className="text-gray-500 font-mono">{ch.ts}</span>
          </div>
        ))}
      </div>
      <p className="text-[9px] text-gray-600 mt-2 text-right">12 of 4,000 channels</p>
    </div>
  );
}
