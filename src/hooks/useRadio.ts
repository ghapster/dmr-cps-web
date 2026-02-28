/**
 * useRadio.ts — React hook for managing Anytone D578UV radio connection
 *
 * Provides connect/disconnect, read/write operations with progress tracking.
 */

import { useState, useCallback, useRef } from 'react';
import type { Codeplug } from '../lib/types';
import {
  isWebSerialSupported,
  requestPort,
  openConnection,
  enterProgramMode,
  identify,
  exitProgramMode,
  closeConnection,
  RadioError,
} from '../lib/radio-protocol';
import type { RadioConnection, RadioIdentity } from '../lib/radio-protocol';
import { readRadioCodeplug, writeRadioCodeplug } from '../lib/radio-codeplug';
import type { ReadProgress } from '../lib/radio-codeplug';

export type RadioStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reading'
  | 'writing'
  | 'error';

export interface RadioState {
  status: RadioStatus;
  model: string | null;
  firmware: string | null;
  progress: number | null;   // 0-100
  progressLabel: string | null;
  error: string | null;
  supported: boolean;
}

export function useRadio() {
  const [state, setState] = useState<RadioState>({
    status: 'disconnected',
    model: null,
    firmware: null,
    progress: null,
    progressLabel: null,
    error: null,
    supported: isWebSerialSupported(),
  });

  const connRef = useRef<RadioConnection | null>(null);
  const identityRef = useRef<RadioIdentity | null>(null);

  const setStatus = useCallback((status: RadioStatus, extra?: Partial<RadioState>) => {
    setState(s => ({ ...s, status, ...extra }));
  }, []);

  const setProgress = useCallback((p: ReadProgress) => {
    const pct = p.total > 0 ? Math.round((p.current / p.total) * 100) : 0;
    setState(s => ({ ...s, progress: pct, progressLabel: p.phase }));
  }, []);

  /**
   * Connect to the radio: request port → open → enter program mode → identify.
   */
  const connect = useCallback(async () => {
    try {
      setStatus('connecting', { error: null, progress: null, progressLabel: null });

      const port = await requestPort();
      const conn = await openConnection(port);
      connRef.current = conn;

      await enterProgramMode(conn);

      const identity = await identify(conn);
      identityRef.current = identity;

      // Validate model — accept any D578 variant
      if (!identity.model.includes('578')) {
        await exitProgramMode(conn);
        await closeConnection(conn);
        connRef.current = null;
        throw new RadioError('MODEL_MISMATCH', `Expected D578UV, got ${identity.model}`);
      }

      setStatus('connected', {
        model: identity.model,
        firmware: identity.firmware,
      });
    } catch (e) {
      connRef.current = null;
      const msg = e instanceof RadioError ? e.message :
                  e instanceof Error ? e.message : 'Connection failed';
      // If user cancelled the port picker, just go back to disconnected
      if (msg === 'No serial port selected') {
        setStatus('disconnected');
      } else {
        setStatus('error', { error: msg });
      }
    }
  }, [setStatus]);

  /**
   * Disconnect from the radio.
   */
  const disconnect = useCallback(async () => {
    const conn = connRef.current;
    if (conn) {
      try { await exitProgramMode(conn); } catch { /* ignore */ }
      try { await closeConnection(conn); } catch { /* ignore */ }
      connRef.current = null;
    }
    identityRef.current = null;
    setStatus('disconnected', {
      model: null,
      firmware: null,
      progress: null,
      progressLabel: null,
    });
  }, [setStatus]);

  /**
   * Read the entire codeplug from the radio.
   */
  const readFromRadio = useCallback(async (): Promise<Codeplug | null> => {
    const conn = connRef.current;
    if (!conn) return null;

    try {
      setStatus('reading', { progress: 0, progressLabel: 'Starting read...' });
      const codeplug = await readRadioCodeplug(conn, setProgress);
      setStatus('connected', { progress: null, progressLabel: null });
      return codeplug;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Read failed';
      setStatus('error', { error: msg, progress: null, progressLabel: null });
      return null;
    }
  }, [setStatus, setProgress]);

  /**
   * Write the codeplug to the radio.
   */
  const writeToRadio = useCallback(async (codeplug: Codeplug): Promise<boolean> => {
    const conn = connRef.current;
    if (!conn) return false;

    try {
      setStatus('writing', { progress: 0, progressLabel: 'Starting write...' });
      await writeRadioCodeplug(conn, codeplug, setProgress);
      setStatus('connected', { progress: null, progressLabel: null });
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Write failed';
      setStatus('error', { error: msg, progress: null, progressLabel: null });
      return false;
    }
  }, [setStatus, setProgress]);

  return {
    ...state,
    connect,
    disconnect,
    readFromRadio,
    writeToRadio,
  };
}
