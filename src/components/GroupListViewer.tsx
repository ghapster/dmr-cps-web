import { useState } from 'react';
import type { GroupList, DigitalContact } from '../lib/types';

interface Props {
  groupLists: GroupList[];
  digitalContacts: DigitalContact[];
}

export function GroupListViewer({ groupLists, digitalContacts }: Props) {
  const [selected, setSelected] = useState<number | null>(
    groupLists.length > 0 ? groupLists[0].index : null
  );

  const groupList = groupLists.find(gl => gl.index === selected);

  return (
    <div className="flex gap-4 h-full">
      {/* List */}
      <div className="w-56 shrink-0 space-y-1">
        <h3 className="text-xs text-text-muted uppercase tracking-wider mb-2">Group Lists</h3>
        {groupLists.map(gl => (
          <button
            key={gl.index}
            onClick={() => setSelected(gl.index)}
            className={`w-full text-left px-3 py-2 rounded text-sm transition-colors flex justify-between ${
              selected === gl.index
                ? 'bg-primary/20 text-primary-light'
                : 'text-text hover:bg-surface-light'
            }`}
          >
            <span>{gl.name || `Group List ${gl.index + 1}`}</span>
            <span className="text-[10px] text-text-muted">{gl.contactIndices.length}</span>
          </button>
        ))}
        {groupLists.length === 0 && (
          <div className="text-xs text-text-muted px-3 py-4">No group lists configured</div>
        )}
      </div>

      {/* Detail */}
      {groupList ? (
        <div className="flex-1 space-y-2">
          <h3 className="text-xs text-text-muted uppercase tracking-wider">
            {groupList.name} — {groupList.contactIndices.length} contacts
          </h3>
          <div className="text-[10px] text-text-muted mb-2">
            Group list editing is read-only. References digital contact indices.
          </div>
          <div className="overflow-auto border border-border rounded max-h-[calc(100vh-220px)]">
            {groupList.contactIndices.map((cIdx, pos) => {
              const contact = digitalContacts.find(dc => dc.index === cIdx);
              return (
                <div
                  key={`${cIdx}-${pos}`}
                  className="flex items-center gap-2 px-3 py-1.5 border-b border-border/50 text-xs"
                >
                  <span className="text-text-muted w-6 text-right">{pos + 1}</span>
                  <span className="flex-1">Contact #{cIdx}</span>
                  {contact && (
                    <span className={`text-[10px] px-1 rounded ${
                      contact.callType === 'group' ? 'bg-accent-cyan/20 text-accent-cyan' : 'bg-accent-amber/20 text-accent-amber'
                    }`}>
                      {contact.callType}
                    </span>
                  )}
                </div>
              );
            })}
            {groupList.contactIndices.length === 0 && (
              <div className="px-3 py-4 text-xs text-text-muted text-center">
                No contacts in this group list
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-text-muted text-sm">
          Select a group list to view
        </div>
      )}
    </div>
  );
}
