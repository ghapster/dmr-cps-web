import { useState, useEffect, useCallback } from 'react';
import type { ActiveSection } from './lib/types';
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
import { GroupListViewer } from './components/GroupListViewer';
import { AprsEditor } from './components/AprsEditor';
import { RoamingViewer } from './components/RoamingViewer';

function App() {
  const {
    codeplug, fileName, dirty, issues,
    openFile, saveFile, exportCsv,
    updateChannel, deleteChannels, duplicateChannel,
    updateZone, updateRadioId, updateTextMessage,
    updateDigitalContact, updateAprsSettings,
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
          <div className="text-center space-y-4">
            <div className="text-6xl opacity-20">&#x1F4E1;</div>
            <h2 className="text-lg text-text-muted">DMR CPS — Web Edition</h2>
            <p className="text-sm text-text-muted max-w-md">
              Open an Anytone D578UV .RDT codeplug file to get started.
              <br />
              Drag and drop or use the Open button above.
            </p>
            {error && (
              <div className="mt-4 px-4 py-2 bg-accent-red/10 border border-accent-red/30 rounded text-accent-red text-xs">
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
          <GroupListViewer
            groupLists={codeplug.groupLists}
            digitalContacts={codeplug.digitalContacts}
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
        <div className="px-4 py-1.5 bg-accent-red/10 border-b border-accent-red/30 text-accent-red text-xs">
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
