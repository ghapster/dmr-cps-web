import { useState } from 'react';
import type { ScanList, Channel } from '../lib/types';

interface Props {
  scanLists: ScanList[];
  channels: Channel[];
}

export function ScanListEditor({ scanLists, channels }: Props) {
  const [selected, setSelected] = useState<number | null>(
    scanLists.length > 0 ? scanLists[0].index : null
  );

  const scanList = scanLists.find(sl => sl.index === selected);
  const channelMap = new Map(channels.map(ch => [ch.index, ch]));

  return (
    <div className="flex gap-4 h-full">
      {/* List */}
      <div className="w-56 shrink-0 space-y-1">
        <h3 className="text-sm font-medium text-text-muted mb-3">Scan Lists</h3>
        {scanLists.map(sl => (
          <button
            key={sl.index}
            onClick={() => setSelected(sl.index)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex justify-between ${
              selected === sl.index
                ? 'bg-surface-lighter text-text'
                : 'text-text-muted hover:bg-surface-light hover:text-text'
            }`}
          >
            <div className="flex items-center gap-2">
              {selected === sl.index && (
                <div className="w-0.5 h-4 bg-primary rounded-full shrink-0" />
              )}
              <span>{sl.name || `Scan List ${sl.index}`}</span>
            </div>
            <span className="text-xs text-text-dimmed">{sl.channelIndices.length}</span>
          </button>
        ))}
        {scanLists.length === 0 && (
          <div className="text-sm text-text-dimmed px-3 py-6">No scan lists configured</div>
        )}
      </div>

      {/* Detail */}
      {scanList ? (
        <div className="flex-1 space-y-3">
          <h3 className="text-sm font-medium text-text-muted">
            {scanList.name} — {scanList.channelIndices.length} channels
          </h3>
          <p className="text-xs text-text-dimmed">
            Read-only. Full editing coming soon.
          </p>
          <div className="overflow-auto rounded-xl border border-border max-h-[calc(100vh-220px)]" style={{ boxShadow: 'var(--shadow-sm)' }}>
            {scanList.channelIndices.map((chIdx, pos) => {
              const ch = channelMap.get(chIdx);
              return (
                <div
                  key={`${chIdx}-${pos}`}
                  className="flex items-center gap-2 px-4 py-2 border-b border-border-subtle text-sm"
                >
                  <span className="text-text-dimmed w-6 text-right font-mono text-xs">{pos + 1}</span>
                  <span className="flex-1">{ch?.name ?? `Ch ${chIdx}`}</span>
                  <span className="text-text-muted tabular-nums font-mono text-xs">
                    {ch?.rxFrequency.toFixed(4)}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                    ch?.mode === 'digital' ? 'bg-accent-cyan/20 text-accent-cyan' : 'bg-accent-amber/20 text-accent-amber'
                  }`}>
                    {ch?.mode === 'digital' ? 'DMR' : 'FM'}
                  </span>
                </div>
              );
            })}
            {scanList.channelIndices.length === 0 && (
              <div className="px-4 py-6 text-sm text-text-dimmed text-center">
                No channels in this scan list
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-text-muted text-sm">
          Select a scan list to view
        </div>
      )}
    </div>
  );
}
