import type { TextMessage } from '../lib/types';

interface Props {
  textMessages: TextMessage[];
  onUpdateTextMessage: (index: number, text: string) => void;
}

export function TextMessageEditor({ textMessages, onUpdateTextMessage }: Props) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs text-text-muted uppercase tracking-wider">
        Text Messages — {textMessages.length} messages
      </h3>
      <div className="overflow-auto border border-border rounded max-h-[calc(100vh-200px)]">
        <table className="w-full text-xs">
          <thead className="bg-surface-light sticky top-0">
            <tr>
              <th className="text-left px-3 py-2 text-text-muted font-medium w-16">#</th>
              <th className="text-left px-3 py-2 text-text-muted font-medium">Message</th>
            </tr>
          </thead>
          <tbody>
            {textMessages.map(msg => (
              <tr key={msg.index} className="border-t border-border/50 hover:bg-surface-light/50">
                <td className="px-3 py-1.5 tabular-nums">{msg.index + 1}</td>
                <td className="px-3 py-1">
                  <input
                    type="text"
                    value={msg.text}
                    onChange={e => onUpdateTextMessage(msg.index, e.target.value)}
                    className="w-full bg-transparent border border-border/50 rounded px-2 py-1 text-xs
                               focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
                    maxLength={144}
                  />
                </td>
              </tr>
            ))}
            {textMessages.length === 0 && (
              <tr>
                <td colSpan={2} className="px-3 py-4 text-center text-text-muted">
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
