import { useState, useEffect, useCallback } from 'react';
import type { ActiveSection } from './lib/types';
import { createDefaultChannel } from './lib/rdt-writer';
import { useCodeplug } from './hooks/useCodeplug';
import { FileToolbar } from './components/FileToolbar';
import { AppShell } from './components/AppShell';
import { ChannelTable } from './components/ChannelTable';
import { ZoneEditor } from './components/ZoneEditor';
import { ContactTable } from './components/ContactTable';
import { ScanListEditor } from './components/ScanListEditor';
import { SettingsViewer } from './components/SettingsViewer';
import { DigitalContactEditor } from './components/DigitalContactEditor';
import { TextMessageEditor } from './components/TextMessageEditor';
import { GroupListEditor } from './components/GroupListEditor';
import { AprsEditor } from './components/AprsEditor';
import { RoamingViewer } from './components/RoamingViewer';

function App() {
  const {
    codeplug, fileName, dirty, issues,
    openFile, saveFile, exportCsv,
    updateChannel, deleteChannels, addChannel, duplicateChannel,
    updateZone, updateRadioId, updateTextMessage,
    updateDigitalContact, updateAprsSettings,
    updateScanList, updateGroupList,
    undo, redo, canUndo, canRedo,
  } = useCodeplug();

  const [section, setSection] = useState<ActiveSection>('channels');
  const [error, setError] = useState<string | null>(null);

  const handleOpen = useCallback(async (file: File) => {
    try {
      setError(null);
      await openFile(file);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to parse file');
    }
  }, [openFile]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveFile(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo, saveFile]);

  // Drag-and-drop on the whole page
  useEffect(() => {
    const onDragOver = (e: DragEvent) => e.preventDefault();
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer?.files[0];
      if (file?.name.toLowerCase().endsWith('.rdt')) handleOpen(file);
    };
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('drop', onDrop);
    };
  }, [handleOpen]);

  const renderContent = () => {
    if (!codeplug) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <svg viewBox="0 0 24 24" className="w-16 h-16 text-text-dimmed opacity-40" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path d="M5.636 18.364a9 9 0 0 1 0-12.728M18.364 5.636a9 9 0 0 1 0 12.728" />
                <path d="M8.464 15.536a5 5 0 0 1 0-7.072M15.536 8.464a5 5 0 0 1 0 7.072" />
                <circle cx="12" cy="12" r="1.5" fill="currentColor" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-medium text-text mb-2">DMR CPS — Web Edition</h2>
              <p className="text-base text-text-muted max-w-md">
                Open an Anytone D578UV .RDT codeplug file to get started.
              </p>
            </div>
            <div className="border-2 border-dashed border-border rounded-xl px-8 py-6">
              <p className="text-sm text-text-dimmed">
                Drag and drop a file here, or use the Open button above
              </p>
            </div>
            {error && (
              <div className="mt-4 px-5 py-3 bg-accent-red/10 border border-accent-red/30 rounded-lg text-accent-red text-sm">
                {error}
              </div>
            )}
          </div>
        </div>
      );
    }

    switch (section) {
      case 'channels':
        return (
          <ChannelTable
            channels={codeplug.channels}
            onUpdateChannel={updateChannel}
            onDeleteChannels={deleteChannels}
            onDuplicateChannel={duplicateChannel}
            onAddChannel={() => addChannel(createDefaultChannel(codeplug.channels))}
          />
        );
      case 'zones':
        return (
          <ZoneEditor
            zones={codeplug.zones}
            channels={codeplug.channels}
            onUpdateZone={updateZone}
          />
        );
      case 'radioIds':
        return (
          <ContactTable
            radioIds={codeplug.radioIds}
            analogContacts={[]}
            onUpdateRadioId={updateRadioId}
          />
        );
      case 'contacts':
        return (
          <ContactTable
            radioIds={[]}
            analogContacts={codeplug.analogContacts}
            onUpdateRadioId={updateRadioId}
          />
        );
      case 'scanLists':
        return (
          <ScanListEditor
            scanLists={codeplug.scanLists}
            channels={codeplug.channels}
            onUpdateScanList={updateScanList}
          />
        );
      case 'digitalContacts':
        return (
          <DigitalContactEditor
            digitalContacts={codeplug.digitalContacts}
            onUpdateDigitalContact={updateDigitalContact}
          />
        );
      case 'textMessages':
        return (
          <TextMessageEditor
            textMessages={codeplug.textMessages}
            onUpdateTextMessage={updateTextMessage}
          />
        );
      case 'groupLists':
        return (
          <GroupListEditor
            groupLists={codeplug.groupLists}
            digitalContacts={codeplug.digitalContacts}
            onUpdateGroupList={updateGroupList}
          />
        );
      case 'aprs':
        return (
          <AprsEditor
            aprsSettings={codeplug.aprsSettings}
            onUpdateAprs={updateAprsSettings}
          />
        );
      case 'roaming':
        return (
          <RoamingViewer
            roamingChannels={codeplug.roamingChannels}
            roamingZones={codeplug.roamingZones}
          />
        );
      case 'settings':
        return (
          <SettingsViewer
            header={codeplug.header}
            settingsBlock={codeplug.settingsBlock}
          />
        );
    }
  };

  return (
    <>
      <FileToolbar
        fileName={fileName}
        dirty={dirty}
        hasCodeplug={codeplug !== null}
        onOpen={handleOpen}
        onSave={saveFile}
        onExportCsv={exportCsv}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
      />
      {error && codeplug && (
        <div className="px-5 py-2 bg-accent-red/10 border-b border-accent-red/30 text-accent-red text-sm">
          {error}
        </div>
      )}
      {codeplug ? (
        <AppShell
          activeSection={section}
          onSectionChange={setSection}
          codeplug={codeplug}
          issues={issues}
        >
          {renderContent()}
        </AppShell>
      ) : (
        renderContent()
      )}
    </>
  );
}

export default App;
