import { useState, useRef } from 'react';
import type { GroupList, DigitalContact } from '../lib/types';
import { ConfirmDialog } from './ConfirmDialog';
import { useToast } from './Toast';

function EditableName({ value, onCommit, maxLen = 16 }: { value: string; onCommit: (val: string) => void; maxLen?: number }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (!editing) {
    return (
      <span
        className="cursor-pointer hover:bg-surface-lighter px-1.5 py-0.5 rounded-md"
        onClick={() => { setDraft(value); setEditing(true); }}
        title="Click to rename"
      >
        {value}
      </span>
    );
  }

  return (
    <input
      autoFocus
      type="text"
      value={draft}
      maxLength={maxLen}
      onChange={e => setDraft(e.target.value)}
      onBlur={() => { onCommit(draft); setEditing(false); }}
      onKeyDown={e => {
        if (e.key === 'Enter') { onCommit(draft); setEditing(false); }
        if (e.key === 'Escape') setEditing(false);
      }}
      className="bg-surface-lighter text-text text-sm px-1.5 py-0.5 rounded-md border border-border outline-none"
    />
  );
}

interface Props {
  groupLists: GroupList[];
  digitalContacts: DigitalContact[];
  onUpdateGroupList: (index: number, changes: Partial<GroupList>) => void;
  onAddGroupList: () => number;
  onDeleteGroupList: (index: number) => void;
}

export function GroupListEditor({ groupLists, digitalContacts, onUpdateGroupList, onAddGroupList, onDeleteGroupList }: Props) {
  const toast = useToast();
  const [selected, setSelected] = useState<number | null>(
    groupLists.length > 0 ? groupLists[0].index : null
  );
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  // Drag state
  const dragIdx = useRef<number | null>(null);
  const [dropIdx, setDropIdx] = useState<number | null>(null);

  const groupList = groupLists.find(gl => gl.index === selected);
  const assignedSet = new Set(groupList?.contactIndices ?? []);

  const unassigned = digitalContacts.filter(dc => !assignedSet.has(dc.index));

  const addContact = (contactIndex: number) => {
    if (!groupList) return;
    onUpdateGroupList(groupList.index, {
      contactIndices: [...groupList.contactIndices, contactIndex],
    });
  };

  const removeContact = (pos: number) => {
    if (!groupList) return;
    onUpdateGroupList(groupList.index, {
      contactIndices: groupList.contactIndices.filter((_, i) => i !== pos),
      _entryExtras: groupList._entryExtras.filter((_, i) => i !== pos),
    });
  };

  const renameGroupList = (index: number, val: string) => {
    const n = val.slice(0, 16);
    onUpdateGroupList(index, { name: n, _nameLen: n.length });
  };

  const handleDragStart = (pos: number) => {
    dragIdx.current = pos;
  };

  const handleDragOver = (e: React.DragEvent, pos: number) => {
    e.preventDefault();
    setDropIdx(pos);
  };

  const handleDrop = (pos: number) => {
    if (!groupList || dragIdx.current === null) return;
    const from = dragIdx.current;
    if (from === pos) { dragIdx.current = null; setDropIdx(null); return; }
    const indices = [...groupList.contactIndices];
    const extras = [...groupList._entryExtras];
    const [movedIdx] = indices.splice(from, 1);
    const [movedExtra] = extras.splice(from, 1);
    indices.splice(pos, 0, movedIdx);
    extras.splice(pos, 0, movedExtra);
    onUpdateGroupList(groupList.index, { contactIndices: indices, _entryExtras: extras });
    dragIdx.current = null;
    setDropIdx(null);
  };

  const handleDragEnd = () => {
    dragIdx.current = null;
    setDropIdx(null);
  };

  return (
    <div className="flex gap-4 h-full">
      {/* Group list selection */}
      <div className="w-56 shrink-0 space-y-1">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-text-muted">Group Lists</h3>
          <button
            onClick={() => {
              const idx = onAddGroupList();
              setSelected(idx);
              toast('Group list added');
            }}
            className="text-xs px-2 py-1 rounded-md bg-accent-green/15 text-accent-green hover:bg-accent-green/25 transition-colors"
          >
            + Add
          </button>
        </div>
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
              <EditableName
                value={gl.name || `Group List ${gl.index + 1}`}
                onCommit={val => renameGroupList(gl.index, val)}
              />
            </div>
            <span className="text-xs text-text-dimmed">{gl.contactIndices.length}</span>
          </button>
        ))}
        {groupLists.length === 0 && (
          <div className="text-sm text-text-dimmed px-3 py-6">No group lists configured</div>
        )}
      </div>

      {/* Group list detail */}
      {groupList ? (
        <div className="flex-1 flex gap-4">
          {/* Assigned contacts */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-text-muted flex items-center gap-1">
                <EditableName
                  value={groupList.name}
                  onCommit={val => renameGroupList(groupList.index, val)}
                />
                <span>— {groupList.contactIndices.length} contacts</span>
              </h3>
              <button
                onClick={() => setConfirmDelete(groupList.index)}
                className="text-xs px-2 py-1 rounded-md bg-accent-red/10 text-accent-red/70 hover:bg-accent-red/20 hover:text-accent-red transition-colors"
              >
                Delete
              </button>
            </div>
            <div className="overflow-auto rounded-xl border border-border max-h-[calc(100vh-200px)]" style={{ boxShadow: 'var(--shadow-sm)' }}>
              {groupList.contactIndices.map((cIdx, pos) => {
                const contact = digitalContacts.find(dc => dc.index === cIdx);
                return (
                  <div
                    key={`${cIdx}-${pos}`}
                    draggable
                    onDragStart={() => handleDragStart(pos)}
                    onDragOver={e => handleDragOver(e, pos)}
                    onDrop={() => handleDrop(pos)}
                    onDragEnd={handleDragEnd}
                    className={`relative flex items-center gap-2 px-4 py-2 border-b border-border-subtle text-sm hover:bg-surface-light/50 ${
                      dragIdx.current === pos ? 'opacity-50' : ''
                    }`}
                  >
                    {dropIdx === pos && dropIdx !== dragIdx.current && (
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary" />
                    )}
                    <span className="cursor-grab text-text-dimmed select-none" title="Drag to reorder">&#x2630;</span>
                    <span className="text-text-dimmed w-6 text-right font-mono text-xs">{pos + 1}</span>
                    <span className="flex-1">Contact #{cIdx}</span>
                    {contact && (
                      <span className="text-text-muted tabular-nums font-mono text-xs">
                        {contact.dmrId}
                      </span>
                    )}
                    {contact && (
                      <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                        contact.callType === 'group' ? 'bg-accent-cyan/20 text-accent-cyan' : 'bg-accent-amber/20 text-accent-amber'
                      }`}>
                        {contact.callType}
                      </span>
                    )}
                    <button
                      onClick={() => removeContact(pos)}
                      className="text-accent-red/70 hover:text-accent-red px-1 py-0.5 rounded hover:bg-accent-red/10"
                    >
                      &times;
                    </button>
                  </div>
                );
              })}
              {groupList.contactIndices.length === 0 && (
                <div className="px-4 py-6 text-sm text-text-dimmed text-center">
                  No contacts assigned. Add from the list on the right.
                </div>
              )}
            </div>
          </div>

          {/* Available contacts */}
          <div className="w-72 shrink-0 space-y-2">
            <h3 className="text-sm font-medium text-text-muted">Available</h3>
            <div className="overflow-auto rounded-xl border border-border max-h-[calc(100vh-200px)]" style={{ boxShadow: 'var(--shadow-sm)' }}>
              {unassigned.map(dc => (
                <div
                  key={dc.index}
                  className="flex items-center gap-2 px-4 py-2 border-b border-border-subtle text-sm hover:bg-surface-light/50 cursor-pointer"
                  onClick={() => addContact(dc.index)}
                >
                  <span className="flex-1">#{dc.index}</span>
                  <span className="text-text-muted tabular-nums font-mono text-xs">
                    {dc.dmrId}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                    dc.callType === 'group' ? 'bg-accent-cyan/20 text-accent-cyan' : 'bg-accent-amber/20 text-accent-amber'
                  }`}>
                    {dc.callType}
                  </span>
                  <span className="text-accent-green/70 text-xs">+ add</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-text-muted text-sm">
          Select a group list to edit
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete Group List"
        message={`Are you sure you want to delete "${groupLists.find(gl => gl.index === confirmDelete)?.name ?? ''}"? This cannot be undone.`}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete !== null) {
            onDeleteGroupList(confirmDelete);
            const remaining = groupLists.filter(gl => gl.index !== confirmDelete);
            setSelected(remaining.length > 0 ? remaining[0].index : null);
            toast('Group list deleted');
          }
          setConfirmDelete(null);
        }}
      />
    </div>
  );
}
