import { useState, useEffect, useCallback } from 'react';
import type { Channel } from '../lib/types';
import {
  getZipCodeInfo, getCountyInfo, getSubcatFreqs,
  mapFrequencyToChannel,
  type RRCredentials, type RRCountyInfo, type RRCategory, type RRFrequency,
} from '../lib/radioreference';
import { getRRCredentials, setRRCredentials, clearRRCredentials } from '../lib/storage';

type Step = 'credentials' | 'location' | 'categories' | 'frequencies';

interface Props {
  onClose: () => void;
  onImport: (partials: Partial<Channel>[]) => void;
}

export function ScannerLookup({ onClose, onImport }: Props) {
  const [step, setStep] = useState<Step>('credentials');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Credentials
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [appKey, setAppKey] = useState('');
  const [remember, setRemember] = useState(true);

  // Location
  const [zip, setZip] = useState('');
  const [county, setCounty] = useState<RRCountyInfo | null>(null);

  // Categories
  const [categories, setCategories] = useState<RRCategory[]>([]);

  // Frequencies
  const [frequencies, setFrequencies] = useState<RRFrequency[]>([]);
  const [selectedCatName, setSelectedCatName] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());

  // Load saved credentials on mount
  useEffect(() => {
    const saved = getRRCredentials();
    if (saved) {
      setUsername(saved.username);
      setPassword(saved.password);
      setAppKey(saved.appKey);
      setRemember(true);
      setStep('location');
    }
  }, []);

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  const creds: RRCredentials = { username, password, appKey };

  const handleCredentialSubmit = () => {
    if (!username || !password || !appKey) return;
    if (remember) {
      setRRCredentials({ username, password, appKey });
    } else {
      clearRRCredentials();
    }
    setStep('location');
  };

  const handleZipSubmit = async () => {
    if (!zip || zip.length < 5) return;
    setLoading(true);
    setError(null);
    try {
      const info = await getZipCodeInfo(zip, creds);
      setCounty(info);
      // Immediately load categories
      const cats = await getCountyInfo(info.ctid, creds);
      setCategories(cats);
      setStep('categories');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to look up ZIP code');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = async (cat: RRCategory) => {
    if (!county) return;
    setLoading(true);
    setError(null);
    setSelectedCatName(cat.catName);
    try {
      const freqs = await getSubcatFreqs(cat.catId, county.ctid, creds);
      setFrequencies(freqs);
      setSelected(new Set());
      if (freqs.length === 0) {
        setError('No frequencies found in this category.');
      } else {
        setStep('frequencies');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load frequencies');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (idx: number) => {
    const next = new Set(selected);
    next.has(idx) ? next.delete(idx) : next.add(idx);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === frequencies.length) setSelected(new Set());
    else setSelected(new Set(frequencies.map((_, i) => i)));
  };

  const handleImport = () => {
    const items = frequencies.filter((_, i) => selected.has(i));
    const partials = items.map(mapFrequencyToChannel);
    onImport(partials);
  };

  const stepTitle = {
    credentials: 'Scanner Lookup — Credentials',
    location: 'Scanner Lookup — Location',
    categories: `Scanner Lookup — ${county?.countyName || 'Categories'}`,
    frequencies: `Scanner Lookup — ${selectedCatName}`,
  }[step];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative bg-surface-light border border-border rounded-xl p-6 w-full max-w-3xl max-h-[80vh] flex flex-col shadow-md"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-base font-medium text-text mb-4">{stepTitle}</h3>

        {error && (
          <div className="mb-3 px-4 py-2 bg-accent-red/10 border border-accent-red/30 rounded-lg text-accent-red text-sm">
            {error}
          </div>
        )}

        {/* Step 1: Credentials */}
        {step === 'credentials' && (
          <div className="space-y-3">
            <p className="text-xs text-text-muted">
              Enter your RadioReference.com premium account credentials and API key.
              Get an API key at{' '}
              <a href="https://www.radioreference.com/account/api" target="_blank" rel="noopener noreferrer" className="text-primary-light underline">
                radioreference.com/account/api
              </a>
            </p>
            <div>
              <label className="block text-xs text-text-muted mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full bg-surface-lighter border border-border rounded-lg px-3 py-2 text-sm text-text outline-none"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-surface-lighter border border-border rounded-lg px-3 py-2 text-sm text-text outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">API Key</label>
              <input
                type="text"
                value={appKey}
                onChange={e => setAppKey(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCredentialSubmit(); }}
                className="w-full bg-surface-lighter border border-border rounded-lg px-3 py-2 text-sm text-text outline-none"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-text-muted cursor-pointer">
              <input
                type="checkbox"
                checked={remember}
                onChange={e => setRemember(e.target.checked)}
                className="accent-primary-light w-4 h-4"
              />
              Remember credentials
            </label>
          </div>
        )}

        {/* Step 2: Location */}
        {step === 'location' && (
          <div className="space-y-3">
            <p className="text-xs text-text-muted">Enter a US ZIP code to find scanner frequencies in that area.</p>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-xs text-text-muted mb-1">ZIP Code</label>
                <input
                  type="text"
                  value={zip}
                  onChange={e => setZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
                  onKeyDown={e => { if (e.key === 'Enter') handleZipSubmit(); }}
                  placeholder="e.g. 90210"
                  maxLength={5}
                  className="w-full bg-surface-lighter border border-border rounded-lg px-3 py-2 text-sm text-text outline-none placeholder:text-text-dimmed"
                  autoFocus
                />
              </div>
              <button
                onClick={handleZipSubmit}
                disabled={zip.length < 5 || loading}
                className="px-5 py-2 text-sm bg-primary hover:bg-primary-light text-white rounded-lg transition-colors disabled:opacity-40"
              >
                {loading ? 'Looking up...' : 'Search'}
              </button>
            </div>
            <button
              onClick={() => { setStep('credentials'); }}
              className="text-xs text-text-dimmed hover:text-text-muted transition-colors"
            >
              Change credentials
            </button>
          </div>
        )}

        {/* Step 3: Categories */}
        {step === 'categories' && (
          <div className="flex-1 overflow-auto space-y-1">
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => setStep('location')}
                className="text-xs text-text-dimmed hover:text-text-muted transition-colors"
              >
                &larr; Change location
              </button>
              {county && (
                <span className="text-xs text-text-muted">
                  {county.countyName}, {county.stateName}
                </span>
              )}
            </div>
            {categories.length === 0 && !loading && (
              <p className="text-sm text-text-muted">No categories found for this county.</p>
            )}
            {loading && (
              <p className="text-sm text-text-muted animate-pulse">Loading categories...</p>
            )}
            {categories.map(cat => (
              <button
                key={cat.catId}
                onClick={() => handleCategoryClick(cat)}
                disabled={loading}
                className="w-full text-left px-4 py-2.5 text-sm rounded-lg hover:bg-surface-lighter border border-transparent hover:border-border transition-colors disabled:opacity-40"
              >
                {cat.catName}
              </button>
            ))}
          </div>
        )}

        {/* Step 4: Frequencies */}
        {step === 'frequencies' && (
          <>
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => { setStep('categories'); setFrequencies([]); setError(null); }}
                className="text-xs text-text-dimmed hover:text-text-muted transition-colors"
              >
                &larr; Back to categories
              </button>
              <span className="text-xs text-text-muted">{frequencies.length} frequencies</span>
            </div>
            <div className="flex-1 overflow-auto rounded-xl border border-border mb-4">
              <table className="w-full text-sm">
                <thead className="bg-surface sticky top-0">
                  <tr>
                    <th className="px-3 py-2 w-8">
                      <input
                        type="checkbox"
                        checked={selected.size === frequencies.length && frequencies.length > 0}
                        onChange={toggleAll}
                        className="accent-primary-light w-4 h-4"
                      />
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-text-muted">Alpha</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-text-muted">Frequency</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-text-muted">Mode</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-text-muted">Tone</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-text-muted">Tag</th>
                  </tr>
                </thead>
                <tbody>
                  {frequencies.map((f, idx) => (
                    <tr
                      key={idx}
                      className={`border-t border-border-subtle hover:bg-surface-light/50 cursor-pointer ${
                        selected.has(idx) ? 'bg-primary/10' : ''
                      }`}
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
                      <td className="px-3 py-2 font-medium">{f.alpha}</td>
                      <td className="px-3 py-2 tabular-nums font-mono text-xs">{f.freq.toFixed(4)}</td>
                      <td className="px-3 py-2 text-text-muted text-xs">{f.mode}</td>
                      <td className="px-3 py-2 text-text-muted text-xs">{f.tone}</td>
                      <td className="px-3 py-2 text-text-muted text-xs">{f.tag}</td>
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
          {step === 'credentials' && (
            <button
              onClick={handleCredentialSubmit}
              disabled={!username || !password || !appKey}
              className="px-5 py-2 text-sm bg-primary hover:bg-primary-light text-white rounded-lg transition-colors disabled:opacity-40"
            >
              Continue
            </button>
          )}
          {step === 'frequencies' && frequencies.length > 0 && (
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
