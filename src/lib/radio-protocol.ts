/**
 * radio-protocol.ts — Serial Transport Layer for Anytone D578UV
 *
 * Low-level serial communication. No codeplug knowledge.
 * Protocol based on qdmr, dmrconfig, and anytone-flash-tools.
 */

// --- Constants ---------------------------------------------------------------

const BAUD_RATE = 115200;
const READ_TIMEOUT = 5000; // ms per read operation (macOS USB CDC needs more time)
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

/** Read bytes until a specific terminator byte, with timeout. */
async function readUntil(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  terminator: number,
  maxBytes: number = 256,
  timeoutMs: number = READ_TIMEOUT,
): Promise<Uint8Array> {
  const buf: number[] = [];
  const deadline = Date.now() + timeoutMs;

  while (buf.length < maxBytes) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      throw new RadioError('TIMEOUT', 'Timed out waiting for response');
    }

    const { value, done } = await Promise.race([
      reader.read(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new RadioError('TIMEOUT', 'Read timeout')), remaining)
      ),
    ]);

    if (done || !value) {
      throw new RadioError('CONNECTION_LOST', 'Serial port closed during read');
    }

    for (let i = 0; i < value.byteLength; i++) {
      buf.push(value[i]);
      if (value[i] === terminator) {
        return new Uint8Array(buf);
      }
    }
  }

  return new Uint8Array(buf);
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

  // Set DTR/RTS signals — required by some USB CDC drivers (especially macOS)
  try {
    await (port as any).setSignals({ dataTerminalReady: true, requestToSend: true });
  } catch {
    // setSignals may not be supported on all platforms — non-fatal
  }

  // Settle delay — macOS USB CDC serial needs time after open + signal set
  await new Promise(r => setTimeout(r, 800));

  if (!port.readable || !port.writable) {
    throw new RadioError('CONNECTION_LOST', 'Port opened but streams not available');
  }

  const reader = port.readable.getReader();
  const writer = port.writable.getWriter();

  // Flush any stale data in the receive buffer (common on reconnect / macOS)
  try {
    await drainReader(reader, 200);
  } catch {
    // Timeout expected when no stale data — that's fine
  }

  return { port, reader, writer };
}

/** Drain any pending bytes from the reader (non-blocking, short timeout). */
async function drainReader(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  timeoutMs: number,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    try {
      await Promise.race([
        reader.read(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('drain timeout')), remaining)
        ),
      ]);
    } catch {
      break; // Timeout = no more data, done draining
    }
  }
}

/**
 * Enter programming mode (with retry).
 * Send "PROGRAM" → expect "QX" + 0x06
 * Retries up to 3 times with increasing delays for USB CDC reliability.
 */
export async function enterProgramMode(conn: RadioConnection): Promise<void> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      // Wait before retry, increasing delay each time
      await new Promise(r => setTimeout(r, 500 * attempt));
      // Flush any stale response data from previous attempt
      try { await drainReader(conn.reader, 200); } catch { /* expected */ }
    }

    try {
      await conn.writer.write(asciiBytes('PROGRAM'));

      // Radio responds with "QX\x06" (3 bytes)
      const resp = await readExact(conn.reader, 3);
      if (resp[0] !== 0x51 || resp[1] !== 0x58 || resp[2] !== ACK) {
        throw new RadioError('NACK', `Unexpected PROGRAM response: ${Array.from(resp).map(b => b.toString(16)).join(' ')}`);
      }
      return; // Success
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      console.warn(`enterProgramMode attempt ${attempt + 1}/3 failed:`, lastError.message);
    }
  }

  throw lastError ?? new RadioError('TIMEOUT', 'Failed to enter programming mode after 3 attempts');
}

/**
 * Identify the radio.
 * Send 0x02 → parse model + firmware response.
 * Response format: "ID" + model_string + "\x00" + firmware + "\x00" + 0x06
 * Actual format varies — Anytone sends model info as ASCII terminated by 0x06.
 */
export async function identify(conn: RadioConnection): Promise<RadioIdentity> {
  await conn.writer.write(new Uint8Array([0x02]));

  // Read response until ACK byte
  const resp = await readUntil(conn.reader, ACK, 128);

  // Response: "ID" + model_bytes + 0x00 + firmware_bytes + 0x00 + 0x06
  // Or simply: model_and_firmware_string + 0x06
  // Parse the ASCII content before the ACK
  const content = resp.subarray(0, resp.length - 1); // strip trailing ACK

  // Skip "ID" prefix if present
  let offset = 0;
  if (content.length >= 2 && content[0] === 0x49 && content[1] === 0x44) {
    offset = 2;
  }

  // Find null separator between model and firmware
  let nullPos = -1;
  for (let i = offset; i < content.length; i++) {
    if (content[i] === 0x00) { nullPos = i; break; }
  }

  let model: string;
  let firmware: string;

  if (nullPos >= 0) {
    model = decodeAscii(content, offset, nullPos - offset);
    firmware = decodeAscii(content, nullPos + 1);
  } else {
    // No null separator — treat entire response as model string
    const full = decodeAscii(content, offset);
    // Try to split: model is typically "D578UV" (6 chars), rest is firmware
    if (full.length > 6) {
      model = full.substring(0, 6);
      firmware = full.substring(6);
    } else {
      model = full;
      firmware = '';
    }
  }

  return { model: model.trim(), firmware: firmware.trim() };
}

/**
 * Compute additive checksum for a read/write block.
 * Sum = (address bytes + data bytes) & 0xFF
 */
export function computeChecksum(address: number, data: Uint8Array): number {
  let sum = 0;
  // Address is 4 bytes big-endian
  sum += (address >> 24) & 0xff;
  sum += (address >> 16) & 0xff;
  sum += (address >> 8) & 0xff;
  sum += address & 0xff;
  // Data bytes
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
 *   Recv: 'W' + addr(4, big-endian) + length(1) + data(length) + checksum(1) + ACK
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

  // Read response: W(1) + addr(4) + len(1) + data(length) + checksum(1) + ACK(1)
  const respLen = 1 + 4 + 1 + length + 1 + 1;
  const resp = await readExact(conn.reader, respLen);

  // Validate response header
  if (resp[0] !== 0x57) { // 'W'
    throw new RadioError('NACK', `Read block: expected 'W' response, got 0x${resp[0].toString(16)}`);
  }

  // Validate ACK at end
  if (resp[respLen - 1] !== ACK) {
    throw new RadioError('NACK', `Read block: missing ACK byte`);
  }

  // Extract data
  const data = resp.subarray(6, 6 + length);

  // Validate checksum
  const respAddr = (resp[1] << 24) | (resp[2] << 16) | (resp[3] << 8) | resp[4];
  const expectedChecksum = computeChecksum(respAddr, data);
  const actualChecksum = resp[6 + length];

  if (actualChecksum !== expectedChecksum) {
    throw new RadioError('CHECKSUM', `Checksum mismatch at 0x${address.toString(16)}: expected 0x${expectedChecksum.toString(16)}, got 0x${actualChecksum.toString(16)}`);
  }

  // Send ACK to confirm receipt
  await conn.writer.write(new Uint8Array([ACK]));

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

  const checksum = computeChecksum(address, data);

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
      // Remaining bytes are 0x00 (default Uint8Array fill)
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
