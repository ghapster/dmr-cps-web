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
        <h3 className="text-xs text-text-muted uppercase tracking-wider mb-2">Radio IDs (DMR)</h3>
        <div className="overflow-auto rounded border border-border">
          <table className="w-full text-xs">
            <thead className="bg-surface-light">
              <tr>
                <th className="px-3 py-1.5 text-left text-[10px] uppercase tracking-wider text-text-muted w-12">#</th>
                <th className="px-3 py-1.5 text-left text-[10px] uppercase tracking-wider text-text-muted">DMR ID</th>
                <th className="px-3 py-1.5 text-left text-[10px] uppercase tracking-wider text-text-muted">Name</th>
              </tr>
            </thead>
            <tbody>
              {radioIds.map(rid => (
                <tr key={rid.index} className="border-t border-border/50 hover:bg-surface-light/50">
                  <td className="px-3 py-1.5 text-text-muted">{rid.index}</td>
                  <td className="px-3 py-1.5 tabular-nums font-medium">
                    <input
                      type="number"
                      value={rid.dmrId}
                      onChange={e => {
                        const v = parseInt(e.target.value);
                        if (!isNaN(v) && v > 0) onUpdateRadioId(rid.index, { dmrId: v });
                      }}
                      className="bg-transparent border-none outline-none text-xs w-28 tabular-nums"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      type="text"
                      value={rid.name}
                      onChange={e => onUpdateRadioId(rid.index, { name: e.target.value.slice(0, 16) })}
                      className="bg-transparent border-none outline-none text-xs w-48"
                    />
                  </td>
                </tr>
              ))}
              {radioIds.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-3 py-4 text-center text-text-muted">
                    No radio IDs configured
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Analog Contacts */}
      <div>
        <h3 className="text-xs text-text-muted uppercase tracking-wider mb-2">Analog Contacts</h3>
        <div className="overflow-auto rounded border border-border">
          <table className="w-full text-xs">
            <thead className="bg-surface-light">
              <tr>
                <th className="px-3 py-1.5 text-left text-[10px] uppercase tracking-wider text-text-muted w-12">#</th>
                <th className="px-3 py-1.5 text-left text-[10px] uppercase tracking-wider text-text-muted">Name</th>
              </tr>
            </thead>
            <tbody>
              {analogContacts.map(ac => (
                <tr key={ac.index} className="border-t border-border/50 hover:bg-surface-light/50">
                  <td className="px-3 py-1.5 text-text-muted">{ac.index}</td>
                  <td className="px-3 py-1.5">{ac.name}</td>
                </tr>
              ))}
              {analogContacts.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-3 py-4 text-center text-text-muted">
                    No analog contacts
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
