export default function MockSettings() {
  const tabs = ['General', 'Display', 'Audio', 'Keys', 'GPS', 'Bluetooth', 'APRS', 'Boot', 'Timeout'];

  const settings = [
    { label: 'Brightness', type: 'select', value: 'Level 5' },
    { label: 'Squelch Level', type: 'select', value: 'Level 3' },
    { label: 'VOX', type: 'toggle', value: true },
    { label: 'VOX Level', type: 'select', value: 'Level 4' },
    { label: 'Beep Volume', type: 'select', value: 'Level 2' },
    { label: 'Power On Display', type: 'select', value: 'Custom Char' },
    { label: 'Power On Password', type: 'toggle', value: false },
    { label: 'CH Mode', type: 'toggle', value: true },
  ];

  return (
    <div className="bg-[#09090b] p-3 sm:p-4 text-left select-none" style={{ fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <svg viewBox="0 0 24 24" className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.431.992a7.723 7.723 0 0 1 0 .255c-.007.378.138.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        </svg>
        <span className="text-sm font-bold text-white">Radio Settings</span>
        <span className="text-[9px] text-gray-600 ml-1">AT-D578UV</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
        {tabs.map((tab, i) => (
          <span
            key={tab}
            className={`text-[9px] sm:text-[10px] px-2.5 py-1.5 rounded-md whitespace-nowrap font-medium ${
              i === 0
                ? 'bg-[#6366f1] text-white'
                : 'bg-[#18181b] text-gray-500 border border-[#27272a]'
            }`}
          >
            {tab}
          </span>
        ))}
      </div>

      {/* Settings grid */}
      <div className="rounded-lg border border-[#27272a] overflow-hidden">
        {settings.map((s, i) => (
          <div
            key={s.label}
            className={`flex items-center justify-between px-3 py-2.5 text-[10px] sm:text-[11px] ${
              i > 0 ? 'border-t border-[#1f1f23]' : ''
            } ${i % 2 === 0 ? 'bg-[#0c0c0e]' : 'bg-[#09090b]'}`}
          >
            <span className="text-gray-400">{s.label}</span>
            {s.type === 'select' ? (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#18181b] border border-[#27272a]">
                <span className="text-gray-300">{s.value}</span>
                <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </div>
            ) : (
              <div className={`w-8 h-4 rounded-full relative ${s.value ? 'bg-[#6366f1]' : 'bg-[#27272a]'}`}>
                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${s.value ? 'left-4' : 'left-0.5'}`} />
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="text-[9px] text-gray-600 mt-2">9 tabs &middot; 50+ configurable settings &middot; Dual-codec (RDT + radio memory)</p>
    </div>
  );
}
