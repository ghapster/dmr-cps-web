import { useState, useCallback, useRef } from 'react';
import type { Codeplug, Channel, Zone, RadioId, AnalogContact, DigitalContact, AprsSettings, ScanList, GroupList, RoamingChannel, RoamingZone, ValidationIssue } from '../lib/types';
import { parseRdt } from '../lib/rdt-parser';
import { writeRdt, downloadBlob, createDefaultChannel } from '../lib/rdt-writer';
import { validateCodeplug } from '../lib/validator';
import { exportChannelsCsv, downloadCsv } from '../lib/csv';

export interface CodeplugState {
  codeplug: Codeplug | null;
  fileName: string | null;
  dirty: boolean;
  issues: ValidationIssue[];
}

export function useCodeplug() {
  const [state, setState] = useState<CodeplugState>({
    codeplug: null,
    fileName: null,
    dirty: false,
    issues: [],
  });
  const undoStack = useRef<Codeplug[]>([]);
  const redoStack = useRef<Codeplug[]>([]);

  const revalidate = useCallback((cp: Codeplug) => {
    return validateCodeplug(cp);
  }, []);

  const pushUndo = useCallback((cp: Codeplug) => {
    undoStack.current.push(cp);
    if (undoStack.current.length > 50) undoStack.current.shift();
    redoStack.current = [];
  }, []);

  const openFile = useCallback(async (file: File) => {
    const buffer = await file.arrayBuffer();
    const codeplug = parseRdt(buffer);
    const issues = validateCodeplug(codeplug);
    undoStack.current = [];
    redoStack.current = [];
    setState({ codeplug, fileName: file.name, dirty: false, issues });
  }, []);

  const saveFile = useCallback(() => {
    if (!state.codeplug) return;
    const buffer = writeRdt(state.codeplug);
    const name = state.fileName || 'codeplug.rdt';
    downloadBlob(buffer, name);
    setState(s => ({ ...s, dirty: false }));
  }, [state.codeplug, state.fileName]);

  const exportCsv = useCallback(() => {
    if (!state.codeplug) return;
    const csv = exportChannelsCsv(state.codeplug.channels);
    const baseName = (state.fileName || 'codeplug').replace(/\.rdt$/i, '');
    downloadCsv(csv, `${baseName}_channels.csv`);
  }, [state.codeplug, state.fileName]);

  const updateCodeplug = useCallback((updater: (cp: Codeplug) => Codeplug) => {
    setState(s => {
      if (!s.codeplug) return s;
      pushUndo(s.codeplug);
      const updated = updater(s.codeplug);
      return { ...s, codeplug: updated, dirty: true, issues: revalidate(updated) };
    });
  }, [pushUndo, revalidate]);

  const updateChannel = useCallback((index: number, changes: Partial<Channel>) => {
    updateCodeplug(cp => ({
      ...cp,
      channels: cp.channels.map(ch =>
        ch.index === index ? { ...ch, ...changes } : ch
      ),
    }));
  }, [updateCodeplug]);

  const deleteChannels = useCallback((indices: number[]) => {
    updateCodeplug(cp => ({
      ...cp,
      channels: cp.channels.filter(ch => !indices.includes(ch.index)),
    }));
  }, [updateCodeplug]);

  const addChannel = useCallback((channel: Channel) => {
    updateCodeplug(cp => ({
      ...cp,
      channels: [...cp.channels, channel],
    }));
  }, [updateCodeplug]);

  const duplicateChannel = useCallback((index: number) => {
    updateCodeplug(cp => {
      const src = cp.channels.find(ch => ch.index === index);
      if (!src) return cp;
      const maxIndex = Math.max(...cp.channels.map(ch => ch.index), 0);
      const dup: Channel = {
        ...src,
        index: maxIndex + 1,
        name: `${src.name} Copy`.slice(0, 16),
        _raw: new Uint8Array(src._raw),
      };
      return { ...cp, channels: [...cp.channels, dup] };
    });
  }, [updateCodeplug]);

  const addZone = useCallback((zone: Zone) => {
    updateCodeplug(cp => ({
      ...cp,
      zones: [...cp.zones, zone],
    }));
  }, [updateCodeplug]);

  const deleteZone = useCallback((index: number) => {
    updateCodeplug(cp => ({
      ...cp,
      zones: cp.zones.filter(z => z.index !== index),
    }));
  }, [updateCodeplug]);

  const updateZone = useCallback((index: number, changes: Partial<Zone>) => {
    updateCodeplug(cp => ({
      ...cp,
      zones: cp.zones.map(z =>
        z.index === index ? { ...z, ...changes } : z
      ),
    }));
  }, [updateCodeplug]);

  const addRadioId = useCallback((radioId: RadioId) => {
    updateCodeplug(cp => ({
      ...cp,
      radioIds: [...cp.radioIds, radioId],
    }));
  }, [updateCodeplug]);

  const deleteRadioId = useCallback((index: number) => {
    updateCodeplug(cp => ({
      ...cp,
      radioIds: cp.radioIds.filter(r => r.index !== index),
    }));
  }, [updateCodeplug]);

  const updateRadioId = useCallback((index: number, changes: Partial<RadioId>) => {
    updateCodeplug(cp => ({
      ...cp,
      radioIds: cp.radioIds.map(r =>
        r.index === index ? { ...r, ...changes } : r
      ),
    }));
  }, [updateCodeplug]);

  const addTextMessage = useCallback((msg: { index: number; text: string }) => {
    updateCodeplug(cp => ({
      ...cp,
      textMessages: [...cp.textMessages, msg],
    }));
  }, [updateCodeplug]);

  const deleteTextMessage = useCallback((index: number) => {
    updateCodeplug(cp => ({
      ...cp,
      textMessages: cp.textMessages.filter(m => m.index !== index),
    }));
  }, [updateCodeplug]);

  const updateTextMessage = useCallback((index: number, text: string) => {
    updateCodeplug(cp => ({
      ...cp,
      textMessages: cp.textMessages.map(msg =>
        msg.index === index ? { ...msg, text } : msg
      ),
    }));
  }, [updateCodeplug]);

  const updateDigitalContact = useCallback((index: number, changes: Partial<DigitalContact>) => {
    updateCodeplug(cp => ({
      ...cp,
      digitalContacts: cp.digitalContacts.map(dc =>
        dc.index === index ? { ...dc, ...changes } : dc
      ),
    }));
  }, [updateCodeplug]);

  const updateAprsSettings = useCallback((changes: Partial<AprsSettings>) => {
    updateCodeplug(cp => ({
      ...cp,
      aprsSettings: { ...cp.aprsSettings, ...changes },
    }));
  }, [updateCodeplug]);

  const addScanList = useCallback((scanList: ScanList) => {
    updateCodeplug(cp => ({
      ...cp,
      scanLists: [...cp.scanLists, scanList],
    }));
  }, [updateCodeplug]);

  const deleteScanList = useCallback((index: number) => {
    updateCodeplug(cp => ({
      ...cp,
      scanLists: cp.scanLists.filter(sl => sl.index !== index),
    }));
  }, [updateCodeplug]);

  const updateScanList = useCallback((index: number, changes: Partial<ScanList>) => {
    updateCodeplug(cp => ({
      ...cp,
      scanLists: cp.scanLists.map(sl =>
        sl.index === index ? { ...sl, ...changes } : sl
      ),
    }));
  }, [updateCodeplug]);

  const addGroupList = useCallback((groupList: GroupList) => {
    updateCodeplug(cp => ({
      ...cp,
      groupLists: [...cp.groupLists, groupList],
    }));
  }, [updateCodeplug]);

  const deleteGroupList = useCallback((index: number) => {
    updateCodeplug(cp => ({
      ...cp,
      groupLists: cp.groupLists.filter(gl => gl.index !== index),
    }));
  }, [updateCodeplug]);

  const updateGroupList = useCallback((index: number, changes: Partial<GroupList>) => {
    updateCodeplug(cp => ({
      ...cp,
      groupLists: cp.groupLists.map(gl =>
        gl.index === index ? { ...gl, ...changes } : gl
      ),
    }));
  }, [updateCodeplug]);

  const addAnalogContact = useCallback((contact: AnalogContact) => {
    updateCodeplug(cp => ({
      ...cp,
      analogContacts: [...cp.analogContacts, contact],
    }));
  }, [updateCodeplug]);

  const deleteAnalogContact = useCallback((index: number) => {
    updateCodeplug(cp => ({
      ...cp,
      analogContacts: cp.analogContacts.filter(ac => ac.index !== index),
    }));
  }, [updateCodeplug]);

  const updateAnalogContact = useCallback((index: number, changes: Partial<AnalogContact>) => {
    updateCodeplug(cp => ({
      ...cp,
      analogContacts: cp.analogContacts.map(ac =>
        ac.index === index ? { ...ac, ...changes } : ac
      ),
    }));
  }, [updateCodeplug]);

  const addRoamingChannel = useCallback((rc: RoamingChannel) => {
    updateCodeplug(cp => ({
      ...cp,
      roamingChannels: [...cp.roamingChannels, rc],
    }));
  }, [updateCodeplug]);

  const deleteRoamingChannel = useCallback((index: number) => {
    updateCodeplug(cp => ({
      ...cp,
      roamingChannels: cp.roamingChannels.filter(rc => rc.index !== index),
    }));
  }, [updateCodeplug]);

  const updateRoamingChannel = useCallback((index: number, changes: Partial<RoamingChannel>) => {
    updateCodeplug(cp => ({
      ...cp,
      roamingChannels: cp.roamingChannels.map(rc =>
        rc.index === index ? { ...rc, ...changes } : rc
      ),
    }));
  }, [updateCodeplug]);

  const addRoamingZone = useCallback((rz: RoamingZone) => {
    updateCodeplug(cp => ({
      ...cp,
      roamingZones: [...cp.roamingZones, rz],
    }));
  }, [updateCodeplug]);

  const deleteRoamingZone = useCallback((index: number) => {
    updateCodeplug(cp => ({
      ...cp,
      roamingZones: cp.roamingZones.filter(rz => rz.index !== index),
    }));
  }, [updateCodeplug]);

  const updateRoamingZone = useCallback((index: number, changes: Partial<RoamingZone>) => {
    updateCodeplug(cp => ({
      ...cp,
      roamingZones: cp.roamingZones.map(rz =>
        rz.index === index ? { ...rz, ...changes } : rz
      ),
    }));
  }, [updateCodeplug]);

  const importChannels = useCallback((partials: Partial<Channel>[]) => {
    updateCodeplug(cp => {
      let channels = [...cp.channels];
      for (const partial of partials) {
        const ch = createDefaultChannel(channels);
        Object.assign(ch, partial);
        channels = [...channels, ch];
      }
      return { ...cp, channels };
    });
  }, [updateCodeplug]);

  const undo = useCallback(() => {
    setState(s => {
      if (!s.codeplug || undoStack.current.length === 0) return s;
      redoStack.current.push(s.codeplug);
      const prev = undoStack.current.pop()!;
      return { ...s, codeplug: prev, dirty: true, issues: revalidate(prev) };
    });
  }, [revalidate]);

  const redo = useCallback(() => {
    setState(s => {
      if (!s.codeplug || redoStack.current.length === 0) return s;
      undoStack.current.push(s.codeplug);
      const next = redoStack.current.pop()!;
      return { ...s, codeplug: next, dirty: true, issues: revalidate(next) };
    });
  }, [revalidate]);

  return {
    ...state,
    openFile,
    saveFile,
    exportCsv,
    updateChannel,
    deleteChannels,
    addChannel,
    duplicateChannel,
    addZone,
    deleteZone,
    updateZone,
    addRadioId,
    deleteRadioId,
    updateRadioId,
    addTextMessage,
    deleteTextMessage,
    updateTextMessage,
    updateDigitalContact,
    updateAprsSettings,
    addScanList,
    deleteScanList,
    updateScanList,
    addGroupList,
    deleteGroupList,
    updateGroupList,
    addAnalogContact,
    deleteAnalogContact,
    updateAnalogContact,
    addRoamingChannel,
    deleteRoamingChannel,
    updateRoamingChannel,
    addRoamingZone,
    deleteRoamingZone,
    updateRoamingZone,
    importChannels,
    updateCodeplug,
    undo,
    redo,
    canUndo: undoStack.current.length > 0,
    canRedo: redoStack.current.length > 0,
  };
}
