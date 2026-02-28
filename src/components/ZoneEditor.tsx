import { useState, useRef } from 'react';
import type { Zone, Channel } from '../lib/types';
import { ConfirmDialog } from './ConfirmDialog';
import { useToast } from './Toast';

function EditableName({ value, onCommit, maxLen = 16 }: { value: string; onCommit: (val: string) => void; maxLen?: number }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (!editing) {
    return (
      <span
        className="cursor-pointer hover:bg-surface-lighter px-1.5 py-0.5 rounded-md"
        onClick={() => { setDraft(value); setEditing(true); }}
        title="Click to rename"
      >
        {value}
      </span>
    );
  }

  return (
    <input
      autoFocus
      type="text"
      value={draft}
      maxLength={maxLen}
      onChange={e => setDraft(e.target.value)}
      onBlur={() => { onCommit(draft); setEditing(false); }}
      onKeyDown={e => {
        if (e.key === 'Enter') { onCommit(draft); setEditing(false); }
        if (e.key === 'Escape') setEditing(false);
      }}
      className="bg-surface-lighter text-text text-sm px-1.5 py-0.5 rounded-md border border-border outline-none"
    />
  );
}

interface Props {
  zones: Zone[];
  channels: Channel[];
  onUpdateZone: (index: number, changes: Partial<Zone>) => void;
  onAddZone: () => number;
  onDeleteZone: (index: number) => void;
}

export function ZoneEditor({ zones, channels, onUpdateZone, onAddZone, onDeleteZone }: Props) {
  const toast = useToast();
  const [selectedZone, setSelectedZone] = useState<number | null>(
    zones.length > 0 ? zones[0].index : null
  );
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  // Drag state
  const dragIdx = useRef<number | null>(null);
  const [dropIdx, setDropIdx] = useState<number | null>(null);

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

  const handleDragStart = (pos: number) => {
    dragIdx.current = pos;
  };

  const handleDragOver = (e: React.DragEvent, pos: number) => {
    e.preventDefault();
    setDropIdx(pos);
  };

  const handleDrop = (pos: number) => {
    if (!zone || dragIdx.current === null) return;
    const from = dragIdx.current;
    if (from === pos) { dragIdx.current = null; setDropIdx(null); return; }
    const arr = [...zone.channelIndices];
    const [moved] = arr.splice(from, 1);
    arr.splice(pos, 0, moved);
    onUpdateZone(zone.index, { channelIndices: arr });
    dragIdx.current = null;
    setDropIdx(null);
  };

  const handleDragEnd = () => {
    dragIdx.current = null;
    setDropIdx(null);
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
              toast('Zone added');
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
              <EditableName
                value={z.name || `Zone ${z.index}`}
                onCommit={val => onUpdateZone(z.index, { name: val.slice(0, 16) })}
              />
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
              <h3 className="text-sm font-medium text-text-muted flex items-center gap-1">
                <EditableName
                  value={zone.name}
                  onCommit={val => onUpdateZone(zone.index, { name: val.slice(0, 16) })}
                />
                <span>— {zone.channelIndices.length} channels</span>
              </h3>
              <button
                onClick={() => setConfirmDelete(zone.index)}
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
                    draggable
                    onDragStart={() => handleDragStart(pos)}
                    onDragOver={e => handleDragOver(e, pos)}
                    onDrop={() => handleDrop(pos)}
                    onDragEnd={handleDragEnd}
                    className={`relative flex items-center gap-2 px-4 py-2 border-b border-border-subtle text-sm hover:bg-surface-light/50 ${
                      dragIdx.current === pos ? 'opacity-50' : ''
                    }`}
                  >
                    {dropIdx === pos && dropIdx !== dragIdx.current && (
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary" />
                    )}
                    <span className="cursor-grab text-text-dimmed select-none" title="Drag to reorder">&#x2630;</span>
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

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete Zone"
        message={`Are you sure you want to delete "${zones.find(z => z.index === confirmDelete)?.name ?? ''}"? This cannot be undone.`}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete !== null) {
            onDeleteZone(confirmDelete);
            const remaining = zones.filter(z => z.index !== confirmDelete);
            setSelectedZone(remaining.length > 0 ? remaining[0].index : null);
            toast('Zone deleted');
          }
          setConfirmDelete(null);
        }}
      />
    </div>
  );
}
