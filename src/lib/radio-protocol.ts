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

// --- Helpers -----------------------------------------------------------------

/** Read exactly `count` bytes from the reader, with timeout. */
async function readExact(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  count: number,
  timeoutMs: number = READ_TIMEOUT,
): Promise<Uint8Array> {
  const result = new Uint8Array(count);
  let offset = 0;

  const deadline = Date.now() + timeoutMs;

  while (offset < count) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      throw new RadioError('TIMEOUT', `Timed out reading ${count} bytes (got ${offset})`);
    }

    const { value, done } = await Promise.race([
      reader.read(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new RadioError('TIMEOUT', `Read timeout after ${timeoutMs}ms`)), remaining)
      ),
    ]);

    if (done || !value) {
      throw new RadioError('CONNECTION_LOST', 'Serial port closed during read');
    }

    const toCopy = Math.min(value.byteLength, count - offset);
    result.set(value.subarray(0, toCopy), offset);
    offset += toCopy;
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
  // dmrconfig does the same: DTR_CONTROL_ENABLE + RTS_CONTROL_ENABLE.
  try {
    await (port as any).setSignals({ dataTerminalReady: true, requestToSend: true });
  } catch {
    // setSignals may not be supported on all platforms — non-fatal
  }

  // Settle delay — macOS USB CDC serial needs time after open
  await new Promise(r => setTimeout(r, 500));

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
 * Retries up to 10 times with 500ms delays (dmrconfig does the same).
 */
export async function enterProgramMode(conn: RadioConnection): Promise<void> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 10; attempt++) {
    if (attempt > 0) {
      await new Promise(r => setTimeout(r, 500));

      // Release and re-acquire reader to discard any stale/orphaned data
      try {
        conn.reader.releaseLock();
        conn.reader = conn.port.readable!.getReader();
      } catch (e) {
        console.warn('enterProgramMode: failed to reset reader:', e);
      }
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
 *
 * Response (per QDMR RadioInfoResponse struct):
 *   Byte 0:     'I' (0x49) — success prefix
 *   Bytes 1-7:  Model name (7 bytes ASCII, e.g. "D578UV\x00")
 *   Byte 8:     Bands byte
 *   Bytes 9-14: Version string (6 bytes ASCII, e.g. "V110\x00\x00")
 *   Byte 15:    ACK (0x06)
 */
export async function identify(conn: RadioConnection): Promise<RadioIdentity> {
  await conn.writer.write(new Uint8Array([0x02]));

  // Response is exactly 16 bytes (fixed size per QDMR struct)
  const resp = await readExact(conn.reader, 16);

  // Validate prefix and ACK
  if (resp[0] !== 0x49) { // 'I'
    throw new RadioError('NACK', `Identify: expected 'I' prefix, got 0x${resp[0].toString(16)}`);
  }
  if (resp[15] !== ACK) {
    console.warn(`Identify: expected ACK at byte 15, got 0x${resp[15].toString(16)}`);
  }

  // Model: bytes 1-7 (ASCII, null-terminated)
  const model = decodeAscii(resp, 1, 7);
  // Version: bytes 9-14 (ASCII, null-terminated)
  const firmware = decodeAscii(resp, 9, 6);

  return { model: model.trim(), firmware: firmware.trim() };
}

/**
 * Compute additive checksum for a write block.
 * Sum = (address[4] + length[1] + data[]) & 0xFF
 * Per qdmr, dmrconfig, and anytone-flash-tools: covers addr + len + data.
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
 * Protocol:
 *   Send: 'R' + addr(4, big-endian) + length(1)
 *   Recv: 'W' + addr(4) + len(1) + data(length) + checksum(1) + ACK(1)
 *
 * Total response: length + 8 bytes.
 * NO ACK is sent by the host after reading (only the radio sends ACK in its response).
 */
export async function readBlock(
  conn: RadioConnection,
  address: number,
  length: number,
): Promise<Uint8Array> {
  // Build read command: R + 4-byte address (big-endian) + 1-byte length
  const cmd = new Uint8Array(6);
  cmd[0] = 0x52; // 'R'
  cmd[1] = (address >> 24) & 0xff;
  cmd[2] = (address >> 16) & 0xff;
  cmd[3] = (address >> 8) & 0xff;
  cmd[4] = address & 0xff;
  cmd[5] = length;

  await conn.writer.write(cmd);

  // Read full response: W(1) + addr(4) + len(1) + data(length) + checksum(1) + ACK(1)
  const respLen = 1 + 4 + 1 + length + 1 + 1;
  const resp = await readExact(conn.reader, respLen);

  // Validate response header
  if (resp[0] !== 0x57) { // 'W'
    throw new RadioError('NACK', `Read block at 0x${address.toString(16)}: expected 'W' (0x57), got 0x${resp[0].toString(16)}`);
  }

  // Validate ACK at end
  if (resp[respLen - 1] !== ACK) {
    throw new RadioError('NACK', `Read block at 0x${address.toString(16)}: missing ACK`);
  }

  // Extract data — NO ACK sent back (host does not acknowledge reads)
  const data = resp.subarray(6, 6 + length);
  return new Uint8Array(data);
}

/**
 * Write a single 16-byte block to radio memory.
 *
 * Protocol:
 *   Send: 'W' + addr(4, big-endian) + length(1) + data(16) + checksum(1) + ACK
 *   Recv: ACK (1 byte)
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

  // Build write command: W + addr(4) + len(1) + data(16) + checksum(1) + ACK
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

  // Wait for ACK response
  const resp = await readExact(conn.reader, 1);
  if (resp[0] !== ACK) {
    throw new RadioError('NACK', `Write block: expected ACK, got 0x${resp[0].toString(16)} at address 0x${address.toString(16)}`);
  }
}

/**
 * Read a contiguous region of radio memory in 16-byte blocks.
 */
export async function readRegion(
  conn: RadioConnection,
  startAddr: number,
  totalLength: number,
  onProgress?: (bytesRead: number, totalBytes: number) => void,
): Promise<Uint8Array> {
  const result = new Uint8Array(totalLength);
  const blockSize = 16;
  let offset = 0;

  while (offset < totalLength) {
    const remaining = totalLength - offset;
    const len = Math.min(blockSize, remaining);
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
    // Pad last block to 16 bytes if needed
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
    // Timeout on exit is non-fatal — radio may have already disconnected
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
