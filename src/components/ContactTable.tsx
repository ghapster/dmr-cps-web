import type { RadioId, AnalogContact } from '../lib/types';

interface Props {
  radioIds: RadioId[];
  analogContacts: AnalogContact[];
  onUpdateRadioId: (index: number, changes: Partial<RadioId>) => void;
  onUpdateAnalogContact?: (index: number, changes: Partial<AnalogContact>) => void;
  onAddRadioId?: () => void;
  onDeleteRadioId?: (index: number) => void;
  onAddAnalogContact?: () => void;
  onDeleteAnalogContact?: (index: number) => void;
}

export function ContactTable({
  radioIds, analogContacts, onUpdateRadioId, onUpdateAnalogContact,
  onAddRadioId, onDeleteRadioId, onAddAnalogContact, onDeleteAnalogContact,
}: Props) {
  return (
    <div className="space-y-6">
      {/* Radio IDs */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-text-muted">Radio IDs (DMR)</h3>
          {onAddRadioId && (
            <button
              onClick={onAddRadioId}
              className="text-xs px-2 py-1 rounded-md bg-accent-green/15 text-accent-green hover:bg-accent-green/25 transition-colors"
            >
              + Add
            </button>
          )}
        </div>
        <div className="overflow-auto rounded-xl border border-border" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <table className="w-full text-sm">
            <thead className="bg-surface-light">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted w-12">#</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted">DMR ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted">Name</th>
                {onDeleteRadioId && (
                  <th className="px-4 py-3 text-right text-xs font-medium text-text-muted w-16"></th>
                )}
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
                  {onDeleteRadioId && (
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => onDeleteRadioId(rid.index)}
                        className="text-accent-red/70 hover:text-accent-red px-1 py-0.5 rounded hover:bg-accent-red/10"
                      >
                        &times;
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {radioIds.length === 0 && (
                <tr>
                  <td colSpan={onDeleteRadioId ? 4 : 3} className="px-4 py-6 text-center text-text-dimmed text-sm">
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
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-text-muted">DTMF Contacts</h3>
          {onAddAnalogContact && (
            <button
              onClick={onAddAnalogContact}
              className="text-xs px-2 py-1 rounded-md bg-accent-green/15 text-accent-green hover:bg-accent-green/25 transition-colors"
            >
              + Add
            </button>
          )}
        </div>
        <div className="overflow-auto rounded-xl border border-border" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <table className="w-full text-sm">
            <thead className="bg-surface-light">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted w-12">#</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted">Code</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted">Name</th>
                {onDeleteAnalogContact && (
                  <th className="px-4 py-3 text-right text-xs font-medium text-text-muted w-16"></th>
                )}
              </tr>
            </thead>
            <tbody>
              {analogContacts.map(ac => (
                <tr key={ac.index} className="border-t border-border-subtle hover:bg-surface-light/50">
                  <td className="px-4 py-2 text-text-dimmed font-mono text-xs">{ac.index}</td>
                  <td className="px-4 py-2 tabular-nums font-medium font-mono">
                    <input
                      type="text"
                      value={ac.code}
                      onChange={e => onUpdateAnalogContact?.(ac.index, { code: e.target.value.slice(0, ac._codeLen) })}
                      className="bg-transparent border-none outline-none text-sm w-28 tabular-nums font-mono"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={ac.name}
                      onChange={e => onUpdateAnalogContact?.(ac.index, { name: e.target.value.slice(0, 16) })}
                      className="bg-transparent border-none outline-none text-sm w-48"
                    />
                  </td>
                  {onDeleteAnalogContact && (
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => onDeleteAnalogContact(ac.index)}
                        className="text-accent-red/70 hover:text-accent-red px-1 py-0.5 rounded hover:bg-accent-red/10"
                      >
                        &times;
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {analogContacts.length === 0 && (
                <tr>
                  <td colSpan={onDeleteAnalogContact ? 4 : 3} className="px-4 py-6 text-center text-text-dimmed text-sm">
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
