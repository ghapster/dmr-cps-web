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
    <div className="space-y-2">
      <h3 className="text-xs text-text-muted uppercase tracking-wider">
        Digital Contacts — {digitalContacts.length} contacts
      </h3>
      <p className="text-[10px] text-text-muted">
        DMR ID and Call Type are editable. Names use proprietary encoding and cannot be changed.
      </p>
      <div className="overflow-auto border border-border rounded max-h-[calc(100vh-200px)]">
        <table className="w-full text-xs">
          <thead className="bg-surface-light sticky top-0">
            <tr>
              <th className="text-left px-3 py-2 text-text-muted font-medium w-12">#</th>
              <th className="text-left px-3 py-2 text-text-muted font-medium w-28">Call Type</th>
              <th className="text-right px-3 py-2 text-text-muted font-medium w-36">TG / DMR ID</th>
              <th className="text-left px-3 py-2 text-text-muted font-medium">Raw Data</th>
            </tr>
          </thead>
          <tbody>
            {digitalContacts.map(dc => (
              <tr key={dc.index} className="border-t border-border/50 hover:bg-surface-light/50">
                <td className="px-3 py-1.5 tabular-nums text-text-muted">{dc.index}</td>
                <td className="px-3 py-1">
                  <select
                    value={dc.callType}
                    onChange={e => onUpdateDigitalContact(dc.index, {
                      callType: e.target.value as 'group' | 'private',
                    })}
                    className={`text-[10px] px-1.5 py-0.5 rounded border border-border/50
                               bg-transparent cursor-pointer
                               focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30
                               ${CALL_TYPE_STYLE[dc.callType] || ''}`}
                  >
                    <option value="group">Group</option>
                    <option value="private">Private</option>
                  </select>
                </td>
                <td className="px-3 py-1">
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
                    className="w-full bg-transparent border border-border/50 rounded px-2 py-1 text-xs text-right tabular-nums
                               focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30
                               [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </td>
                <td className="px-3 py-1.5 font-mono text-[10px] text-text-muted">
                  {Array.from(dc._raw.slice(6, Math.min(18, dc._raw.byteLength)))
                    .map(b => b.toString(16).padStart(2, '0')).join(' ')}
                  {dc._raw.byteLength > 18 ? ' ...' : ''}
                </td>
              </tr>
            ))}
            {digitalContacts.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-center text-text-muted">
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
