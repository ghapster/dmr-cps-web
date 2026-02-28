import type { TextMessage } from '../lib/types';
import { useToast } from './Toast';

interface Props {
  textMessages: TextMessage[];
  onUpdateTextMessage: (index: number, text: string) => void;
  onAddTextMessage: () => void;
  onDeleteTextMessage: (index: number) => void;
}

export function TextMessageEditor({ textMessages, onUpdateTextMessage, onAddTextMessage, onDeleteTextMessage }: Props) {
  const toast = useToast();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-text-muted">
          Text Messages — {textMessages.length} messages
        </h3>
        <button
          onClick={() => { onAddTextMessage(); toast('Message added'); }}
          className="text-xs px-2 py-1 rounded-md bg-accent-green/15 text-accent-green hover:bg-accent-green/25 transition-colors"
        >
          + Add
        </button>
      </div>
      <div className="overflow-auto rounded-xl border border-border max-h-[calc(100vh-200px)]" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <table className="w-full text-sm">
          <thead className="bg-surface-light sticky top-0">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-text-muted w-16">#</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-text-muted">Message</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-text-muted w-16"></th>
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
                <td className="px-4 py-2 text-right">
                  <button
                    onClick={() => { onDeleteTextMessage(msg.index); toast('Message deleted'); }}
                    className="text-accent-red/70 hover:text-accent-red px-1 py-0.5 rounded hover:bg-accent-red/10"
                  >
                    &times;
                  </button>
                </td>
              </tr>
            ))}
            {textMessages.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-text-dimmed text-sm">
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
