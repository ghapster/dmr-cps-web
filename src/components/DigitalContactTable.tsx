import type { DigitalContact } from '../lib/types';

interface Props {
  digitalContacts: DigitalContact[];
}

const CALL_TYPE_STYLE: Record<string, string> = {
  group: 'bg-accent-cyan/20 text-accent-cyan',
  private: 'bg-accent-amber/20 text-accent-amber',
  all: 'bg-purple-500/20 text-purple-400',
};

export function DigitalContactTable({ digitalContacts }: Props) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs text-text-muted uppercase tracking-wider">
        Digital Contacts — {digitalContacts.length} contacts
      </h3>
      <p className="text-[10px] text-text-muted">
        Digital contacts are read-only. Encoded data preserved for round-trip fidelity.
      </p>
      <div className="overflow-auto border border-border rounded max-h-[calc(100vh-200px)]">
        <table className="w-full text-xs">
          <thead className="bg-surface-light sticky top-0">
            <tr>
              <th className="text-left px-3 py-2 text-text-muted font-medium w-16">#</th>
              <th className="text-left px-3 py-2 text-text-muted font-medium w-24">Call Type</th>
              <th className="text-left px-3 py-2 text-text-muted font-medium">Raw Data</th>
            </tr>
          </thead>
          <tbody>
            {digitalContacts.map(dc => (
              <tr key={dc.index} className="border-t border-border/50 hover:bg-surface-light/50">
                <td className="px-3 py-1.5 tabular-nums">{dc.index}</td>
                <td className="px-3 py-1.5">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${CALL_TYPE_STYLE[dc.callType] || ''}`}>
                    {dc.callType}
                  </span>
                </td>
                <td className="px-3 py-1.5 font-mono text-[10px] text-text-muted">
                  {Array.from(dc._raw.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' ')}
                  {dc._raw.byteLength > 16 ? ' ...' : ''}
                </td>
              </tr>
            ))}
            {digitalContacts.length === 0 && (
              <tr>
                <td colSpan={3} className="px-3 py-4 text-center text-text-muted">
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
