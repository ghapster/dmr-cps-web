import { useState } from 'react';
import type { Zone, Channel } from '../lib/types';

interface Props {
  zones: Zone[];
  channels: Channel[];
  onUpdateZone: (index: number, changes: Partial<Zone>) => void;
}

export function ZoneEditor({ zones, channels, onUpdateZone }: Props) {
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
        <h3 className="text-xs text-text-muted uppercase tracking-wider mb-2">Zones</h3>
        {zones.map(z => (
          <button
            key={z.index}
            onClick={() => setSelectedZone(z.index)}
            className={`w-full text-left px-3 py-2 rounded text-sm transition-colors flex justify-between ${
              selectedZone === z.index
                ? 'bg-primary/20 text-primary-light'
                : 'text-text hover:bg-surface-light'
            }`}
          >
            <span>{z.name || `Zone ${z.index}`}</span>
            <span className="text-[10px] text-text-muted">{z.channelIndices.length}</span>
          </button>
        ))}
      </div>

      {/* Zone detail */}
      {zone ? (
        <div className="flex-1 flex gap-4">
          {/* Assigned channels */}
          <div className="flex-1 space-y-2">
            <h3 className="text-xs text-text-muted uppercase tracking-wider">
              {zone.name} — {zone.channelIndices.length} channels
            </h3>
            <div className="overflow-auto border border-border rounded max-h-[calc(100vh-200px)]">
              {zone.channelIndices.map((chIdx, pos) => {
                const ch = channelMap.get(chIdx);
                return (
                  <div
                    key={`${chIdx}-${pos}`}
                    className="flex items-center gap-2 px-3 py-1.5 border-b border-border/50 text-xs hover:bg-surface-light/50"
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
                    <button
                      onClick={() => moveChannel(pos, -1)}
                      disabled={pos === 0}
                      className="text-text-muted hover:text-text disabled:opacity-30 px-0.5"
                    >
                      &uarr;
                    </button>
                    <button
                      onClick={() => moveChannel(pos, 1)}
                      disabled={pos === zone.channelIndices.length - 1}
                      className="text-text-muted hover:text-text disabled:opacity-30 px-0.5"
                    >
                      &darr;
                    </button>
                    <button
                      onClick={() => removeChannel(chIdx)}
                      className="text-accent-red/70 hover:text-accent-red px-0.5"
                    >
                      &times;
                    </button>
                  </div>
                );
              })}
              {zone.channelIndices.length === 0 && (
                <div className="px-3 py-4 text-xs text-text-muted text-center">
                  No channels assigned. Add from the list on the right.
                </div>
              )}
            </div>
          </div>

          {/* Available channels */}
          <div className="w-64 shrink-0 space-y-2">
            <h3 className="text-xs text-text-muted uppercase tracking-wider">Available</h3>
            <div className="overflow-auto border border-border rounded max-h-[calc(100vh-200px)]">
              {unassigned.map(ch => (
                <div
                  key={ch.index}
                  className="flex items-center gap-2 px-3 py-1.5 border-b border-border/50 text-xs hover:bg-surface-light/50 cursor-pointer"
                  onClick={() => addChannel(ch.index)}
                >
                  <span className="flex-1">{ch.name}</span>
                  <span className="text-text-muted tabular-nums text-[10px]">
                    {ch.rxFrequency.toFixed(4)}
                  </span>
                  <span className="text-accent-green/70 text-[10px]">+ add</span>
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
