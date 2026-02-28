import type { DigitalContact } from '../lib/types';

interface Props {
  digitalContacts: DigitalContact[];
  onUpdateDigitalContact: (index: number, changes: Partial<DigitalContact>) => void;
}

const CALL_TYPE_STYLE: Record<string, string> = {
  group: 'bg-accent-cyan/20 text-accent-cyan',
  private: 'bg-accent-amber/20 text-accent-amber',
  all: 'bg-purple-500/20 text-purple-400',
};

export function DigitalContactEditor({ digitalContacts, onUpdateDigitalContact }: Props) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-text-muted">
        Digital Contacts — {digitalContacts.length} contacts
      </h3>
      <p className="text-xs text-text-dimmed">
        DMR ID and Call Type are editable. Names use proprietary encoding and cannot be changed.
      </p>
      <div className="overflow-auto rounded-xl border border-border max-h-[calc(100vh-200px)]" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <table className="w-full text-sm">
          <thead className="bg-surface-light sticky top-0">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-text-muted w-12">#</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-text-muted w-28">Call Type</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-text-muted w-36">TG / DMR ID</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-text-muted">Raw Data</th>
            </tr>
          </thead>
          <tbody>
            {digitalContacts.map(dc => (
              <tr key={dc.index} className="border-t border-border-subtle hover:bg-surface-light/50">
                <td className="px-4 py-2 tabular-nums text-text-dimmed font-mono text-xs">{dc.index}</td>
                <td className="px-4 py-2">
                  <select
                    value={dc.callType}
                    onChange={e => onUpdateDigitalContact(dc.index, {
                      callType: e.target.value as 'group' | 'private',
                    })}
                    className={`text-xs px-2 py-0.5 rounded-md border border-border-subtle
                               bg-transparent cursor-pointer
                               focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30
                               ${CALL_TYPE_STYLE[dc.callType] || ''}`}
                  >
                    <option value="group">Group</option>
                    <option value="private">Private</option>
                  </select>
                </td>
                <td className="px-4 py-2">
                  <input
                    type="number"
                    value={dc.dmrId}
                    onChange={e => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val) && val >= 1 && val <= 16776415) {
                        onUpdateDigitalContact(dc.index, { dmrId: val });
                      }
                    }}
                    min={1}
                    max={16776415}
                    className="w-full bg-transparent border border-border-subtle rounded-md px-3 py-1 text-sm text-right tabular-nums font-mono
                               focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30
                               [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </td>
                <td className="px-4 py-2 font-mono text-xs text-text-dimmed">
                  {Array.from(dc._raw.slice(6, Math.min(18, dc._raw.byteLength)))
                    .map(b => b.toString(16).padStart(2, '0')).join(' ')}
                  {dc._raw.byteLength > 18 ? ' ...' : ''}
                </td>
              </tr>
            ))}
            {digitalContacts.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-text-dimmed text-sm">
                  No digital contacts configured
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
