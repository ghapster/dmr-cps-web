import type { FileHeader } from '../lib/types';

interface Props {
  header: FileHeader;
  settingsBlock: Uint8Array;
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

export function SettingsViewer({ header, settingsBlock }: Props) {
  const dump = hexDump(settingsBlock);

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
