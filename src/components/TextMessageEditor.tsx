import type { TextMessage } from '../lib/types';

interface Props {
  textMessages: TextMessage[];
  onUpdateTextMessage: (index: number, text: string) => void;
}

export function TextMessageEditor({ textMessages, onUpdateTextMessage }: Props) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-text-muted">
        Text Messages — {textMessages.length} messages
      </h3>
      <div className="overflow-auto rounded-xl border border-border max-h-[calc(100vh-200px)]" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <table className="w-full text-sm">
          <thead className="bg-surface-light sticky top-0">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-text-muted w-16">#</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-text-muted">Message</th>
            </tr>
          </thead>
          <tbody>
            {textMessages.map(msg => (
              <tr key={msg.index} className="border-t border-border-subtle hover:bg-surface-light/50">
                <td className="px-4 py-2 tabular-nums font-mono text-xs text-text-dimmed">{msg.index + 1}</td>
                <td className="px-4 py-2">
                  <input
                    type="text"
                    value={msg.text}
                    onChange={e => onUpdateTextMessage(msg.index, e.target.value)}
                    className="w-full bg-transparent border border-border-subtle rounded-md px-3 py-1.5 text-sm
                               focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
                    maxLength={144}
                  />
                </td>
              </tr>
            ))}
            {textMessages.length === 0 && (
              <tr>
                <td colSpan={2} className="px-4 py-6 text-center text-text-dimmed text-sm">
                  No text messages configured
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
