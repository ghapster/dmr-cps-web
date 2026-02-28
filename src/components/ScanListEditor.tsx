import { useState } from 'react';
import type { ScanList, Channel } from '../lib/types';

interface Props {
  scanLists: ScanList[];
  channels: Channel[];
  onUpdateScanList: (index: number, changes: Partial<ScanList>) => void;
}

export function ScanListEditor({ scanLists, channels, onUpdateScanList }: Props) {
  const [selected, setSelected] = useState<number | null>(
    scanLists.length > 0 ? scanLists[0].index : null
  );

  const scanList = scanLists.find(sl => sl.index === selected);
  const channelMap = new Map(channels.map(ch => [ch.index, ch]));
  const assignedSet = new Set(scanList?.channelIndices ?? []);

  const unassigned = channels.filter(ch => !assignedSet.has(ch.index));

  const addChannel = (chIndex: number) => {
    if (!scanList) return;
    onUpdateScanList(scanList.index, {
      channelIndices: [...scanList.channelIndices, chIndex],
      entryFlags: [...scanList.entryFlags, 0],
    });
  };

  const removeChannel = (pos: number) => {
    if (!scanList) return;
    onUpdateScanList(scanList.index, {
      channelIndices: scanList.channelIndices.filter((_, i) => i !== pos),
      entryFlags: scanList.entryFlags.filter((_, i) => i !== pos),
    });
  };

  const moveChannel = (fromIdx: number, dir: -1 | 1) => {
    if (!scanList) return;
    const toIdx = fromIdx + dir;
    const indices = [...scanList.channelIndices];
    const flags = [...scanList.entryFlags];
    if (toIdx < 0 || toIdx >= indices.length) return;
    [indices[fromIdx], indices[toIdx]] = [indices[toIdx], indices[fromIdx]];
    [flags[fromIdx], flags[toIdx]] = [flags[toIdx], flags[fromIdx]];
    onUpdateScanList(scanList.index, { channelIndices: indices, entryFlags: flags });
  };

  return (
    <div className="flex gap-4 h-full">
      {/* Scan list selection */}
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

      {/* Scan list detail */}
      {scanList ? (
        <div className="flex-1 flex gap-4">
          {/* Assigned channels */}
          <div className="flex-1 space-y-2">
            <h3 className="text-sm font-medium text-text-muted">
              {scanList.name} — {scanList.channelIndices.length} channels
            </h3>
            <div className="overflow-auto rounded-xl border border-border max-h-[calc(100vh-200px)]" style={{ boxShadow: 'var(--shadow-sm)' }}>
              {scanList.channelIndices.map((chIdx, pos) => {
                const ch = channelMap.get(chIdx);
                return (
                  <div
                    key={`${chIdx}-${pos}`}
                    className="flex items-center gap-2 px-4 py-2 border-b border-border-subtle text-sm hover:bg-surface-light/50"
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
                    <button
                      onClick={() => moveChannel(pos, -1)}
                      disabled={pos === 0}
                      className="text-text-muted hover:text-text disabled:opacity-30 px-1 py-0.5 rounded hover:bg-surface-lighter"
                    >
                      &uarr;
                    </button>
                    <button
                      onClick={() => moveChannel(pos, 1)}
                      disabled={pos === scanList.channelIndices.length - 1}
                      className="text-text-muted hover:text-text disabled:opacity-30 px-1 py-0.5 rounded hover:bg-surface-lighter"
                    >
                      &darr;
                    </button>
                    <button
                      onClick={() => removeChannel(pos)}
                      className="text-accent-red/70 hover:text-accent-red px-1 py-0.5 rounded hover:bg-accent-red/10"
                    >
                      &times;
                    </button>
                  </div>
                );
              })}
              {scanList.channelIndices.length === 0 && (
                <div className="px-4 py-6 text-sm text-text-dimmed text-center">
                  No channels assigned. Add from the list on the right.
                </div>
              )}
            </div>
          </div>

          {/* Available channels */}
          <div className="w-64 shrink-0 space-y-2">
            <h3 className="text-sm font-medium text-text-muted">Available</h3>
            <div className="overflow-auto rounded-xl border border-border max-h-[calc(100vh-200px)]" style={{ boxShadow: 'var(--shadow-sm)' }}>
              {unassigned.map(ch => (
                <div
                  key={ch.index}
                  className="flex items-center gap-2 px-4 py-2 border-b border-border-subtle text-sm hover:bg-surface-light/50 cursor-pointer"
                  onClick={() => addChannel(ch.index)}
                >
                  <span className="flex-1">{ch.name}</span>
                  <span className="text-text-dimmed tabular-nums font-mono text-xs">
                    {ch.rxFrequency.toFixed(4)}
                  </span>
                  <span className="text-accent-green/70 text-xs">+ add</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-text-muted text-sm">
          Select a scan list to edit
        </div>
      )}
    </div>
  );
}
