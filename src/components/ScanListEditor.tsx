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
        <h3 className="text-xs text-text-muted uppercase tracking-wider mb-2">Scan Lists</h3>
        {scanLists.map(sl => (
          <button
            key={sl.index}
            onClick={() => setSelected(sl.index)}
            className={`w-full text-left px-3 py-2 rounded text-sm transition-colors flex justify-between ${
              selected === sl.index
                ? 'bg-primary/20 text-primary-light'
                : 'text-text hover:bg-surface-light'
            }`}
          >
            <span>{sl.name || `Scan List ${sl.index}`}</span>
            <span className="text-[10px] text-text-muted">{sl.channelIndices.length}</span>
          </button>
        ))}
        {scanLists.length === 0 && (
          <div className="text-xs text-text-muted px-3 py-4">No scan lists configured</div>
        )}
      </div>

      {/* Detail */}
      {scanList ? (
        <div className="flex-1 space-y-2">
          <h3 className="text-xs text-text-muted uppercase tracking-wider">
            {scanList.name} — {scanList.channelIndices.length} channels
          </h3>
          <div className="text-[10px] text-text-muted mb-2">
            Scan list editing is read-only in Phase 1. Full editing coming soon.
          </div>
          <div className="overflow-auto border border-border rounded max-h-[calc(100vh-220px)]">
            {scanList.channelIndices.map((chIdx, pos) => {
              const ch = channelMap.get(chIdx);
              return (
                <div
                  key={`${chIdx}-${pos}`}
                  className="flex items-center gap-2 px-3 py-1.5 border-b border-border/50 text-xs"
                >
                  <span className="text-text-muted w-6 text-right">{pos + 1}</span>
                  <span className="flex-1">{ch?.name ?? `Ch ${chIdx}`}</span>
                  <span className="text-text-muted tabular-nums">
                    {ch?.rxFrequency.toFixed(4)}
                  </span>
                  <span className={`text-[10px] px-1 rounded ${
                    ch?.mode === 'digital' ? 'bg-accent-cyan/20 text-accent-cyan' : 'bg-accent-amber/20 text-accent-amber'
                  }`}>
                    {ch?.mode === 'digital' ? 'DMR' : 'FM'}
                  </span>
                </div>
              );
            })}
            {scanList.channelIndices.length === 0 && (
              <div className="px-3 py-4 text-xs text-text-muted text-center">
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
