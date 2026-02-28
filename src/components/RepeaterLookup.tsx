import { useState, useEffect, useCallback } from 'react';
import type { Channel } from '../lib/types';

const US_STATES = [
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut',
  'Delaware','District of Columbia','Florida','Georgia','Hawaii','Idaho','Illinois',
  'Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts',
  'Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada',
  'New Hampshire','New Jersey','New Mexico','New York','North Carolina','North Dakota',
  'Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina',
  'South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington',
  'West Virginia','Wisconsin','Wyoming',
];

interface RepeaterResult {
  id: number;
  callsign: string;
  frequency: number;
  offset: number;
  color_code: number;
  city: string;
  state: string;
}

interface Props {
  onClose: () => void;
  onImport: (partials: Partial<Channel>[]) => void;
}

export function RepeaterLookup({ onClose, onImport }: Props) {
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [results, setResults] = useState<RepeaterResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  const search = async () => {
    if (!state) return;
    setLoading(true);
    setError(null);
    setResults([]);
    setSelected(new Set());

    try {
      const params = new URLSearchParams({ state });
      if (city.trim()) params.set('city', city.trim());

      const res = await fetch(`https://database.radioid.net/api/dmr/repeater/?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const items: RepeaterResult[] = (data.results || []).map((r: Record<string, unknown>) => ({
        id: r.id as number,
        callsign: (r.callsign as string) || '',
        frequency: parseFloat(String(r.frequency)) || 0,
        offset: parseFloat(String(r.offset)) || 0,
        color_code: parseInt(String(r.color_code)) || 1,
        city: (r.city as string) || '',
        state: (r.state as string) || '',
      }));
      setResults(items);
      if (items.length === 0) setError('No repeaters found for this search.');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
        setError('CORS blocked or network error. Try visiting radioid.net directly to look up repeaters.');
      } else {
        setError(`Search failed: ${msg}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: number) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === results.length) setSelected(new Set());
    else setSelected(new Set(results.map(r => r.id)));
  };

  const handleImport = () => {
    const items = results.filter(r => selected.has(r.id));
    const partials: Partial<Channel>[] = items.map(r => ({
      name: r.callsign.slice(0, 16),
      rxFrequency: r.frequency,
      txFrequency: r.frequency + r.offset,
      mode: 'digital' as const,
      colorCode: Math.max(0, Math.min(15, r.color_code)),
      timeSlot: 1 as const,
      power: 'high' as const,
      bandwidth: 'narrow' as const,
    }));
    onImport(partials);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative bg-surface-light border border-border rounded-xl p-6 w-full max-w-3xl max-h-[80vh] flex flex-col shadow-md"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-base font-medium text-text mb-4">Repeater Lookup</h3>

        {/* Search controls */}
        <div className="flex items-end gap-3 mb-4">
          <div className="flex-1">
            <label className="block text-xs text-text-muted mb-1">State</label>
            <select
              value={state}
              onChange={e => setState(e.target.value)}
              className="w-full bg-surface-lighter border border-border rounded-lg px-3 py-2 text-sm text-text outline-none"
            >
              <option value="">Select state...</option>
              {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs text-text-muted mb-1">City (optional)</label>
            <input
              type="text"
              value={city}
              onChange={e => setCity(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') search(); }}
              placeholder="e.g. Denver"
              className="w-full bg-surface-lighter border border-border rounded-lg px-3 py-2 text-sm text-text outline-none placeholder:text-text-dimmed"
            />
          </div>
          <button
            onClick={search}
            disabled={!state || loading}
            className="px-5 py-2 text-sm bg-primary hover:bg-primary-light text-white rounded-lg transition-colors disabled:opacity-40"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>

        {error && (
          <div className="mb-3 px-4 py-2 bg-accent-red/10 border border-accent-red/30 rounded-lg text-accent-red text-sm">
            {error}
          </div>
        )}

        {/* Results table */}
        {results.length > 0 && (
          <div className="flex-1 overflow-auto rounded-xl border border-border mb-4">
            <table className="w-full text-sm">
              <thead className="bg-surface sticky top-0">
                <tr>
                  <th className="px-3 py-2 w-8">
                    <input
                      type="checkbox"
                      checked={selected.size === results.length && results.length > 0}
                      onChange={toggleAll}
                      className="accent-primary-light w-4 h-4"
                    />
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-text-muted">Callsign</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-text-muted">Frequency</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-text-muted">Offset</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-text-muted">CC</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-text-muted">City</th>
                </tr>
              </thead>
              <tbody>
                {results.map(r => (
                  <tr
                    key={r.id}
                    className={`border-t border-border-subtle hover:bg-surface-light/50 cursor-pointer ${
                      selected.has(r.id) ? 'bg-primary/10' : ''
                    }`}
                    onClick={() => toggleSelect(r.id)}
                  >
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selected.has(r.id)}
                        onChange={() => toggleSelect(r.id)}
                        className="accent-primary-light w-4 h-4"
                      />
                    </td>
                    <td className="px-3 py-2 font-medium">{r.callsign}</td>
                    <td className="px-3 py-2 tabular-nums font-mono text-xs">{r.frequency.toFixed(4)}</td>
                    <td className="px-3 py-2 tabular-nums font-mono text-xs">{r.offset >= 0 ? '+' : ''}{r.offset.toFixed(1)}</td>
                    <td className="px-3 py-2 tabular-nums font-mono text-xs">{r.color_code}</td>
                    <td className="px-3 py-2 text-text-muted">{r.city}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg bg-surface-lighter hover:bg-zinc-700 border border-border text-text-muted transition-colors"
          >
            Cancel
          </button>
          {results.length > 0 && (
            <button
              onClick={handleImport}
              disabled={selected.size === 0}
              className="px-5 py-2 text-sm bg-primary hover:bg-primary-light text-white rounded-lg transition-colors disabled:opacity-40"
            >
              Import {selected.size} Selected
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
