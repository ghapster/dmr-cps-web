// ---------------------------------------------------------------------------
// Persistent codeplug storage: IndexedDB (local) + GitHub Pages (cross-device)
// ---------------------------------------------------------------------------

const DB_NAME = 'dmrcps';
const STORE_NAME = 'codeplug';
const DB_VERSION = 1;
const CURRENT_KEY = 'current';

const GH_TOKEN_KEY = 'dmrcps_gh_token';
const GH_REPO = 'ghapster/dmr-cps-web';
const GH_BRANCH = 'gh-pages';
const GH_FILE = 'codeplug.json';
const GH_PAGES_URL = `https://ghapster.github.io/dmr-cps-web/${GH_FILE}`;

// ---------------------------------------------------------------------------
// Base64 helpers
// ---------------------------------------------------------------------------

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// ---------------------------------------------------------------------------
// IndexedDB
// ---------------------------------------------------------------------------

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveToLocal(fileName: string, buffer: ArrayBuffer): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  store.put(
    { fileName, data: arrayBufferToBase64(buffer), updatedAt: new Date().toISOString() },
    CURRENT_KEY,
  );
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function loadFromLocal(): Promise<{ fileName: string; buffer: ArrayBuffer } | null> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const req = store.get(CURRENT_KEY);
  return new Promise((resolve, reject) => {
    req.onsuccess = () => {
      db.close();
      const record = req.result;
      if (!record) return resolve(null);
      try {
        resolve({ fileName: record.fileName, buffer: base64ToArrayBuffer(record.data) });
      } catch {
        resolve(null);
      }
    };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

// ---------------------------------------------------------------------------
// GitHub token (localStorage)
// ---------------------------------------------------------------------------

export function getGitHubToken(): string | null {
  try { return localStorage.getItem(GH_TOKEN_KEY); } catch { return null; }
}

export function setGitHubToken(token: string): void {
  localStorage.setItem(GH_TOKEN_KEY, token);
}

export function clearGitHubToken(): void {
  localStorage.removeItem(GH_TOKEN_KEY);
}

// ---------------------------------------------------------------------------
// RadioReference credentials (localStorage)
// ---------------------------------------------------------------------------

const RR_CREDS_KEY = 'dmrcps_rr_creds';

export function getRRCredentials(): { username: string; password: string; appKey: string } | null {
  try {
    const raw = localStorage.getItem(RR_CREDS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

export function setRRCredentials(creds: { username: string; password: string; appKey: string }): void {
  localStorage.setItem(RR_CREDS_KEY, JSON.stringify(creds));
}

export function clearRRCredentials(): void {
  localStorage.removeItem(RR_CREDS_KEY);
}

// ---------------------------------------------------------------------------
// GitHub sync — push (requires PAT with repo scope)
// ---------------------------------------------------------------------------

export async function pushToGitHub(fileName: string, buffer: ArrayBuffer): Promise<void> {
  const token = getGitHubToken();
  if (!token) return;

  const payload = JSON.stringify({
    fileName,
    data: arrayBufferToBase64(buffer),
    updatedAt: new Date().toISOString(),
  });

  const contentB64 = btoa(unescape(encodeURIComponent(payload)));
  const apiUrl = `https://api.github.com/repos/${GH_REPO}/contents/${GH_FILE}?ref=${GH_BRANCH}`;

  // Get current file SHA (needed for update, absent for create)
  let sha: string | undefined;
  try {
    const res = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json' },
    });
    if (res.ok) {
      const json = await res.json();
      sha = json.sha;
    }
  } catch {
    // file doesn't exist yet — that's fine
  }

  const body: Record<string, string> = {
    message: `sync codeplug: ${fileName}`,
    content: contentB64,
    branch: GH_BRANCH,
  };
  if (sha) body.sha = sha;

  const putRes = await fetch(
    `https://api.github.com/repos/${GH_REPO}/contents/${GH_FILE}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
  );

  if (!putRes.ok) {
    const err = await putRes.text();
    throw new Error(`GitHub push failed (${putRes.status}): ${err}`);
  }
}

// ---------------------------------------------------------------------------
// GitHub sync — pull (public gh-pages, no auth needed)
// ---------------------------------------------------------------------------

export async function pullFromGitHub(): Promise<{ fileName: string; buffer: ArrayBuffer } | null> {
  try {
    const res = await fetch(GH_PAGES_URL, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.fileName || !json.data) return null;
    return { fileName: json.fileName, buffer: base64ToArrayBuffer(json.data) };
  } catch {
    return null;
  }
}
