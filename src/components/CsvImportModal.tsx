import { useState, useEffect, useCallback, useRef } from 'react';
import type { Channel } from '../lib/types';
import { importChannelsCsv } from '../lib/csv';

interface Props {
  existingChannels: Channel[];
  onClose: () => void;
  onImport: (partials: Partial<Channel>[]) => void;
}

export function CsvImportModal({ existingChannels, onClose, onImport }: Props) {
  const [channels, setChannels] = useState<Partial<Channel>[]>([]);
  const [duplicates, setDuplicates] = useState<Set<number>>(new Set());
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  const processFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please select a .csv file');
      return;
    }
    setFileName(file.name);
    setError(null);

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      try {
        const parsed = importChannelsCsv(text);
        if (parsed.length === 0) {
          setError('No channels found. Check that the CSV has a header row with recognized column names (e.g. Name, RX Freq, TX Freq, Mode).');
          setChannels([]);
          setSelected(new Set());
          return;
        }
        // Detect duplicates: match on name + RX frequency
        const existingKeys = new Set(
          existingChannels.map(ch => `${ch.name.toLowerCase()}|${ch.rxFrequency.toFixed(4)}`)
        );
        const dupes = new Set<number>();
        for (let i = 0; i < parsed.length; i++) {
          const key = `${(parsed[i].name || '').toLowerCase()}|${(parsed[i].rxFrequency ?? 0).toFixed(4)}`;
          if (existingKeys.has(key)) dupes.add(i);
        }
        setDuplicates(dupes);
        setChannels(parsed);
        // Auto-select only non-duplicates
        setSelected(new Set(parsed.map((_, i) => i).filter(i => !dupes.has(i))));
      } catch {
        setError('Failed to parse CSV file.');
        setChannels([]);
        setSelected(new Set());
      }
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const toggleSelect = (idx: number) => {
    const next = new Set(selected);
    next.has(idx) ? next.delete(idx) : next.add(idx);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === channels.length) setSelected(new Set());
    else setSelected(new Set(channels.map((_, i) => i)));
  };

  const handleImport = () => {
    const items = channels.filter((_, i) => selected.has(i));
    onImport(items);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative bg-surface-light border border-border rounded-xl p-6 w-full max-w-3xl max-h-[80vh] flex flex-col shadow-md"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-base font-medium text-text mb-4">Import CSV</h3>

        {error && (
          <div className="mb-3 px-4 py-2 bg-accent-red/10 border border-accent-red/30 rounded-lg text-accent-red text-sm">
            {error}
          </div>
        )}

        {channels.length === 0 ? (
          <div className="space-y-3">
            <p className="text-xs text-text-muted">
              Import channels from a CSV file. Supports our export format and custom CSVs with columns like Name, RX Freq, TX Freq, Mode, Power, etc.
            </p>
            <div
              className="border-2 border-dashed border-border rounded-xl px-8 py-10 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
            >
              <p className="text-sm text-text-muted mb-1">Drag and drop a .csv file here</p>
              <p className="text-xs text-text-dimmed">or click to browse</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => { setChannels([]); setSelected(new Set()); setDuplicates(new Set()); setError(null); setFileName(null); }}
                className="text-xs text-text-dimmed hover:text-text-muted transition-colors"
              >
                &larr; Choose different file
              </button>
              <span className="text-xs text-text-muted">
                {fileName} &mdash; {channels.length} channels parsed
                {duplicates.size > 0 && (
                  <span className="text-amber-400 ml-2">({duplicates.size} duplicates deselected)</span>
                )}
              </span>
            </div>
            <div className="flex-1 overflow-auto rounded-xl border border-border mb-4">
              <table className="w-full text-sm">
                <thead className="bg-surface sticky top-0">
                  <tr>
                    <th className="px-3 py-2 w-8">
                      <input
                        type="checkbox"
                        checked={selected.size === channels.length && channels.length > 0}
                        onChange={toggleAll}
                        className="accent-primary-light w-4 h-4"
                      />
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-text-muted">Name</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-text-muted">RX Freq</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-text-muted">TX Freq</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-text-muted">Mode</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-text-muted">Power</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-text-muted">CC</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-text-muted">TS</th>
                  </tr>
                </thead>
                <tbody>
                  {channels.map((ch, idx) => (
                    <tr
                      key={idx}
                      className={`border-t border-border-subtle hover:bg-surface-light/50 cursor-pointer ${
                        selected.has(idx) ? 'bg-primary/10' : ''
                      } ${duplicates.has(idx) ? 'opacity-50' : ''}`}
                      onClick={() => toggleSelect(idx)}
                    >
                      <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selected.has(idx)}
                          onChange={() => toggleSelect(idx)}
                          className="accent-primary-light w-4 h-4"
                        />
                      </td>
                      <td className="px-3 py-2 font-medium">
                        {ch.name || '—'}
                        {duplicates.has(idx) && (
                          <span className="ml-2 text-[10px] font-semibold text-amber-400 bg-amber-400/15 px-1.5 py-0.5 rounded">DUP</span>
                        )}
                      </td>
                      <td className="px-3 py-2 tabular-nums font-mono text-xs">{ch.rxFrequency?.toFixed(4) || '—'}</td>
                      <td className="px-3 py-2 tabular-nums font-mono text-xs">{ch.txFrequency?.toFixed(4) || '—'}</td>
                      <td className="px-3 py-2 text-text-muted text-xs">{ch.mode || '—'}</td>
                      <td className="px-3 py-2 text-text-muted text-xs">{ch.power || '—'}</td>
                      <td className="px-3 py-2 text-text-muted text-xs">{ch.colorCode ?? '—'}</td>
                      <td className="px-3 py-2 text-text-muted text-xs">{ch.timeSlot ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg bg-surface-lighter hover:bg-zinc-700 border border-border text-text-muted transition-colors"
          >
            Cancel
          </button>
          {channels.length > 0 && (
            <button
              onClick={handleImport}
              disabled={selected.size === 0}
              className="px-5 py-2 text-sm bg-primary hover:bg-primary-light text-white rounded-lg transition-colors disabled:opacity-40"
            >
              Import {selected.size} Channels
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
