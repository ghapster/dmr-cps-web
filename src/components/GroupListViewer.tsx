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
        <h3 className="text-sm font-medium text-text-muted mb-3">Group Lists</h3>
        {groupLists.map(gl => (
          <button
            key={gl.index}
            onClick={() => setSelected(gl.index)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex justify-between ${
              selected === gl.index
                ? 'bg-surface-lighter text-text'
                : 'text-text-muted hover:bg-surface-light hover:text-text'
            }`}
          >
            <div className="flex items-center gap-2">
              {selected === gl.index && (
                <div className="w-0.5 h-4 bg-primary rounded-full shrink-0" />
              )}
              <span>{gl.name || `Group List ${gl.index + 1}`}</span>
            </div>
            <span className="text-xs text-text-dimmed">{gl.contactIndices.length}</span>
          </button>
        ))}
        {groupLists.length === 0 && (
          <div className="text-sm text-text-dimmed px-3 py-6">No group lists configured</div>
        )}
      </div>

      {/* Detail */}
      {groupList ? (
        <div className="flex-1 space-y-3">
          <h3 className="text-sm font-medium text-text-muted">
            {groupList.name} — {groupList.contactIndices.length} contacts
          </h3>
          <p className="text-xs text-text-dimmed">
            Read-only. References digital contact indices.
          </p>
          <div className="overflow-auto rounded-xl border border-border max-h-[calc(100vh-220px)]" style={{ boxShadow: 'var(--shadow-sm)' }}>
            {groupList.contactIndices.map((cIdx, pos) => {
              const contact = digitalContacts.find(dc => dc.index === cIdx);
              return (
                <div
                  key={`${cIdx}-${pos}`}
                  className="flex items-center gap-2 px-4 py-2 border-b border-border-subtle text-sm"
                >
                  <span className="text-text-dimmed w-6 text-right font-mono text-xs">{pos + 1}</span>
                  <span className="flex-1">Contact #{cIdx}</span>
                  {contact && (
                    <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                      contact.callType === 'group' ? 'bg-accent-cyan/20 text-accent-cyan' : 'bg-accent-amber/20 text-accent-amber'
                    }`}>
                      {contact.callType}
                    </span>
                  )}
                </div>
              );
            })}
            {groupList.contactIndices.length === 0 && (
              <div className="px-4 py-6 text-sm text-text-dimmed text-center">
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
