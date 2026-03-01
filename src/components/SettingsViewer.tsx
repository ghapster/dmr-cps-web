import { useState, useMemo } from 'react';
import type { FileHeader } from '../lib/types';
import { getGitHubToken, setGitHubToken, clearGitHubToken } from '../lib/storage';
import {
  decodeSettings, encodeSettings,
  KEY_FUNCTIONS, MENU_EXIT_OPTIONS,
  SHORT_KEY_FIELDS, LONG_KEY_FIELDS, KEY_LABELS,
  keyFunctionLabel,
  type RadioSettings,
} from '../lib/settings-codec';

interface Props {
  header: FileHeader;
  settingsBlock: Uint8Array;
  onSyncNow?: () => void;
  onUpdateSettings?: (block: Uint8Array) => void;
}

type SettingsTab = 'display' | 'keys' | 'other' | 'vfo';

function hexDump(data: Uint8Array, maxRows: number = 28): string[] {
  const rows: string[] = [];
  for (let i = 0; i < Math.min(data.length, maxRows * 16); i += 16) {
    const offset = i.toString(16).padStart(4, '0');
    const hex: string[] = [];
    let ascii = '';
    for (let j = 0; j < 16; j++) {
      if (i + j < data.length) {
        const b = data[i + j];
        hex.push(b.toString(16).padStart(2, '0'));
        ascii += (b >= 0x20 && b < 0x7f) ? String.fromCharCode(b) : '.';
      } else {
        hex.push('  ');
        ascii += ' ';
      }
    }
    rows.push(`${offset}  ${hex.slice(0, 8).join(' ')}  ${hex.slice(8).join(' ')}  |${ascii}|`);
  }
  return rows;
}

export function SettingsViewer({ header, settingsBlock, onSyncNow, onUpdateSettings }: Props) {
  const [tokenInput, setTokenInput] = useState('');
  const [hasToken, setHasToken] = useState(() => !!getGitHubToken());
  const [activeTab, setActiveTab] = useState<SettingsTab>('display');
  const [hexExpanded, setHexExpanded] = useState(false);

  const settings = useMemo(() => decodeSettings(settingsBlock), [settingsBlock]);

  const update = (changes: Partial<RadioSettings>) => {
    if (!onUpdateSettings) return;
    const updated = { ...settings, ...changes };
    onUpdateSettings(encodeSettings(updated, settingsBlock));
  };

  const handleSaveToken = () => {
    const trimmed = tokenInput.trim();
    if (!trimmed) return;
    setGitHubToken(trimmed);
    setHasToken(true);
    setTokenInput('');
  };

  const handleClearToken = () => {
    clearGitHubToken();
    setHasToken(false);
    setTokenInput('');
  };

  const tabs: { key: SettingsTab; label: string }[] = [
    { key: 'display', label: 'Display' },
    { key: 'keys', label: 'Key Function' },
    { key: 'other', label: 'Other' },
    { key: 'vfo', label: 'VFO Scan' },
  ];

  const editable = !!onUpdateSettings;

  return (
    <div className="space-y-6">
      {/* Header info */}
      <div>
        <h3 className="text-sm font-medium text-text-muted mb-4">File Header</h3>
        <div className="rounded-xl border border-border p-5 max-w-lg" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <span className="text-text-muted">Version:</span>
            <span className="font-medium">{header.version}</span>
            <span className="text-text-muted">Model:</span>
            <span className="font-medium">{header.modelName}</span>
            <span className="text-text-muted">CPS Version:</span>
            <span className="font-medium">{header.cpsVersion}</span>
            <span className="text-text-muted">Payload Size:</span>
            <span className="font-medium tabular-nums font-mono">{header.payloadSize.toLocaleString()} bytes</span>
          </div>
        </div>
      </div>

      {/* Cloud Sync */}
      <div>
        <h3 className="text-sm font-medium text-text-muted mb-4">Cloud Sync</h3>
        <div className="rounded-xl border border-border p-5 max-w-lg space-y-4" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-text-muted">Status:</span>
            {hasToken ? (
              <span className="text-xs font-medium text-accent-green bg-accent-green/10 px-2 py-0.5 rounded-md">Connected</span>
            ) : (
              <span className="text-xs font-medium text-text-dimmed bg-surface-lighter px-2 py-0.5 rounded-md">Not configured</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="password"
              value={tokenInput}
              onChange={e => setTokenInput(e.target.value)}
              placeholder={hasToken ? 'Token saved — enter new to replace' : 'GitHub Personal Access Token'}
              className="flex-1 px-3 py-1.5 text-sm bg-surface-light border border-border rounded-md focus:outline-none focus:border-primary"
              onKeyDown={e => { if (e.key === 'Enter') handleSaveToken(); }}
            />
            <button
              onClick={handleSaveToken}
              disabled={!tokenInput.trim()}
              className="px-3 py-1.5 text-sm bg-primary hover:bg-primary-light text-white rounded-md transition-colors disabled:opacity-40"
            >
              Save
            </button>
            {hasToken && (
              <button
                onClick={handleClearToken}
                className="px-3 py-1.5 text-sm bg-surface-lighter hover:bg-zinc-700 border border-border rounded-md transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          {hasToken && onSyncNow && (
            <button
              onClick={onSyncNow}
              className="px-4 py-1.5 text-sm bg-surface-lighter hover:bg-zinc-700 border border-border rounded-md transition-colors"
            >
              Sync Now
            </button>
          )}

          <p className="text-xs text-text-dimmed leading-relaxed">
            To sync your codeplug across devices, create a GitHub
            Personal Access Token with <span className="font-mono">repo</span> scope.
            Your codeplug is stored locally (IndexedDB) and optionally pushed to
            GitHub Pages for cross-device access.
          </p>
        </div>
      </div>

      {/* Radio Settings — tabbed editable sections */}
      <div>
        <h3 className="text-sm font-medium text-text-muted mb-4">Radio Settings</h3>
        <div className="rounded-xl border border-border" style={{ boxShadow: 'var(--shadow-sm)' }}>
          {/* Tab pills */}
          <div className="flex gap-1 px-4 pt-4 pb-2 border-b border-border">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  activeTab === t.key
                    ? 'bg-primary text-white'
                    : 'text-text-muted hover:bg-surface-lighter'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-5">
            {activeTab === 'display' && (
              <DisplayTab settings={settings} editable={editable} onUpdate={update} />
            )}
            {activeTab === 'keys' && (
              <KeyFunctionTab settings={settings} editable={editable} onUpdate={update} />
            )}
            {activeTab === 'other' && (
              <OtherTab settings={settings} editable={editable} onUpdate={update} />
            )}
            {activeTab === 'vfo' && (
              <VfoScanTab settings={settings} editable={editable} onUpdate={update} />
            )}
          </div>
        </div>
      </div>

      {/* Raw Hex Dump — collapsed by default */}
      <div>
        <button
          onClick={() => setHexExpanded(!hexExpanded)}
          className="flex items-center gap-2 text-sm font-medium text-text-muted hover:text-text transition-colors mb-2"
        >
          <svg
            viewBox="0 0 24 24"
            className={`w-4 h-4 transition-transform ${hexExpanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M9 5l7 7-7 7" />
          </svg>
          Raw Hex Dump ({settingsBlock.length} bytes)
        </button>
        {hexExpanded && (
          <div className="bg-surface-light rounded-lg p-4 overflow-auto max-h-96 font-mono text-xs leading-5 text-text-muted">
            {hexDump(settingsBlock).map((line, i) => (
              <div key={i} className="whitespace-pre">{line}</div>
            ))}
            {settingsBlock.length > 28 * 16 && (
              <div className="text-text-dimmed mt-1">... ({settingsBlock.length - 28 * 16} more bytes)</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Sub-tab components ---

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4">
      <span className="text-sm text-text-muted w-40 shrink-0">{label}</span>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function DisplayTab({ settings, editable, onUpdate }: {
  settings: RadioSettings; editable: boolean; onUpdate: (c: Partial<RadioSettings>) => void;
}) {
  return (
    <div className="space-y-4 max-w-lg">
      <FieldRow label="Brightness">
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={1}
            max={10}
            value={settings.brightness}
            disabled={!editable}
            onChange={e => onUpdate({ brightness: Number(e.target.value) })}
            className="flex-1 accent-primary"
          />
          <span className="text-sm font-mono w-6 text-right">{settings.brightness}</span>
        </div>
      </FieldRow>

      <FieldRow label="Menu Exit Time">
        <select
          value={settings.menuExitTime}
          disabled={!editable}
          onChange={e => onUpdate({ menuExitTime: Number(e.target.value) })}
          className="px-3 py-1.5 text-sm bg-surface-light border border-border rounded-md focus:outline-none focus:border-primary w-32"
        >
          {MENU_EXIT_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </FieldRow>

      <FieldRow label="Status Message 1">
        <input
          type="text"
          value={settings.statusMessage1}
          disabled={!editable}
          maxLength={16}
          onChange={e => onUpdate({ statusMessage1: e.target.value })}
          className="px-3 py-1.5 text-sm bg-surface-light border border-border rounded-md focus:outline-none focus:border-primary w-64 font-mono"
        />
      </FieldRow>
    </div>
  );
}

function KeySelect({ value, editable, onChange }: {
  value: number; editable: boolean; onChange: (v: number) => void;
}) {
  const isKnown = KEY_FUNCTIONS.some(kf => kf.value === value);
  return (
    <select
      value={value}
      disabled={!editable}
      onChange={e => onChange(Number(e.target.value))}
      className="w-full px-2 py-1 text-xs bg-surface-light border border-border rounded-md focus:outline-none focus:border-primary"
    >
      {!isKnown && (
        <option value={value}>{keyFunctionLabel(value)}</option>
      )}
      {KEY_FUNCTIONS.map(kf => (
        <option key={kf.value} value={kf.value}>{kf.label}</option>
      ))}
    </select>
  );
}

function KeyFunctionTab({ settings, editable, onUpdate }: {
  settings: RadioSettings; editable: boolean; onUpdate: (c: Partial<RadioSettings>) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-text-dimmed text-xs">
            <th className="text-left pb-2 pr-3 w-12">Key</th>
            <th className="text-left pb-2 px-2">Short Press</th>
            <th className="text-left pb-2 pl-2">Long Press</th>
          </tr>
        </thead>
        <tbody>
          {KEY_LABELS.map((label, i) => (
            <tr key={label} className="border-t border-border/50">
              <td className="py-1.5 pr-3 font-medium text-text-muted">{label}</td>
              <td className="py-1.5 px-2">
                <KeySelect
                  value={settings[SHORT_KEY_FIELDS[i]]}
                  editable={editable}
                  onChange={v => onUpdate({ [SHORT_KEY_FIELDS[i]]: v })}
                />
              </td>
              <td className="py-1.5 pl-2">
                <KeySelect
                  value={settings[LONG_KEY_FIELDS[i]]}
                  editable={editable}
                  onChange={v => onUpdate({ [LONG_KEY_FIELDS[i]]: v })}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OtherTab({ settings, editable, onUpdate }: {
  settings: RadioSettings; editable: boolean; onUpdate: (c: Partial<RadioSettings>) => void;
}) {
  return (
    <div className="space-y-4 max-w-lg">
      <FieldRow label="SQL Level A">
        <select
          value={settings.sqlLevelA}
          disabled={!editable}
          onChange={e => onUpdate({ sqlLevelA: Number(e.target.value) })}
          className="px-3 py-1.5 text-sm bg-surface-light border border-border rounded-md focus:outline-none focus:border-primary w-24"
        >
          {Array.from({ length: 10 }, (_, i) => (
            <option key={i} value={i}>{i}</option>
          ))}
        </select>
      </FieldRow>

      <FieldRow label="SQL Level B">
        <select
          value={settings.sqlLevelB}
          disabled={!editable}
          onChange={e => onUpdate({ sqlLevelB: Number(e.target.value) })}
          className="px-3 py-1.5 text-sm bg-surface-light border border-border rounded-md focus:outline-none focus:border-primary w-24"
        >
          {Array.from({ length: 10 }, (_, i) => (
            <option key={i} value={i}>{i}</option>
          ))}
        </select>
      </FieldRow>
    </div>
  );
}

function VfoScanTab({ settings, editable, onUpdate }: {
  settings: RadioSettings; editable: boolean; onUpdate: (c: Partial<RadioSettings>) => void;
}) {
  return (
    <div className="space-y-5 max-w-lg">
      <div>
        <h4 className="text-xs font-medium text-text-dimmed mb-3 uppercase tracking-wider">UHF Range</h4>
        <div className="space-y-3">
          <FieldRow label="Start Frequency (MHz)">
            <input
              type="number"
              step="0.00001"
              value={settings.vfoScanStartUhf.toFixed(5)}
              disabled={!editable}
              onChange={e => onUpdate({ vfoScanStartUhf: Number(e.target.value) })}
              className="px-3 py-1.5 text-sm bg-surface-light border border-border rounded-md focus:outline-none focus:border-primary w-40 font-mono tabular-nums"
            />
          </FieldRow>
          <FieldRow label="End Frequency (MHz)">
            <input
              type="number"
              step="0.00001"
              value={settings.vfoScanEndUhf.toFixed(5)}
              disabled={!editable}
              onChange={e => onUpdate({ vfoScanEndUhf: Number(e.target.value) })}
              className="px-3 py-1.5 text-sm bg-surface-light border border-border rounded-md focus:outline-none focus:border-primary w-40 font-mono tabular-nums"
            />
          </FieldRow>
        </div>
      </div>

      <div>
        <h4 className="text-xs font-medium text-text-dimmed mb-3 uppercase tracking-wider">VHF Range</h4>
        <div className="space-y-3">
          <FieldRow label="Start Frequency (MHz)">
            <input
              type="number"
              step="0.00001"
              value={settings.vfoScanStartVhf.toFixed(5)}
              disabled={!editable}
              onChange={e => onUpdate({ vfoScanStartVhf: Number(e.target.value) })}
              className="px-3 py-1.5 text-sm bg-surface-light border border-border rounded-md focus:outline-none focus:border-primary w-40 font-mono tabular-nums"
            />
          </FieldRow>
          <FieldRow label="End Frequency (MHz)">
            <input
              type="number"
              step="0.00001"
              value={settings.vfoScanEndVhf.toFixed(5)}
              disabled={!editable}
              onChange={e => onUpdate({ vfoScanEndVhf: Number(e.target.value) })}
              className="px-3 py-1.5 text-sm bg-surface-light border border-border rounded-md focus:outline-none focus:border-primary w-40 font-mono tabular-nums"
            />
          </FieldRow>
        </div>
      </div>
    </div>
  );
}
