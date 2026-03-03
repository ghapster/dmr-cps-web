/**
 * radio-protocol.ts — Serial Transport Layer for Anytone D578UV
 *
 * Low-level serial communication. No codeplug knowledge.
 * Protocol verified against: qdmr, dmrconfig, anytone-flash-tools, webprog-anytone.
 *
 * V2.12: Per-operation readers (matching webprog-anytone architecture).
 * Each read gets a fresh reader and releases it immediately after.
 * This prevents accumulated reader state from causing cascading failures.
 */

// --- Constants ---------------------------------------------------------------

const BAUD_RATE = 921600;
const ACK = 0x06;
const READ_BLOCK_SIZE = 128;
const CMD_DELAY_MS = 15; // delay between write and read (webprog-anytone uses 15ms)
const READ_TIMEOUT_MS = 5000; // per-block read timeout
const MAX_READ_RETRIES = 3;

// USB VID/PID filters for Anytone D578UV
const USB_FILTERS: SerialPortFilter[] = [
  { usbVendorId: 0x28e9, usbProductId: 0x018a }, // GD32 MCU
  { usbVendorId: 0x2e3c, usbProductId: 0x5740 }, // AT32 MCU
];

// --- Error class -------------------------------------------------------------

export type RadioErrorCode =
  | 'TIMEOUT'
  | 'CHECKSUM'
  | 'NACK'
  | 'MODEL_MISMATCH'
  | 'CONNECTION_LOST'
  | 'NOT_SUPPORTED';

export class RadioError extends Error {
  code: RadioErrorCode;
  constructor(code: RadioErrorCode, message: string) {
    super(message);
    this.name = 'RadioError';
    this.code = code;
  }
}

// --- Connection types --------------------------------------------------------

export interface RadioConnection {
  port: SerialPort;
  writer: WritableStreamDefaultWriter<Uint8Array>;
}

export interface RadioIdentity {
  model: string;
  firmware: string;
}

// --- Core I/O ----------------------------------------------------------------

/**
 * Read exactly `count` bytes from the serial port using a FRESH reader.
 *
 * Key design: each call gets its own reader and releases it in `finally`.
 * This means:
 * - No accumulated state between reads
 * - Timeouts are safe (releaseLock rejects pending reads, stream stays open)
 * - No orphaned reader.read() promises
 *
 * The timeout works via setTimeout → releaseLock(). When releaseLock() is called
 * while reader.read() is pending, the pending promise is rejected with TypeError.
 * The stream itself is NOT canceled — next getReader() works fine.
 */
async function serialRead(
  port: SerialPort,
  count: number,
  timeoutMs?: number,
): Promise<Uint8Array> {
  const reader = port.readable!.getReader();
  let tid: ReturnType<typeof setTimeout> | null = null;

  try {
    const result = new Uint8Array(count);
    let offset = 0;

    if (timeoutMs) {
      tid = setTimeout(() => {
        try { reader.releaseLock(); } catch { /* ignore */ }
      }, timeoutMs);
    }

    while (offset < count) {
      const { value, done } = await reader.read();
      if (done || !value) {
        throw new RadioError('CONNECTION_LOST', 'Serial stream ended during read');
      }
      const toCopy = Math.min(value.byteLength, count - offset);
      result.set(value.subarray(0, toCopy), offset);
      offset += toCopy;
    }

    return result;
  } catch (e) {
    if (e instanceof TypeError && timeoutMs) {
      throw new RadioError('TIMEOUT', `Read timed out after ${timeoutMs}ms`);
    }
    throw e;
  } finally {
    if (tid !== null) clearTimeout(tid);
    try { reader.releaseLock(); } catch { /* already released by timeout */ }
  }
}

/**
 * Drain any stale bytes from the serial stream.
 * Used before retrying a failed read to prevent stale data from
 * being interpreted as the response to the retried command.
 */
async function drainStaleData(port: SerialPort): Promise<void> {
  // Wait for any in-flight data to arrive
  await new Promise(r => setTimeout(r, 100));

  // Try to read whatever is buffered (50ms timeout)
  const reader = port.readable!.getReader();
  const tid = setTimeout(() => {
    try { reader.releaseLock(); } catch { /* ignore */ }
  }, 50);

  try {
    // Loop to drain all buffered data
    while (true) {
      const { value, done } = await reader.read();
      if (done || !value) break;
      console.warn(`Drained ${value.byteLength} stale bytes`);
    }
  } catch {
    // TypeError from releaseLock = no more data = clean
  } finally {
    clearTimeout(tid);
    try { reader.releaseLock(); } catch { /* ignore */ }
  }
}

// --- Helpers -----------------------------------------------------------------

/** Encode a string as ASCII bytes. */
function asciiBytes(str: string): Uint8Array {
  const buf = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) buf[i] = str.charCodeAt(i);
  return buf;
}

/** Decode ASCII bytes to string, stopping at null or non-printable. */
function decodeAscii(data: Uint8Array, start: number = 0, maxLen?: number): string {
  const end = maxLen !== undefined ? Math.min(start + maxLen, data.length) : data.length;
  const chars: string[] = [];
  for (let i = start; i < end; i++) {
    if (data[i] === 0 || data[i] < 0x20 || data[i] > 0x7e) break;
    chars.push(String.fromCharCode(data[i]));
  }
  return chars.join('');
}

/** Small delay. */
const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

// --- Public API --------------------------------------------------------------

/** Check if Web Serial API is available in this browser. */
export function isWebSerialSupported(): boolean {
  return typeof navigator !== 'undefined' && 'serial' in navigator;
}

/** Show the browser's port picker, filtered for Anytone USB devices. */
export async function requestPort(): Promise<SerialPort> {
  if (!isWebSerialSupported()) {
    throw new RadioError('NOT_SUPPORTED', 'Web Serial API not available in this browser');
  }
  try {
    return await navigator.serial!.requestPort({ filters: USB_FILTERS });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'NotFoundError') {
      throw new RadioError('CONNECTION_LOST', 'No serial port selected');
    }
    throw e;
  }
}

/** Open a serial port and return writer. No persistent reader — reads use per-operation readers. */
export async function openConnection(port: SerialPort): Promise<RadioConnection> {
  await port.open({
    baudRate: BAUD_RATE,
    dataBits: 8,
    stopBits: 1,
    parity: 'none',
    flowControl: 'none',
  });

  try {
    await (port as any).setSignals({ dataTerminalReady: true, requestToSend: true });
  } catch { /* non-fatal */ }

  await delay(500);

  if (!port.readable || !port.writable) {
    throw new RadioError('CONNECTION_LOST', 'Port opened but streams not available');
  }

  return {
    port,
    writer: port.writable.getWriter(),
  };
}

/**
 * Enter programming mode.
 * Send "PROGRAM" → expect "QX\x06" (3 bytes).
 * Retries up to 10 times (per dmrconfig).
 */
export async function enterProgramMode(conn: RadioConnection): Promise<void> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 10; attempt++) {
    if (attempt > 0) {
      await delay(500);
    }

    try {
      await conn.writer.write(asciiBytes('PROGRAM'));
      await delay(CMD_DELAY_MS);
      const resp = await serialRead(conn.port, 3, 2000);
      if (resp[0] === 0x51 && resp[1] === 0x58 && resp[2] === ACK) {
        // Wait for radio to fully enter program mode (webprog-anytone uses 1000ms)
        await delay(1000);
        return;
      }
      lastError = new RadioError('NACK',
        `Unexpected PROGRAM response: ${Array.from(resp).map(b => b.toString(16)).join(' ')}`);
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }
    console.warn(`enterProgramMode attempt ${attempt + 1}/10 failed:`, lastError?.message);
  }

  throw lastError ?? new RadioError('TIMEOUT', 'Failed to enter programming mode after 10 attempts');
}

/**
 * Identify the radio.
 * Send 0x02 → read exactly 16 bytes.
 */
export async function identify(conn: RadioConnection): Promise<RadioIdentity> {
  await conn.writer.write(new Uint8Array([0x02]));
  await delay(CMD_DELAY_MS);
  const resp = await serialRead(conn.port, 16, 5000);

  if (resp[0] !== 0x49) {
    throw new RadioError('NACK', `Identify: expected 'I' prefix, got 0x${resp[0].toString(16)}`);
  }

  const model = decodeAscii(resp, 1, 7);
  const firmware = decodeAscii(resp, 9, 6);

  // ACK the identify response (per dmrconfig/QDMR)
  await conn.writer.write(new Uint8Array([ACK]));

  return { model: model.trim(), firmware: firmware.trim() };
}

/**
 * Compute additive checksum.
 * Sum = (address[4] + length[1] + data[]) & 0xFF
 */
export function computeChecksum(address: number, length: number, data: Uint8Array): number {
  let sum = 0;
  sum += (address >> 24) & 0xff;
  sum += (address >> 16) & 0xff;
  sum += (address >> 8) & 0xff;
  sum += address & 0xff;
  sum += length & 0xff;
  for (let i = 0; i < data.length; i++) {
    sum += data[i];
  }
  return sum & 0xff;
}

/**
 * Read a single block from radio memory.
 *
 * Per-operation reader + delay + ACK + retries with drain.
 * Each attempt gets a completely fresh reader, so there's no accumulated state.
 */
export async function readBlock(
  conn: RadioConnection,
  address: number,
  length: number,
): Promise<Uint8Array> {
  for (let attempt = 0; attempt <= MAX_READ_RETRIES; attempt++) {
    if (attempt > 0) {
      // Drain stale data before retrying
      console.warn(`readBlock 0x${address.toString(16)} retry ${attempt}/${MAX_READ_RETRIES}`);
      await drainStaleData(conn.port);
    }

    try {
      const cmd = new Uint8Array(6);
      cmd[0] = 0x52; // 'R'
      cmd[1] = (address >> 24) & 0xff;
      cmd[2] = (address >> 16) & 0xff;
      cmd[3] = (address >> 8) & 0xff;
      cmd[4] = address & 0xff;
      cmd[5] = length;

      await conn.writer.write(cmd);
      await delay(CMD_DELAY_MS);

      // Response: W(1) + addr(4) + len(1) + data(length) + checksum(1) + ACK(1)
      const respLen = 1 + 4 + 1 + length + 1 + 1;
      const resp = await serialRead(conn.port, respLen, READ_TIMEOUT_MS);

      if (resp[0] !== 0x57) {
        throw new RadioError('NACK',
          `Read at 0x${address.toString(16)}: expected 'W' (0x57), got 0x${resp[0].toString(16)}`);
      }

      if (resp[respLen - 1] !== ACK) {
        throw new RadioError('NACK',
          `Read at 0x${address.toString(16)}: missing ACK byte`);
      }

      // ACK the read (per dmrconfig/QDMR)
      await conn.writer.write(new Uint8Array([ACK]));

      return new Uint8Array(resp.subarray(6, 6 + length));
    } catch (e) {
      if (attempt < MAX_READ_RETRIES) {
        console.warn(`readBlock 0x${address.toString(16)} attempt ${attempt + 1} failed:`,
          e instanceof Error ? e.message : e);
        continue;
      }
      throw e;
    }
  }

  // Unreachable, but TypeScript needs it
  throw new RadioError('TIMEOUT',
    `readBlock at 0x${address.toString(16)} failed after ${MAX_READ_RETRIES + 1} attempts`);
}

/**
 * Write a single 16-byte block to radio memory.
 */
export async function writeBlock(
  conn: RadioConnection,
  address: number,
  data: Uint8Array,
): Promise<void> {
  if (data.length !== 16) {
    throw new Error(`writeBlock: data must be 16 bytes, got ${data.length}`);
  }

  const checksum = computeChecksum(address, 16, data);

  const cmd = new Uint8Array(1 + 4 + 1 + 16 + 1 + 1);
  cmd[0] = 0x57; // 'W'
  cmd[1] = (address >> 24) & 0xff;
  cmd[2] = (address >> 16) & 0xff;
  cmd[3] = (address >> 8) & 0xff;
  cmd[4] = address & 0xff;
  cmd[5] = 16;
  cmd.set(data, 6);
  cmd[22] = checksum;
  cmd[23] = ACK;

  await conn.writer.write(cmd);
  await delay(CMD_DELAY_MS);

  const resp = await serialRead(conn.port, 1, READ_TIMEOUT_MS);
  if (resp[0] !== ACK) {
    throw new RadioError('NACK',
      `Write: expected ACK, got 0x${resp[0].toString(16)} at 0x${address.toString(16)}`);
  }
}

/**
 * Read a contiguous region of radio memory.
 */
export async function readRegion(
  conn: RadioConnection,
  startAddr: number,
  totalLength: number,
  onProgress?: (bytesRead: number, totalBytes: number) => void,
): Promise<Uint8Array> {
  const result = new Uint8Array(totalLength);
  let offset = 0;

  while (offset < totalLength) {
    const remaining = totalLength - offset;
    const len = Math.min(READ_BLOCK_SIZE, remaining);
    const block = await readBlock(conn, startAddr + offset, len);
    result.set(block, offset);
    offset += len;
    onProgress?.(offset, totalLength);
  }

  return result;
}

/**
 * Write a contiguous region of radio memory in 16-byte blocks.
 */
export async function writeRegion(
  conn: RadioConnection,
  startAddr: number,
  data: Uint8Array,
  onProgress?: (bytesWritten: number, totalBytes: number) => void,
): Promise<void> {
  const blockSize = 16;
  let offset = 0;

  while (offset < data.length) {
    const remaining = data.length - offset;
    let block: Uint8Array;
    if (remaining >= blockSize) {
      block = data.subarray(offset, offset + blockSize);
    } else {
      block = new Uint8Array(blockSize);
      block.set(data.subarray(offset, offset + remaining));
    }

    await writeBlock(conn, startAddr + offset, block);
    offset += blockSize;
    onProgress?.(Math.min(offset, data.length), data.length);
  }
}

/** Exit programming mode. Send "END" → expect ACK. */
export async function exitProgramMode(conn: RadioConnection): Promise<void> {
  await conn.writer.write(asciiBytes('END'));
  try {
    const resp = await serialRead(conn.port, 1, 2000);
    if (resp[0] !== ACK) {
      console.warn(`exitProgramMode: expected ACK, got 0x${resp[0].toString(16)}`);
    }
  } catch {
    console.warn('exitProgramMode: no ACK received (non-fatal)');
  }
}

/** Close the serial connection. */
export async function closeConnection(conn: RadioConnection): Promise<void> {
  try { conn.writer.releaseLock(); } catch { /* ignore */ }
  try { await conn.port.close(); } catch { /* ignore */ }
}
