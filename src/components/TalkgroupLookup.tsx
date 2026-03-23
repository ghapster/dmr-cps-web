import { useState, useEffect, useMemo } from 'react';
import type { DigitalContact } from '../lib/types';
import { fetchBrandMeisterTGs, fetchTGIFTGs, type Talkgroup } from '../lib/talkgroups';
import { createDigitalContact } from '../lib/rdt-writer';

type Source = 'brandmeister' | 'tgif' | 'both';

interface Props {
  digitalContacts: DigitalContact[];
  onAddDigitalContacts: (contacts: DigitalContact[]) => void;
}

export function TalkgroupLookup({ digitalContacts, onAddDigitalContacts }: Props) {
  const [source, setSource] = useState<Source>('brandmeister');
  const [search, setSearch] = useState('');
  const [talkgroups, setTalkgroups] = useState<Talkgroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Set of existing TG IDs for duplicate detection
  const existingTgIds = useMemo(
    () => new Set(digitalContacts.filter(dc => dc.callType === 'group').map(dc => dc.dmrId)),
    [digitalContacts],
  );

  // Fetch talkgroups when source changes
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSelected(new Set());

    const load = async () => {
      try {
        let results: Talkgroup[] = [];
        if (source === 'brandmeister' || source === 'both') {
          results = results.concat(await fetchBrandMeisterTGs());
        }
        if (source === 'tgif' || source === 'both') {
          results = results.concat(await fetchTGIFTGs());
        }
        if (!cancelled) setTalkgroups(results);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to fetch talkgroups');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [source]);

  // Filter results client-side
  const filtered = useMemo(() => {
    if (!search.trim()) return talkgroups;
    const q = search.trim().toLowerCase();
    const isNumeric = /^\d+$/.test(q);
    return talkgroups.filter(tg =>
      isNumeric
        ? tg.id.toString().startsWith(q)
        : tg.name.toLowerCase().includes(q) || tg.id.toString().includes(q),
    );
  }, [talkgroups, search]);

  const toggleSelect = (key: string) => {
    const next = new Set(selected);
    next.has(key) ? next.delete(key) : next.add(key);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(tg => `${tg.source}-${tg.id}`)));
    }
  };

  const handleAdd = () => {
    // Build DigitalContact objects for selected talkgroups
    const toAdd = filtered.filter(tg => selected.has(`${tg.source}-${tg.id}`));
    // Deduplicate against existing contacts and within the selection
    const seen = new Set<number>();
    const contacts: DigitalContact[] = [];
    let currentContacts = [...digitalContacts];

    for (const tg of toAdd) {
      if (existingTgIds.has(tg.id) || seen.has(tg.id)) continue;
      seen.add(tg.id);
      const dc = createDigitalContact(currentContacts, tg.id, 'group');
      contacts.push(dc);
      currentContacts = [...currentContacts, dc];
    }

    if (contacts.length > 0) {
      onAddDigitalContacts(contacts);
    }
    setSelected(new Set());
  };

  const skippedCount = [...selected].filter(key => {
    const id = parseInt(key.split('-').slice(1).join('-'), 10);
    return existingTgIds.has(id);
  }).length;

  return (
    <div className="space-y-3 h-full flex flex-col">
      <div>
        <h3 className="text-sm font-medium text-text-muted">Talkgroup Lookup</h3>
        <p className="text-xs text-text-dimmed mt-1">
          Search BrandMeister and TGIF talkgroup databases. Selected talkgroups are added as Digital Contacts (Group Call).
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-end gap-3">
        <div>
          <label className="block text-xs text-text-muted mb-1">Source</label>
          <select
            value={source}
            onChange={e => setSource(e.target.value as Source)}
            className="bg-surface-lighter border border-border rounded-lg px-3 py-2 text-sm text-text outline-none"
          >
            <option value="brandmeister">BrandMeister</option>
            <option value="tgif">TGIF</option>
            <option value="both">Both</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-xs text-text-muted mb-1">Search by name or TG ID</label>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="e.g. &quot;World-wide&quot; or &quot;91&quot;"
            className="w-full bg-surface-lighter border border-border rounded-lg px-3 py-2 text-sm text-text outline-none placeholder:text-text-dimmed"
          />
        </div>
        <div className="text-xs text-text-dimmed whitespace-nowrap pb-2">
          {loading ? 'Loading...' : `${filtered.length} of ${talkgroups.length} talkgroups`}
        </div>
      </div>

      {error && (
        <div className="px-4 py-2 bg-accent-red/10 border border-accent-red/30 rounded-lg text-accent-red text-sm">
          {error}
        </div>
      )}

      {/* Results table */}
      <div className="flex-1 overflow-auto rounded-xl border border-border min-h-0" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <table className="w-full text-sm">
          <thead className="bg-surface-light sticky top-0">
            <tr>
              <th className="px-3 py-2 w-8">
                <input
                  type="checkbox"
                  checked={selected.size === filtered.length && filtered.length > 0}
                  onChange={toggleAll}
                  className="accent-primary-light w-4 h-4"
                />
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-text-muted w-24">TG ID</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-text-muted">Name</th>
              {source === 'both' && (
                <th className="px-3 py-2 text-left text-xs font-medium text-text-muted w-28">Source</th>
              )}
              {(source === 'tgif' || source === 'both') && (
                <th className="px-3 py-2 text-left text-xs font-medium text-text-muted">Description</th>
              )}
              <th className="px-3 py-2 text-center text-xs font-medium text-text-muted w-20">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(tg => {
              const key = `${tg.source}-${tg.id}`;
              const isDuplicate = existingTgIds.has(tg.id);
              return (
                <tr
                  key={key}
                  className={`border-t border-border-subtle hover:bg-surface-light/50 cursor-pointer ${
                    selected.has(key) ? 'bg-primary/10' : ''
                  } ${isDuplicate ? 'opacity-50' : ''}`}
                  onClick={() => toggleSelect(key)}
                >
                  <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.has(key)}
                      onChange={() => toggleSelect(key)}
                      className="accent-primary-light w-4 h-4"
                    />
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-mono text-xs">{tg.id}</td>
                  <td className="px-3 py-2 font-medium">{tg.name}</td>
                  {source === 'both' && (
                    <td className="px-3 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-md ${
                        tg.source === 'brandmeister'
                          ? 'bg-accent-cyan/20 text-accent-cyan'
                          : 'bg-accent-amber/20 text-accent-amber'
                      }`}>
                        {tg.source === 'brandmeister' ? 'BM' : 'TGIF'}
                      </span>
                    </td>
                  )}
                  {(source === 'tgif' || source === 'both') && (
                    <td className="px-3 py-2 text-xs text-text-dimmed max-w-xs truncate">
                      {tg.description || '—'}
                    </td>
                  )}
                  <td className="px-3 py-2 text-center">
                    {isDuplicate && (
                      <span className="text-xs text-accent-amber">Exists</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-text-dimmed text-sm">
                  {talkgroups.length === 0 ? 'No talkgroups loaded' : 'No matches for your search'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      {selected.size > 0 && (
        <div className="flex items-center justify-between pt-1">
          <div className="text-xs text-text-dimmed">
            {selected.size} selected
            {skippedCount > 0 && ` (${skippedCount} already exist — will be skipped)`}
          </div>
          <button
            onClick={handleAdd}
            disabled={selected.size === 0}
            className="px-5 py-2 text-sm bg-primary hover:bg-primary-light text-white rounded-lg transition-colors disabled:opacity-40"
          >
            Add {selected.size - skippedCount} as Digital Contacts
          </button>
        </div>
      )}
    </div>
  );
}
