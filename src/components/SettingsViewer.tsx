import { useState } from 'react';
import type { FileHeader } from '../lib/types';
import { getGitHubToken, setGitHubToken, clearGitHubToken } from '../lib/storage';

interface Props {
  header: FileHeader;
  settingsBlock: Uint8Array;
  onSyncNow?: () => void;
}

function hexDump(data: Uint8Array, maxRows: number = 32): string[] {
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

export function SettingsViewer({ header, settingsBlock, onSyncNow }: Props) {
  const dump = hexDump(settingsBlock);
  const [tokenInput, setTokenInput] = useState('');
  const [hasToken, setHasToken] = useState(() => !!getGitHubToken());

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

      {/* Settings hex dump */}
      <div>
        <h3 className="text-sm font-medium text-text-muted mb-2">
          Settings Block ({settingsBlock.length} bytes)
        </h3>
        <p className="text-xs text-text-dimmed mb-3">
          Settings are preserved verbatim and not editable. Read-only view.
        </p>
        <div className="bg-surface-light rounded-lg p-4 overflow-auto max-h-96 font-mono text-xs leading-5 text-text-muted">
          {dump.map((line, i) => (
            <div key={i} className="whitespace-pre">{line}</div>
          ))}
          {settingsBlock.length > 32 * 16 && (
            <div className="text-text-dimmed mt-1">... ({settingsBlock.length - 32 * 16} more bytes)</div>
          )}
        </div>
      </div>
    </div>
  );
}
