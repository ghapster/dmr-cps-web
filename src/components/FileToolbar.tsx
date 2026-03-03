import { useRef } from 'react';
import type { RadioStatus } from '../hooks/useRadio';

interface Props {
  fileName: string | null;
  dirty: boolean;
  hasCodeplug: boolean;
  onOpen: (file: File) => void;
  onSave: () => void;
  onExportCsv: () => void;
  onImportCsv: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  // Radio props
  radioSupported: boolean;
  radioStatus: RadioStatus;
  radioModel: string | null;
  radioProgress: number | null;
  radioProgressLabel: string | null;
  radioError: string | null;
  onRadioConnect: () => void;
  onRadioDisconnect: () => void;
  onRadioRead: () => void;
  onRadioWrite: () => void;
}

export function FileToolbar({
  fileName, dirty, hasCodeplug, onOpen, onSave, onExportCsv, onImportCsv,
  onUndo, onRedo, canUndo, canRedo,
  radioSupported, radioStatus, radioModel, radioProgress, radioProgressLabel, radioError,
  onRadioConnect, onRadioDisconnect, onRadioRead, onRadioWrite,
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

  const isConnected = radioStatus === 'connected';
  const isBusy = radioStatus === 'reading' || radioStatus === 'writing' || radioStatus === 'connecting';

  return (
    <>
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
          <span className="text-xs font-medium text-text-dimmed">V2.11</span>
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
          <button
            onClick={onImportCsv}
            disabled={!hasCodeplug}
            className="px-4 py-1.5 text-sm bg-surface-lighter hover:bg-zinc-700 border border-border rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Import CSV
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

        {/* Radio controls — hidden when Web Serial not supported */}
        {radioSupported && (
          <div className="flex items-center gap-1.5 ml-2 border-l border-border pl-3">
            {!isConnected && !isBusy && radioStatus !== 'error' && (
              <button
                onClick={onRadioConnect}
                className="px-3 py-1.5 text-sm bg-accent-green/20 hover:bg-accent-green/30 text-accent-green border border-accent-green/30 rounded-md transition-colors"
              >
                Connect Radio
              </button>
            )}
            {radioStatus === 'error' && (
              <>
                <button
                  onClick={onRadioConnect}
                  className="px-3 py-1.5 text-sm bg-accent-red/20 hover:bg-accent-red/30 text-accent-red border border-accent-red/30 rounded-md transition-colors"
                >
                  Reconnect
                </button>
                {radioError && (
                  <span className="text-xs text-accent-red max-w-xs truncate" title={radioError}>
                    {radioError}
                  </span>
                )}
              </>
            )}
            {(isConnected || isBusy) && (
              <>
                <button
                  onClick={onRadioRead}
                  disabled={!isConnected}
                  className="px-3 py-1.5 text-sm bg-surface-lighter hover:bg-zinc-700 border border-border rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Read codeplug from radio"
                >
                  Read
                </button>
                <button
                  onClick={onRadioWrite}
                  disabled={!isConnected || !hasCodeplug}
                  className="px-3 py-1.5 text-sm bg-surface-lighter hover:bg-zinc-700 border border-border rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Write codeplug to radio"
                >
                  Write
                </button>
                <button
                  onClick={onRadioDisconnect}
                  disabled={isBusy}
                  className="px-3 py-1.5 text-sm text-text-dimmed hover:text-text-muted transition-colors disabled:opacity-40"
                  title="Disconnect radio"
                >
                  Disconnect
                </button>
                {radioModel && (
                  <span className="text-xs text-accent-green ml-1">{radioModel}</span>
                )}
              </>
            )}
            {radioStatus === 'connecting' && (
              <span className="text-xs text-text-dimmed animate-pulse">
                {radioProgressLabel || 'Connecting...'}
              </span>
            )}
          </div>
        )}

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

      {/* Progress bar during read/write */}
      {radioProgress !== null && (
        <div className="h-1 bg-surface-lighter relative">
          <div
            className="h-full bg-primary transition-all duration-200"
            style={{ width: `${radioProgress}%` }}
          />
          {radioProgressLabel && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[10px] text-text-dimmed leading-none">{radioProgressLabel}</span>
            </div>
          )}
        </div>
      )}
    </>
  );
}
