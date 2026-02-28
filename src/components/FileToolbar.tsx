import { useRef } from 'react';

interface Props {
  fileName: string | null;
  dirty: boolean;
  hasCodeplug: boolean;
  onOpen: (file: File) => void;
  onSave: () => void;
  onExportCsv: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function FileToolbar({
  fileName, dirty, hasCodeplug, onOpen, onSave, onExportCsv,
  onUndo, onRedo, canUndo, canRedo,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onOpen(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.name.toLowerCase().endsWith('.rdt')) onOpen(file);
  };

  return (
    <header
      className="flex items-center gap-2 px-5 py-3 bg-surface"
      style={{ boxShadow: 'var(--shadow-sm)' }}
      onDragOver={e => e.preventDefault()}
      onDrop={handleDrop}
    >
      <div className="flex items-center gap-2">
        <svg viewBox="0 0 24 24" className="w-7 h-7 text-primary-light" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M5.636 18.364a9 9 0 0 1 0-12.728M18.364 5.636a9 9 0 0 1 0 12.728" />
          <path d="M8.464 15.536a5 5 0 0 1 0-7.072M15.536 8.464a5 5 0 0 1 0 7.072" />
          <circle cx="12" cy="12" r="1" fill="currentColor" />
        </svg>
        <span className="text-sm font-semibold text-primary-light tracking-wide">DMR CPS</span>
        <span className="text-xs font-medium text-text-dimmed">V1.2</span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".rdt"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="flex items-center gap-1.5 ml-4">
        <button
          onClick={() => inputRef.current?.click()}
          className="px-4 py-1.5 text-sm bg-primary hover:bg-primary-light text-white rounded-md transition-colors"
        >
          Open .RDT
        </button>

        <button
          onClick={onSave}
          disabled={!hasCodeplug}
          className="px-4 py-1.5 text-sm bg-surface-lighter hover:bg-zinc-700 border border-border rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Save
        </button>

        <button
          onClick={onExportCsv}
          disabled={!hasCodeplug}
          className="px-4 py-1.5 text-sm bg-surface-lighter hover:bg-zinc-700 border border-border rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Export CSV
        </button>
      </div>

      <div className="flex items-center gap-1 ml-2">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="px-3 py-1.5 text-sm bg-surface-lighter hover:bg-zinc-700 border border-border rounded-md transition-colors disabled:opacity-40"
          title="Undo (Ctrl+Z)"
        >
          Undo
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="px-3 py-1.5 text-sm bg-surface-lighter hover:bg-zinc-700 border border-border rounded-md transition-colors disabled:opacity-40"
          title="Redo (Ctrl+Y)"
        >
          Redo
        </button>
      </div>

      <div className="flex-1" />

      {fileName && (
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <span className="text-text">{fileName}</span>
          {dirty && (
            <span className="text-xs text-accent-amber bg-accent-amber/10 px-2 py-0.5 rounded-md">
              Modified
            </span>
          )}
        </div>
      )}

      <span className="text-xs text-text-dimmed ml-2">D578UV</span>
    </header>
  );
}
