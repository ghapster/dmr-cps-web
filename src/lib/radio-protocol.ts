/**
 * radio-protocol.ts — Serial Transport Layer for Anytone D578UV
 *
 * Low-level serial communication. No codeplug knowledge.
 * Protocol verified against: qdmr, dmrconfig, anytone-flash-tools, webprog-anytone.
 */

// --- Constants ---------------------------------------------------------------

const BAUD_RATE = 921600; // USB CDC ignores baud, but higher = better host-side buffering
const READ_TIMEOUT = 5000; // ms per read operation
const ACK = 0x06;
const READ_BLOCK_SIZE = 64; // dmrconfig uses 64, anytone-flash-tools/webprog use 255

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
  reader: ReadableStreamDefaultReader<Uint8Array>;
  writer: WritableStreamDefaultWriter<Uint8Array>;
}

export interface RadioIdentity {
  model: string;
  firmware: string;
}

// --- Read buffer -------------------------------------------------------------
// When reader.read() returns more bytes than readExact needs, excess bytes
// are saved here for the next call. Prevents data loss from USB chunking.

let readBuffer: Uint8Array | null = null;

function clearReadBuffer(): void {
  readBuffer = null;
}

// --- Helpers -----------------------------------------------------------------

/**
 * Reset the reader to cancel any orphaned reader.read() promises.
 *
 * When Promise.race times out, the pending reader.read() is still in the
 * reader's internal queue. ALL future reader.read() calls queue behind it.
 * When data finally arrives, the orphaned read consumes it — not our new read.
 * This cascades: one timeout → all subsequent reads fail.
 *
 * The ONLY way to cancel a pending reader.read() is to release the reader lock.
 */
function resetReader(conn: RadioConnection): void {
  clearReadBuffer();
  try { conn.reader.releaseLock(); } catch { /* ignore */ }
  conn.reader = conn.port.readable!.getReader();
}

/** Read exactly `count` bytes from the reader, with timeout. */
async function readExact(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  count: number,
  timeoutMs: number = READ_TIMEOUT,
): Promise<Uint8Array> {
  const result = new Uint8Array(count);
  let offset = 0;

  // Consume leftover bytes from previous reads
  if (readBuffer && readBuffer.length > 0) {
    const toCopy = Math.min(readBuffer.length, count);
    result.set(readBuffer.subarray(0, toCopy), 0);
    offset = toCopy;
    readBuffer = toCopy < readBuffer.length
      ? new Uint8Array(readBuffer.subarray(toCopy))
      : null;
  }

  const deadline = Date.now() + timeoutMs;

  while (offset < count) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      throw new RadioError('TIMEOUT', `Timed out reading ${count} bytes (got ${offset})`);
    }

    let timeoutId: ReturnType<typeof setTimeout>;
    const { value, done } = await Promise.race([
      reader.read().then(r => { clearTimeout(timeoutId); return r; }),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new RadioError('TIMEOUT', `Read timeout after ${timeoutMs}ms`)),
          remaining,
        );
      }),
    ]);

    if (done || !value) {
      throw new RadioError('CONNECTION_LOST', 'Serial port closed during read');
    }

    const need = count - offset;
    const toCopy = Math.min(value.byteLength, need);
    result.set(value.subarray(0, toCopy), offset);
    offset += toCopy;

    // Save excess bytes for the next readExact call
    if (value.byteLength > toCopy) {
      readBuffer = new Uint8Array(value.subarray(toCopy));
    }
  }

  return result;
}

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

/** Open a serial port and return reader/writer. */
export async function openConnection(port: SerialPort): Promise<RadioConnection> {
  await port.open({
    baudRate: BAUD_RATE,
    dataBits: 8,
    stopBits: 1,
    parity: 'none',
    flowControl: 'none',
  });

  // Enable DTR + RTS — required by USB CDC drivers (especially macOS).
  try {
    await (port as any).setSignals({ dataTerminalReady: true, requestToSend: true });
  } catch {
    // setSignals may not be supported on all platforms — non-fatal
  }

  // Settle delay — macOS USB CDC serial needs time after open
  await new Promise(r => setTimeout(r, 500));

  clearReadBuffer();

  if (!port.readable || !port.writable) {
    throw new RadioError('CONNECTION_LOST', 'Port opened but streams not available');
  }

  const reader = port.readable.getReader();
  const writer = port.writable.getWriter();

  return { port, reader, writer };
}

/**
 * Enter programming mode (with retry, per dmrconfig pattern).
 * Send "PROGRAM" → expect "QX\x06" (3 bytes).
 */
export async function enterProgramMode(conn: RadioConnection): Promise<void> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 10; attempt++) {
    if (attempt > 0) {
      await new Promise(r => setTimeout(r, 500));
      resetReader(conn);
    }

    try {
      await conn.writer.write(asciiBytes('PROGRAM'));
      const resp = await readExact(conn.reader, 3, 2000);
      if (resp[0] === 0x51 && resp[1] === 0x58 && resp[2] === ACK) {
        return; // Success — got "QX\x06"
      }
      lastError = new RadioError('NACK', `Unexpected PROGRAM response: ${Array.from(resp).map(b => b.toString(16)).join(' ')}`);
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
  const resp = await readExact(conn.reader, 16);

  if (resp[0] !== 0x49) { // 'I'
    throw new RadioError('NACK', `Identify: expected 'I' prefix, got 0x${resp[0].toString(16)}`);
  }
  if (resp[15] !== ACK) {
    console.warn(`Identify: expected ACK at byte 15, got 0x${resp[15].toString(16)}`);
  }

  const model = decodeAscii(resp, 1, 7);
  const firmware = decodeAscii(resp, 9, 6);

  return { model: model.trim(), firmware: firmware.trim() };
}

/**
 * Compute additive checksum for a write block.
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
 * Retries up to 3 times. On timeout, resets the reader to cancel
 * any orphaned reader.read() promises that would block future reads.
 */
export async function readBlock(
  conn: RadioConnection,
  address: number,
  length: number,
): Promise<Uint8Array> {
  const cmd = new Uint8Array(6);
  cmd[0] = 0x52; // 'R'
  cmd[1] = (address >> 24) & 0xff;
  cmd[2] = (address >> 16) & 0xff;
  cmd[3] = (address >> 8) & 0xff;
  cmd[4] = address & 0xff;
  cmd[5] = length;

  const respLen = 1 + 4 + 1 + length + 1 + 1;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      // CRITICAL: reset reader to cancel orphaned reader.read() from the timeout.
      // Without this, the orphaned read sits in the queue and consumes all future data.
      resetReader(conn);
      await new Promise(r => setTimeout(r, 200));
    }

    try {
      await conn.writer.write(cmd);
      const resp = await readExact(conn.reader, respLen);

      if (resp[0] !== 0x57) { // 'W'
        lastError = new RadioError('NACK',
          `Read at 0x${address.toString(16)}: expected 'W', got 0x${resp[0].toString(16)}`);
        console.warn(`readBlock attempt ${attempt + 1}/3: ${lastError.message}`);
        continue;
      }

      if (resp[respLen - 1] !== ACK) {
        lastError = new RadioError('NACK',
          `Read at 0x${address.toString(16)}: missing ACK`);
        console.warn(`readBlock attempt ${attempt + 1}/3: ${lastError.message}`);
        continue;
      }

      return new Uint8Array(resp.subarray(6, 6 + length));
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      console.warn(`readBlock attempt ${attempt + 1}/3 at 0x${address.toString(16)}: ${lastError.message}`);
    }
  }

  throw lastError ?? new RadioError('TIMEOUT', `Read failed at 0x${address.toString(16)} after 3 attempts`);
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

  const resp = await readExact(conn.reader, 1);
  if (resp[0] !== ACK) {
    throw new RadioError('NACK', `Write block: expected ACK, got 0x${resp[0].toString(16)} at address 0x${address.toString(16)}`);
  }
}

/**
 * Read a contiguous region of radio memory.
 * Uses 64-byte blocks (matching dmrconfig) — 4x fewer USB transactions than 16-byte.
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
  const blockSize = 16; // Writes are always 16 bytes
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

/**
 * Exit programming mode.
 * Send "END" → expect ACK.
 */
export async function exitProgramMode(conn: RadioConnection): Promise<void> {
  await conn.writer.write(asciiBytes('END'));
  try {
    const resp = await readExact(conn.reader, 1, 2000);
    if (resp[0] !== ACK) {
      console.warn(`exitProgramMode: expected ACK, got 0x${resp[0].toString(16)}`);
    }
  } catch {
    console.warn('exitProgramMode: no ACK received (non-fatal)');
  }
}

/**
 * Close the serial connection, releasing reader/writer and closing the port.
 */
export async function closeConnection(conn: RadioConnection): Promise<void> {
  try { conn.reader.releaseLock(); } catch { /* ignore */ }
  try { conn.writer.releaseLock(); } catch { /* ignore */ }
  try { await conn.port.close(); } catch { /* ignore */ }
}
