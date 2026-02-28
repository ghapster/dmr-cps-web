import type { RadioId, AnalogContact } from '../lib/types';

interface Props {
  radioIds: RadioId[];
  analogContacts: AnalogContact[];
  onUpdateRadioId: (index: number, changes: Partial<RadioId>) => void;
}

export function ContactTable({ radioIds, analogContacts, onUpdateRadioId }: Props) {
  return (
    <div className="space-y-6">
      {/* Radio IDs */}
      <div>
        <h3 className="text-sm font-medium text-text-muted mb-3">Radio IDs (DMR)</h3>
        <div className="overflow-auto rounded-xl border border-border" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <table className="w-full text-sm">
            <thead className="bg-surface-light">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted w-12">#</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted">DMR ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted">Name</th>
              </tr>
            </thead>
            <tbody>
              {radioIds.map(rid => (
                <tr key={rid.index} className="border-t border-border-subtle hover:bg-surface-light/50">
                  <td className="px-4 py-2 text-text-dimmed font-mono text-xs">{rid.index}</td>
                  <td className="px-4 py-2 tabular-nums font-medium">
                    <input
                      type="number"
                      value={rid.dmrId}
                      onChange={e => {
                        const v = parseInt(e.target.value);
                        if (!isNaN(v) && v > 0) onUpdateRadioId(rid.index, { dmrId: v });
                      }}
                      className="bg-transparent border-none outline-none text-sm w-28 tabular-nums font-mono"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={rid.name}
                      onChange={e => onUpdateRadioId(rid.index, { name: e.target.value.slice(0, 16) })}
                      className="bg-transparent border-none outline-none text-sm w-48"
                    />
                  </td>
                </tr>
              ))}
              {radioIds.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-text-dimmed text-sm">
                    No radio IDs configured
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DTMF Contacts */}
      <div>
        <h3 className="text-sm font-medium text-text-muted mb-3">DTMF Contacts</h3>
        <div className="overflow-auto rounded-xl border border-border" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <table className="w-full text-sm">
            <thead className="bg-surface-light">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted w-12">#</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted">Code</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted">Name</th>
              </tr>
            </thead>
            <tbody>
              {analogContacts.map(ac => (
                <tr key={ac.index} className="border-t border-border-subtle hover:bg-surface-light/50">
                  <td className="px-4 py-2 text-text-dimmed font-mono text-xs">{ac.index}</td>
                  <td className="px-4 py-2 tabular-nums font-medium font-mono">{ac.code}</td>
                  <td className="px-4 py-2">{ac.name}</td>
                </tr>
              ))}
              {analogContacts.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-text-dimmed text-sm">
                    No DTMF contacts
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
