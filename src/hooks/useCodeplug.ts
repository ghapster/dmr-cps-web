import { useState, useCallback, useRef } from 'react';
import type { Codeplug, Channel, Zone, RadioId, DigitalContact, AprsSettings, ValidationIssue } from '../lib/types';
import { parseRdt } from '../lib/rdt-parser';
import { writeRdt, downloadBlob } from '../lib/rdt-writer';
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

  const updateZone = useCallback((index: number, changes: Partial<Zone>) => {
    updateCodeplug(cp => ({
      ...cp,
      zones: cp.zones.map(z =>
        z.index === index ? { ...z, ...changes } : z
      ),
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
    updateZone,
    updateRadioId,
    updateTextMessage,
    updateDigitalContact,
    updateAprsSettings,
    updateCodeplug,
    undo,
    redo,
    canUndo: undoStack.current.length > 0,
    canRedo: redoStack.current.length > 0,
  };
}
