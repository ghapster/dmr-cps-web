export default function MockBulkEdit() {
  const channels = [
    { id: 1, name: 'W6DTR Rptr', rx: '440.2000', tx: '445.2000', mode: 'DMR', power: 'High', sel: false },
    { id: 2, name: 'K6LNK Link', rx: '441.8250', tx: '446.8250', mode: 'DMR', power: 'High', sel: true },
    { id: 3, name: 'N6ME Rptr', rx: '442.5500', tx: '447.5500', mode: 'DMR', power: 'Mid', sel: true },
    { id: 4, name: 'Simplex 1', rx: '446.5000', tx: '446.5000', mode: 'DMR', power: 'Low', sel: true },
    { id: 5, name: 'WR6ABD', rx: '449.1800', tx: '444.1800', mode: 'FM', power: 'High', sel: true },
    { id: 6, name: 'K6OTR Rptr', rx: '447.0600', tx: '442.0600', mode: 'FM', power: 'High', sel: false },
    { id: 7, name: 'NOAA WX', rx: '162.5500', tx: '—', mode: 'FM', power: '—', sel: false },
    { id: 8, name: 'N6FDR Mt W', rx: '440.9750', tx: '445.9750', mode: 'DMR', power: 'High', sel: false },
  ];

  return (
    <div className="bg-[#09090b] text-left select-none" style={{ fontFamily: 'system-ui, sans-serif' }}>
      <div className="flex">
        {/* Table */}
        <div className="flex-1 min-w-0 p-3 sm:p-4">
          <div className="rounded-lg border border-[#27272a] overflow-hidden">
            <div className="grid grid-cols-[20px_28px_1fr_72px_72px_40px_40px] bg-[#18181b] px-2 py-1.5 text-[8px] sm:text-[9px] text-gray-500 font-medium uppercase tracking-wider">
              <span />
              <span>#</span>
              <span>Name</span>
              <span>RX Freq</span>
              <span>TX Freq</span>
              <span>Mode</span>
              <span>Pwr</span>
            </div>
            {channels.map((ch, i) => (
              <div
                key={ch.id}
                className={`grid grid-cols-[20px_28px_1fr_72px_72px_40px_40px] px-2 py-1.5 text-[9px] sm:text-[10px] border-t border-[#1f1f23] ${
                  ch.sel ? 'bg-[#6366f1]/[0.08]' : i % 2 === 0 ? 'bg-[#0c0c0e]' : 'bg-[#09090b]'
                }`}
              >
                {/* Checkbox */}
                <span className="flex items-center">
                  <span className={`w-3 h-3 rounded-sm border ${ch.sel ? 'bg-[#6366f1] border-[#6366f1]' : 'border-[#333] bg-[#18181b]'} flex items-center justify-center`}>
                    {ch.sel && (
                      <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    )}
                  </span>
                </span>
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

        {/* Bulk Edit Panel */}
        <div className="w-44 sm:w-52 flex-shrink-0 p-3 sm:p-4 border-l border-[#1f1f23]">
          <h4 className="text-xs font-bold text-white">Bulk Edit</h4>
          <p className="text-[9px] text-gray-500 mt-1">4 channels selected</p>

          <div className="mt-4 space-y-3">
            {[
              { label: 'Mode', value: 'DMR' },
              { label: 'Power', value: 'High' },
              { label: 'Bandwidth', value: '12.5 kHz' },
              { label: 'Color Code', value: '1' },
            ].map(f => (
              <div key={f.label}>
                <label className="text-[9px] text-gray-500 block mb-1">{f.label}</label>
                <div className="flex items-center justify-between px-2 py-1.5 rounded-md bg-[#18181b] border border-[#27272a] text-[10px] text-gray-300">
                  <span>{f.value}</span>
                  <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </div>
              </div>
            ))}
          </div>

          <button className="mt-4 w-full text-[10px] font-medium py-2 rounded-md bg-[#6366f1] text-white">
            Apply to 4 Channels
          </button>
        </div>
      </div>
    </div>
  );
}
