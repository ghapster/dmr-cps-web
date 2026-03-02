import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import type { Channel, ChannelMode } from '../lib/types';
import { ConfirmDialog } from './ConfirmDialog';
import { useToast } from './Toast';
import { RepeaterLookup } from './RepeaterLookup';
import { ScannerLookup } from './ScannerLookup';
import { BulkEditPanel } from './BulkEditPanel';

type SortKey = 'index' | 'name' | 'rxFrequency' | 'txFrequency' | 'mode' | 'power' | 'colorCode' | 'timeSlot';
type SortDir = 'asc' | 'desc';

interface Props {
  channels: Channel[];
  onUpdateChannel: (index: number, changes: Partial<Channel>) => void;
  onDeleteChannels: (indices: number[]) => void;
  onDuplicateChannel: (index: number) => number;
  onAddChannel: () => number; // returns the new channel's index
  onBulkUpdateChannels?: (indices: number[], changes: Partial<Channel>) => void;
  onImportChannels?: (partials: Partial<Channel>[]) => void;
}

function EditableCell({ value, onCommit, type = 'text', options, autoEdit = false }: {
  value: string | number;
  onCommit: (val: string) => void;
  type?: 'text' | 'number' | 'select';
  options?: { label: string; value: string }[];
  autoEdit?: boolean;
}) {
  const [editing, setEditing] = useState(autoEdit);
  const [draft, setDraft] = useState(String(value));

  // When autoEdit flips to true, enter edit mode
  useEffect(() => {
    if (autoEdit) {
      setDraft(String(value));
      setEditing(true);
    }
  }, [autoEdit, value]);

  if (!editing) {
    return (
      <span
        className="cursor-pointer hover:bg-surface-lighter px-1.5 py-0.5 rounded-md block w-full"
        onClick={() => { setDraft(String(value)); setEditing(true); }}
      >
        {value}
      </span>
    );
  }

  if (type === 'select' && options) {
    return (
      <select
        autoFocus
        value={draft}
        onChange={e => { setDraft(e.target.value); onCommit(e.target.value); setEditing(false); }}
        onBlur={() => setEditing(false)}
        className="bg-surface-lighter text-text text-sm px-1.5 py-0.5 rounded-md border border-border w-full outline-none"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    );
  }

  return (
    <input
      autoFocus
      type={type}
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={() => { onCommit(draft); setEditing(false); }}
      onKeyDown={e => {
        if (e.key === 'Enter') { onCommit(draft); setEditing(false); }
        if (e.key === 'Escape') setEditing(false);
      }}
      className="bg-surface-lighter text-text text-sm px-1.5 py-0.5 rounded-md border border-border w-full outline-none"
    />
  );
}

export function ChannelTable({ channels, onUpdateChannel, onDeleteChannels, onDuplicateChannel, onAddChannel, onBulkUpdateChannels, onImportChannels }: Props) {
  const toast = useToast();
  const [sortKey, setSortKey] = useState<SortKey>('index');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [filter, setFilter] = useState('');
  const [modeFilter, setModeFilter] = useState<'all' | ChannelMode>('all');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [highlightIndex, setHighlightIndex] = useState<number | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [showRepeaterLookup, setShowRepeaterLookup] = useState(false);
  const [showScannerLookup, setShowScannerLookup] = useState(false);

  // Scroll into view when a row is highlighted
  const highlightRef = useCallback((el: HTMLTableRowElement | null) => {
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  // Clear highlight after animation
  useEffect(() => {
    if (highlightIndex !== null) {
      highlightTimerRef.current = setTimeout(() => setHighlightIndex(null), 2000);
      return () => clearTimeout(highlightTimerRef.current);
    }
  }, [highlightIndex]);

  const handleAddChannel = () => {
    setFilter('');
    setModeFilter('all');
    setSortKey('index');
    setSortDir('desc');
    const newIndex = onAddChannel();
    setHighlightIndex(newIndex);
    toast('Channel added');
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const filtered = useMemo(() => {
    let result = channels;
    if (filter) {
      const q = filter.toLowerCase();
      result = result.filter(ch =>
        ch.name.toLowerCase().includes(q) ||
        ch.rxFrequency.toFixed(5).includes(q) ||
        ch.txFrequency.toFixed(5).includes(q)
      );
    }
    if (modeFilter !== 'all') {
      result = result.filter(ch => ch.mode === modeFilter);
    }
    return result;
  }, [channels, filter, modeFilter]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === 'asc' ? Number(av) - Number(bv) : Number(bv) - Number(av);
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const allSelected = sorted.length > 0 && sorted.every(ch => selected.has(ch.index));

  const toggleSelectAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(sorted.map(ch => ch.index)));
  };

  const SortHeader = ({ label, sKey }: { label: string; sKey: SortKey }) => (
    <th
      className="px-3 py-3 text-left text-xs font-medium text-text-muted cursor-pointer hover:text-text select-none whitespace-nowrap"
      onClick={() => toggleSort(sKey)}
    >
      {label} {sortKey === sKey ? (sortDir === 'asc' ? '\u25B2' : '\u25BC') : ''}
    </th>
  );

  const commitFreq = (index: number, field: 'rxFrequency' | 'txFrequency', val: string) => {
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) onUpdateChannel(index, { [field]: num });
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dimmed" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search channels..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="bg-surface-light border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-text placeholder:text-text-dimmed outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 w-64"
          />
        </div>
        <select
          value={modeFilter}
          onChange={e => setModeFilter(e.target.value as 'all' | ChannelMode)}
          className="bg-surface-light border border-border rounded-lg px-3 py-2 text-sm text-text outline-none"
        >
          <option value="all">All Modes</option>
          <option value="analog">Analog</option>
          <option value="digital">Digital</option>
        </select>
        <button
          onClick={handleAddChannel}
          className="px-4 py-1.5 text-sm bg-accent-green/20 text-accent-green hover:bg-accent-green/30 rounded-md transition-colors"
        >
          + Add Channel
        </button>
        {onImportChannels && (
          <>
            <button
              onClick={() => setShowRepeaterLookup(true)}
              className="px-4 py-1.5 text-sm bg-primary/20 text-primary-light hover:bg-primary/30 rounded-md transition-colors"
            >
              Repeater Lookup
            </button>
            <button
              onClick={() => setShowScannerLookup(true)}
              className="px-4 py-1.5 text-sm bg-primary/20 text-primary-light hover:bg-primary/30 rounded-md transition-colors"
            >
              Scanner Lookup
            </button>
          </>
        )}
        <div className="flex-1" />
        <span className="text-xs text-text-dimmed">{sorted.length} of {channels.length} channels</span>
        {selected.size > 0 && (
          <>
            {onBulkUpdateChannels && (
              <button
                onClick={() => setShowBulkEdit(v => !v)}
                className="px-4 py-1.5 text-sm bg-primary/20 text-primary-light hover:bg-primary/30 rounded-md transition-colors"
              >
                Bulk Edit {selected.size}
              </button>
            )}
            <button
              onClick={() => setConfirmBulkDelete(true)}
              className="px-4 py-1.5 text-sm bg-accent-red/20 text-accent-red hover:bg-accent-red/30 rounded-md transition-colors"
            >
              Delete {selected.size}
            </button>
          </>
        )}
      </div>

      {/* Bulk Edit Panel */}
      {showBulkEdit && onBulkUpdateChannels && (
        <BulkEditPanel
          count={selected.size}
          onApply={changes => {
            onBulkUpdateChannels(Array.from(selected), changes);
            const count = selected.size;
            setSelected(new Set());
            setShowBulkEdit(false);
            toast(`Updated ${count} channel${count > 1 ? 's' : ''}`);
          }}
          onClose={() => setShowBulkEdit(false)}
        />
      )}

      {/* Table */}
      <div className="overflow-auto rounded-xl border border-border" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <table className="w-full text-sm">
          <thead className="bg-surface-light sticky top-0 z-10">
            <tr>
              <th className="px-3 py-3 w-8">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="accent-primary-light w-4 h-4"
                />
              </th>
              <SortHeader label="#" sKey="index" />
              <SortHeader label="Name" sKey="name" />
              <SortHeader label="RX Freq" sKey="rxFrequency" />
              <SortHeader label="TX Freq" sKey="txFrequency" />
              <SortHeader label="Mode" sKey="mode" />
              <SortHeader label="Power" sKey="power" />
              <th className="px-3 py-3 text-left text-xs font-medium text-text-muted">BW</th>
              <SortHeader label="CC" sKey="colorCode" />
              <SortHeader label="TS" sKey="timeSlot" />
              <th className="px-3 py-3 text-left text-xs font-medium text-text-muted">RX Only</th>
              <th className="px-3 py-3 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(ch => (
              <tr
                key={ch.index}
                ref={ch.index === highlightIndex ? highlightRef : undefined}
                className={`border-t border-border-subtle hover:bg-surface-light/50 transition-colors duration-1000 ${
                  ch.index === highlightIndex
                    ? 'bg-accent-green/20'
                    : selected.has(ch.index) ? 'bg-primary/10' : ''
                }`}
              >
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selected.has(ch.index)}
                    onChange={() => {
                      const next = new Set(selected);
                      next.has(ch.index) ? next.delete(ch.index) : next.add(ch.index);
                      setSelected(next);
                    }}
                    className="accent-primary-light w-4 h-4"
                  />
                </td>
                <td className="px-3 py-2 text-text-muted font-mono text-xs">{ch.index}</td>
                <td className="px-3 py-2 font-medium">
                  <EditableCell
                    value={ch.name}
                    onCommit={v => onUpdateChannel(ch.index, { name: v.slice(0, 16) })}
                    autoEdit={ch.index === highlightIndex}
                  />
                </td>
                <td className="px-3 py-2 tabular-nums font-mono text-xs">
                  <EditableCell
                    value={ch.rxFrequency.toFixed(5)}
                    type="number"
                    onCommit={v => commitFreq(ch.index, 'rxFrequency', v)}
                  />
                </td>
                <td className="px-3 py-2 tabular-nums font-mono text-xs">
                  <EditableCell
                    value={ch.txFrequency.toFixed(5)}
                    type="number"
                    onCommit={v => commitFreq(ch.index, 'txFrequency', v)}
                  />
                </td>
                <td className="px-3 py-2">
                  <EditableCell
                    value={ch.mode}
                    type="select"
                    options={[
                      { label: 'DMR', value: 'digital' },
                      { label: 'FM', value: 'analog' },
                    ]}
                    onCommit={v => onUpdateChannel(ch.index, { mode: v as ChannelMode })}
                  />
                </td>
                <td className="px-3 py-2">
                  <EditableCell
                    value={ch.power}
                    type="select"
                    options={[
                      { label: 'Low', value: 'low' },
                      { label: 'Mid', value: 'mid' },
                      { label: 'High', value: 'high' },
                      { label: 'Turbo', value: 'turbo' },
                    ]}
                    onCommit={v => onUpdateChannel(ch.index, { power: v as Channel['power'] })}
                  />
                </td>
                <td className="px-3 py-2 text-text-muted text-xs">
                  {ch.bandwidth === 'narrow' ? '12.5' : '25'}
                </td>
                <td className="px-3 py-2 tabular-nums font-mono text-xs">
                  {ch.mode === 'digital' ? (
                    <EditableCell
                      value={ch.colorCode}
                      type="number"
                      onCommit={v => {
                        const n = parseInt(v);
                        if (n >= 0 && n <= 15) onUpdateChannel(ch.index, { colorCode: n });
                      }}
                    />
                  ) : (
                    <span className="text-text-dimmed">-</span>
                  )}
                </td>
                <td className="px-3 py-2 tabular-nums font-mono text-xs">
                  {ch.mode === 'digital' ? (
                    <EditableCell
                      value={ch.timeSlot}
                      type="select"
                      options={[
                        { label: 'TS1', value: '1' },
                        { label: 'TS2', value: '2' },
                      ]}
                      onCommit={v => onUpdateChannel(ch.index, { timeSlot: parseInt(v) as 1 | 2 })}
                    />
                  ) : (
                    <span className="text-text-dimmed">-</span>
                  )}
                </td>
                <td className="px-3 py-2 text-center">
                  {ch.rxOnly ? <span className="text-accent-red text-xs">RO</span> : ''}
                </td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => {
                      const newIdx = onDuplicateChannel(ch.index);
                      if (newIdx >= 0) setHighlightIndex(newIdx);
                    }}
                    className="text-text-dimmed hover:text-text rounded-md p-1 hover:bg-surface-lighter transition-colors"
                    title="Duplicate channel"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
                      <rect x="9" y="9" width="13" height="13" rx="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={confirmBulkDelete}
        title="Delete Channels"
        message={`Are you sure you want to delete ${selected.size} channel${selected.size > 1 ? 's' : ''}? This cannot be undone.`}
        onCancel={() => setConfirmBulkDelete(false)}
        onConfirm={() => {
          const count = selected.size;
          onDeleteChannels(Array.from(selected));
          setSelected(new Set());
          setConfirmBulkDelete(false);
          toast(`${count} channel${count > 1 ? 's' : ''} deleted`);
        }}
      />

      {showRepeaterLookup && onImportChannels && (
        <RepeaterLookup
          onClose={() => setShowRepeaterLookup(false)}
          onImport={(partials: Partial<Channel>[]) => {
            onImportChannels(partials);
            setShowRepeaterLookup(false);
            toast(`${partials.length} channel${partials.length > 1 ? 's' : ''} imported`);
          }}
        />
      )}

      {showScannerLookup && onImportChannels && (
        <ScannerLookup
          onClose={() => setShowScannerLookup(false)}
          onImport={(partials: Partial<Channel>[]) => {
            onImportChannels(partials);
            setShowScannerLookup(false);
            toast(`${partials.length} scanner channel${partials.length > 1 ? 's' : ''} imported`);
          }}
        />
      )}
    </div>
  );
}

