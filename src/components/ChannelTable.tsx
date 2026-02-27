import { useState, useMemo } from 'react';
import type { Channel, ChannelMode } from '../lib/types';

type SortKey = 'index' | 'name' | 'rxFrequency' | 'txFrequency' | 'mode' | 'power' | 'colorCode' | 'timeSlot';
type SortDir = 'asc' | 'desc';

interface Props {
  channels: Channel[];
  onUpdateChannel: (index: number, changes: Partial<Channel>) => void;
  onDeleteChannels: (indices: number[]) => void;
  onDuplicateChannel: (index: number) => void;
}

function EditableCell({ value, onCommit, type = 'text', options }: {
  value: string | number;
  onCommit: (val: string) => void;
  type?: 'text' | 'number' | 'select';
  options?: { label: string; value: string }[];
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  if (!editing) {
    return (
      <span
        className="cursor-pointer hover:bg-surface-lighter px-1 py-0.5 rounded block w-full"
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
        className="bg-surface-lighter text-text text-xs px-1 py-0.5 rounded border border-border w-full outline-none"
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
      className="bg-surface-lighter text-text text-xs px-1 py-0.5 rounded border border-border w-full outline-none"
    />
  );
}

export function ChannelTable({ channels, onUpdateChannel, onDeleteChannels, onDuplicateChannel }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('index');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [filter, setFilter] = useState('');
  const [modeFilter, setModeFilter] = useState<'all' | ChannelMode>('all');
  const [selected, setSelected] = useState<Set<number>>(new Set());

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
      className="px-2 py-1.5 text-left text-[10px] uppercase tracking-wider text-text-muted cursor-pointer hover:text-text select-none whitespace-nowrap"
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
        <input
          type="text"
          placeholder="Search channels..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="bg-surface-light border border-border rounded px-3 py-1.5 text-xs text-text placeholder:text-text-muted outline-none focus:border-primary-light w-64"
        />
        <select
          value={modeFilter}
          onChange={e => setModeFilter(e.target.value as 'all' | ChannelMode)}
          className="bg-surface-light border border-border rounded px-2 py-1.5 text-xs text-text outline-none"
        >
          <option value="all">All Modes</option>
          <option value="analog">Analog</option>
          <option value="digital">Digital</option>
        </select>
        <div className="flex-1" />
        <span className="text-[10px] text-text-muted">{sorted.length} of {channels.length} channels</span>
        {selected.size > 0 && (
          <button
            onClick={() => { onDeleteChannels(Array.from(selected)); setSelected(new Set()); }}
            className="px-3 py-1 text-xs bg-accent-red/20 text-accent-red hover:bg-accent-red/30 rounded transition-colors"
          >
            Delete {selected.size}
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-auto rounded border border-border">
        <table className="w-full text-xs">
          <thead className="bg-surface-light sticky top-0 z-10">
            <tr>
              <th className="px-2 py-1.5 w-8">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="accent-primary-light"
                />
              </th>
              <SortHeader label="#" sKey="index" />
              <SortHeader label="Name" sKey="name" />
              <SortHeader label="RX Freq" sKey="rxFrequency" />
              <SortHeader label="TX Freq" sKey="txFrequency" />
              <SortHeader label="Mode" sKey="mode" />
              <SortHeader label="Power" sKey="power" />
              <th className="px-2 py-1.5 text-left text-[10px] uppercase tracking-wider text-text-muted">BW</th>
              <SortHeader label="CC" sKey="colorCode" />
              <SortHeader label="TS" sKey="timeSlot" />
              <th className="px-2 py-1.5 text-left text-[10px] uppercase tracking-wider text-text-muted">RX Only</th>
              <th className="px-2 py-1.5 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(ch => (
              <tr
                key={ch.index}
                className={`border-t border-border/50 hover:bg-surface-light/50 ${
                  selected.has(ch.index) ? 'bg-primary/10' : ''
                }`}
              >
                <td className="px-2 py-1">
                  <input
                    type="checkbox"
                    checked={selected.has(ch.index)}
                    onChange={() => {
                      const next = new Set(selected);
                      next.has(ch.index) ? next.delete(ch.index) : next.add(ch.index);
                      setSelected(next);
                    }}
                    className="accent-primary-light"
                  />
                </td>
                <td className="px-2 py-1 text-text-muted">{ch.index}</td>
                <td className="px-2 py-1 font-medium">
                  <EditableCell
                    value={ch.name}
                    onCommit={v => onUpdateChannel(ch.index, { name: v.slice(0, 16) })}
                  />
                </td>
                <td className="px-2 py-1 tabular-nums">
                  <EditableCell
                    value={ch.rxFrequency.toFixed(5)}
                    type="number"
                    onCommit={v => commitFreq(ch.index, 'rxFrequency', v)}
                  />
                </td>
                <td className="px-2 py-1 tabular-nums">
                  <EditableCell
                    value={ch.txFrequency.toFixed(5)}
                    type="number"
                    onCommit={v => commitFreq(ch.index, 'txFrequency', v)}
                  />
                </td>
                <td className="px-2 py-1">
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
                <td className="px-2 py-1">
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
                <td className="px-2 py-1 text-text-muted">
                  {ch.bandwidth === 'narrow' ? '12.5' : '25'}
                </td>
                <td className="px-2 py-1 tabular-nums">
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
                    <span className="text-text-muted">-</span>
                  )}
                </td>
                <td className="px-2 py-1 tabular-nums">
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
                    <span className="text-text-muted">-</span>
                  )}
                </td>
                <td className="px-2 py-1 text-center">
                  {ch.rxOnly ? <span className="text-accent-red text-[10px]">RO</span> : ''}
                </td>
                <td className="px-2 py-1">
                  <button
                    onClick={() => onDuplicateChannel(ch.index)}
                    className="text-text-muted hover:text-text text-[10px]"
                    title="Duplicate"
                  >
                    dup
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
