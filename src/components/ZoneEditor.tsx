import { useState } from 'react';
import type { Zone, Channel } from '../lib/types';

interface Props {
  zones: Zone[];
  channels: Channel[];
  onUpdateZone: (index: number, changes: Partial<Zone>) => void;
  onAddZone: () => number;
  onDeleteZone: (index: number) => void;
}

export function ZoneEditor({ zones, channels, onUpdateZone, onAddZone, onDeleteZone }: Props) {
  const [selectedZone, setSelectedZone] = useState<number | null>(
    zones.length > 0 ? zones[0].index : null
  );

  const zone = zones.find(z => z.index === selectedZone);
  const channelMap = new Map(channels.map(ch => [ch.index, ch]));
  const assignedSet = new Set(zone?.channelIndices ?? []);

  const unassigned = channels.filter(ch => !assignedSet.has(ch.index));

  const addChannel = (chIndex: number) => {
    if (!zone) return;
    onUpdateZone(zone.index, {
      channelIndices: [...zone.channelIndices, chIndex],
    });
  };

  const removeChannel = (chIndex: number) => {
    if (!zone) return;
    onUpdateZone(zone.index, {
      channelIndices: zone.channelIndices.filter(i => i !== chIndex),
    });
  };

  const moveChannel = (fromIdx: number, dir: -1 | 1) => {
    if (!zone) return;
    const arr = [...zone.channelIndices];
    const toIdx = fromIdx + dir;
    if (toIdx < 0 || toIdx >= arr.length) return;
    [arr[fromIdx], arr[toIdx]] = [arr[toIdx], arr[fromIdx]];
    onUpdateZone(zone.index, { channelIndices: arr });
  };

  return (
    <div className="flex gap-4 h-full">
      {/* Zone list */}
      <div className="w-56 shrink-0 space-y-1">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-text-muted">Zones</h3>
          <button
            onClick={() => {
              const idx = onAddZone();
              setSelectedZone(idx);
            }}
            className="text-xs px-2 py-1 rounded-md bg-accent-green/15 text-accent-green hover:bg-accent-green/25 transition-colors"
          >
            + Add Zone
          </button>
        </div>
        {zones.map(z => (
          <button
            key={z.index}
            onClick={() => setSelectedZone(z.index)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex justify-between ${
              selectedZone === z.index
                ? 'bg-surface-lighter text-text'
                : 'text-text-muted hover:bg-surface-light hover:text-text'
            }`}
          >
            <div className="flex items-center gap-2">
              {selectedZone === z.index && (
                <div className="w-0.5 h-4 bg-primary rounded-full shrink-0" />
              )}
              <span>{z.name || `Zone ${z.index}`}</span>
            </div>
            <span className="text-xs text-text-dimmed">{z.channelIndices.length}</span>
          </button>
        ))}
        {zones.length === 0 && (
          <div className="text-sm text-text-dimmed px-3 py-6">No zones configured</div>
        )}
      </div>

      {/* Zone detail */}
      {zone ? (
        <div className="flex-1 flex gap-4">
          {/* Assigned channels */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-text-muted">
                {zone.name} — {zone.channelIndices.length} channels
              </h3>
              <button
                onClick={() => {
                  onDeleteZone(zone.index);
                  const remaining = zones.filter(z => z.index !== zone.index);
                  setSelectedZone(remaining.length > 0 ? remaining[0].index : null);
                }}
                className="text-xs px-2 py-1 rounded-md bg-accent-red/10 text-accent-red/70 hover:bg-accent-red/20 hover:text-accent-red transition-colors"
              >
                Delete Zone
              </button>
            </div>
            <div className="overflow-auto rounded-xl border border-border max-h-[calc(100vh-200px)]" style={{ boxShadow: 'var(--shadow-sm)' }}>
              {zone.channelIndices.map((chIdx, pos) => {
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
                      disabled={pos === zone.channelIndices.length - 1}
                      className="text-text-muted hover:text-text disabled:opacity-30 px-1 py-0.5 rounded hover:bg-surface-lighter"
                    >
                      &darr;
                    </button>
                    <button
                      onClick={() => removeChannel(chIdx)}
                      className="text-accent-red/70 hover:text-accent-red px-1 py-0.5 rounded hover:bg-accent-red/10"
                    >
                      &times;
                    </button>
                  </div>
                );
              })}
              {zone.channelIndices.length === 0 && (
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
          Select a zone to edit
        </div>
      )}
    </div>
  );
}
