import { useState, useEffect, useCallback } from 'react';
import type { ActiveSection } from './lib/types';
import {
  writeRdt,
  createDefaultChannel, createDefaultZone, createDefaultScanList, createDefaultGroupList,
  createDefaultRadioId, createDefaultAnalogContact, createDefaultTextMessage,
  createDefaultRoamingChannel, createDefaultRoamingZone,
} from './lib/rdt-writer';
import { useCodeplug } from './hooks/useCodeplug';
import { useRadio } from './hooks/useRadio';
import { useToast } from './components/Toast';
import { getGitHubToken, pushToGitHub } from './lib/storage';
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
import { RoamingEditor } from './components/RoamingEditor';
import { TalkgroupLookup } from './components/TalkgroupLookup';
import { ConfirmDialog } from './components/ConfirmDialog';
import { CsvImportModal } from './components/CsvImportModal';

function App() {
  const toast = useToast();
  const {
    codeplug, fileName, dirty, issues,
    openFile, saveFile, exportCsv,
    updateChannel, deleteChannels, addChannel, bulkUpdateChannels, duplicateChannel,
    addZone, deleteZone, updateZone,
    addRadioId, deleteRadioId, updateRadioId,
    addTextMessage, deleteTextMessage, updateTextMessage,
    updateDigitalContact, addDigitalContacts, updateAprsSettings, updateSettings, updateGeneralSettings,
    addScanList, deleteScanList, updateScanList,
    addGroupList, deleteGroupList, updateGroupList,
    addAnalogContact, deleteAnalogContact, updateAnalogContact,
    addRoamingChannel, deleteRoamingChannel, updateRoamingChannel,
    addRoamingZone, deleteRoamingZone, updateRoamingZone,
    importChannels, loadCodeplug,
    loadPersistedCodeplug,
    undo, redo, canUndo, canRedo,
  } = useCodeplug();

  const radio = useRadio();

  const [section, setSection] = useState<ActiveSection>('channels');
  const [error, setError] = useState<string | null>(null);
  const [showWriteConfirm, setShowWriteConfirm] = useState(false);
  const [showCsvImport, setShowCsvImport] = useState(false);

  // Auto-load persisted codeplug on mount
  useEffect(() => {
    loadPersistedCodeplug().then(result => {
      if (result) toast(`Restored ${result.fileName}`, 'info');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpen = useCallback(async (file: File) => {
    try {
      setError(null);
      await openFile(file);
      toast(`Opened ${file.name}`, 'info');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to parse file');
    }
  }, [openFile, toast]);

  const handleSave = useCallback(() => {
    saveFile();
    toast('File saved');
  }, [saveFile, toast]);

  const handleExportCsv = useCallback(() => {
    exportCsv();
    toast('CSV exported');
  }, [exportCsv, toast]);

  const handleSyncNow = useCallback(() => {
    if (!codeplug || !fileName) return;
    const buffer = writeRdt(codeplug);
    if (getGitHubToken()) {
      pushToGitHub(fileName, buffer)
        .then(() => toast('Synced to GitHub'))
        .catch(() => toast('Sync failed', 'error'));
    }
  }, [codeplug, fileName, toast]);

  // Radio handlers
  const handleRadioConnect = useCallback(() => {
    radio.connect();
  }, [radio]);

  const handleRadioDisconnect = useCallback(() => {
    radio.disconnect();
  }, [radio]);

  const handleRadioRead = useCallback(async () => {
    const cp = await radio.readFromRadio();
    if (cp) {
      loadCodeplug(cp, `Radio (${radio.model || 'D578UV'})`);
      toast(`Read ${cp.channels.length} channels from radio`, 'info');
    } else if (radio.error) {
      toast(`Read failed: ${radio.error}`, 'error');
    }
  }, [radio, loadCodeplug, toast]);

  const handleRadioWrite = useCallback(async () => {
    if (!codeplug) return;
    const error = await radio.writeToRadio(codeplug);
    if (error === null) {
      toast('Codeplug written. The radio restarts to apply it — reconnect to read it back.');
    } else {
      toast(`Write failed: ${error}`, 'error');
    }
    setShowWriteConfirm(false);
  }, [codeplug, radio, toast]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handleSave(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo, handleSave]);

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
                Open an Anytone D578UV .RDT codeplug file, or connect your radio via USB to read directly.
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
            onAddChannel={() => { const ch = createDefaultChannel(codeplug.channels); addChannel(ch); return ch.index; }}
            onBulkUpdateChannels={bulkUpdateChannels}
            onImportChannels={importChannels}
          />
        );
      case 'zones':
        return (
          <ZoneEditor
            zones={codeplug.zones}
            channels={codeplug.channels}
            onUpdateZone={updateZone}
            onAddZone={() => { const z = createDefaultZone(codeplug.zones); addZone(z); return z.index; }}
            onDeleteZone={deleteZone}
          />
        );
      case 'radioIds':
        return (
          <ContactTable
            radioIds={codeplug.radioIds}
            analogContacts={[]}
            onUpdateRadioId={updateRadioId}
            onAddRadioId={() => { addRadioId(createDefaultRadioId(codeplug.radioIds)); }}
            onDeleteRadioId={deleteRadioId}
          />
        );
      case 'contacts':
        return (
          <ContactTable
            radioIds={[]}
            analogContacts={codeplug.analogContacts}
            onUpdateRadioId={updateRadioId}
            onUpdateAnalogContact={updateAnalogContact}
            onAddAnalogContact={() => { addAnalogContact(createDefaultAnalogContact(codeplug.analogContacts)); }}
            onDeleteAnalogContact={deleteAnalogContact}
          />
        );
      case 'scanLists':
        return (
          <ScanListEditor
            scanLists={codeplug.scanLists}
            channels={codeplug.channels}
            onUpdateScanList={updateScanList}
            onAddScanList={() => { const sl = createDefaultScanList(codeplug.scanLists); addScanList(sl); return sl.index; }}
            onDeleteScanList={deleteScanList}
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
            onAddTextMessage={() => { addTextMessage(createDefaultTextMessage(codeplug.textMessages)); }}
            onDeleteTextMessage={deleteTextMessage}
          />
        );
      case 'groupLists':
        return (
          <GroupListEditor
            groupLists={codeplug.groupLists}
            digitalContacts={codeplug.digitalContacts}
            onUpdateGroupList={updateGroupList}
            onAddGroupList={() => { const gl = createDefaultGroupList(codeplug.groupLists); addGroupList(gl); return gl.index; }}
            onDeleteGroupList={deleteGroupList}
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
          <RoamingEditor
            roamingChannels={codeplug.roamingChannels}
            roamingZones={codeplug.roamingZones}
            onUpdateRoamingChannel={updateRoamingChannel}
            onUpdateRoamingZone={updateRoamingZone}
            onAddRoamingChannel={() => { addRoamingChannel(createDefaultRoamingChannel(codeplug.roamingChannels)); }}
            onDeleteRoamingChannel={deleteRoamingChannel}
            onAddRoamingZone={() => { addRoamingZone(createDefaultRoamingZone(codeplug.roamingZones)); }}
            onDeleteRoamingZone={deleteRoamingZone}
          />
        );
      case 'talkgroupLookup':
        return (
          <TalkgroupLookup
            digitalContacts={codeplug.digitalContacts}
            onAddDigitalContacts={(contacts) => {
              addDigitalContacts(contacts);
              toast(`Added ${contacts.length} talkgroup${contacts.length !== 1 ? 's' : ''} as digital contacts`);
            }}
          />
        );
      case 'settings':
        return (
          <SettingsViewer
            header={codeplug.header}
            settingsBlock={codeplug.settingsBlock}
            generalSettingsRaw={codeplug.generalSettingsRaw}
            onSyncNow={handleSyncNow}
            onUpdateSettings={updateSettings}
            onUpdateGeneralSettings={updateGeneralSettings}
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
        onSave={handleSave}
        onExportCsv={handleExportCsv}
        onImportCsv={() => setShowCsvImport(true)}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        radioSupported={radio.supported}
        radioStatus={radio.status}
        radioModel={radio.model}
        radioProgress={radio.progress}
        radioProgressLabel={radio.progressLabel}
        radioError={radio.error}
        onRadioConnect={handleRadioConnect}
        onRadioDisconnect={handleRadioDisconnect}
        onRadioRead={handleRadioRead}
        onRadioWrite={() => setShowWriteConfirm(true)}
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

      <ConfirmDialog
        open={showWriteConfirm}
        title="Write to Radio"
        message="This will overwrite the codeplug on your radio. The radio's current programming will be replaced. Continue?"
        confirmLabel="Write"
        onConfirm={handleRadioWrite}
        onCancel={() => setShowWriteConfirm(false)}
      />

      {showCsvImport && codeplug && (
        <CsvImportModal
          existingChannels={codeplug.channels}
          onClose={() => setShowCsvImport(false)}
          onImport={(partials) => {
            importChannels(partials);
            setShowCsvImport(false);
            toast(`Imported ${partials.length} channels from CSV`);
          }}
        />
      )}
    </>
  );
}

export default App;
