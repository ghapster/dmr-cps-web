export interface Talkgroup {
  id: number;
  name: string;
  source: 'brandmeister' | 'tgif';
  description?: string;
}

// Module-level cache (survives across renders, cleared on page reload)
let bmCache: Talkgroup[] | null = null;
let tgifCache: Talkgroup[] | null = null;

export async function fetchBrandMeisterTGs(): Promise<Talkgroup[]> {
  if (bmCache) return bmCache;
  const res = await fetch('https://api.brandmeister.network/v2/talkgroup');
  if (!res.ok) throw new Error(`BrandMeister API returned ${res.status}`);
  const data: Record<string, string> = await res.json();
  bmCache = Object.entries(data).map(([id, name]) => ({
    id: parseInt(id, 10),
    name,
    source: 'brandmeister' as const,
  }));
  return bmCache;
}

export async function fetchTGIFTGs(): Promise<Talkgroup[]> {
  if (tgifCache) return tgifCache;
  const res = await fetch('https://api.tgif.network/dmr/talkgroups/json');
  if (!res.ok) throw new Error(`TGIF API returned ${res.status}`);
  const data: Array<{ id: string | number; name: string; description?: string }> = await res.json();
  tgifCache = data.map(item => ({
    id: typeof item.id === 'string' ? parseInt(item.id, 10) : item.id,
    name: item.name,
    source: 'tgif' as const,
    description: item.description ? safeAtob(item.description) : undefined,
  }));
  return tgifCache;
}

function safeAtob(s: string): string {
  try { return atob(s); } catch { return s; }
}
