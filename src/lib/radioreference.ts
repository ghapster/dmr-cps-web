// ---------------------------------------------------------------------------
// RadioReference.com SOAP API client
// ---------------------------------------------------------------------------

const RR_ENDPOINT = 'https://api.radioreference.com/soap2/?wsdl&v=18&s=rpc';
const CORS_PROXY = 'https://dmr-cors-proxy.ghapster.workers.dev';

export interface RRCredentials {
  username: string;
  password: string;
  appKey: string;
}

export interface RRCountyInfo {
  ctid: number;
  countyName: string;
  stateId: number;
  stateName: string;
}

export interface RRCategory {
  catId: number;
  catName: string;
  subcats?: RRCategory[];
}

export interface RRFrequency {
  freq: number;
  alpha: string;
  description: string;
  mode: string;
  tone: string;
  tag: string;
}

// ---------------------------------------------------------------------------
// SOAP envelope helpers
// ---------------------------------------------------------------------------

function soapEnvelope(method: string, params: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:ns="http://api.radioreference.com/soap2">
  <soapenv:Body>
    <ns:${method}>${params}</ns:${method}>
  </soapenv:Body>
</soapenv:Envelope>`;
}

function authParams(creds: RRCredentials): string {
  return `<authInfo xsi:type="ns:authInfo" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    <username>${escapeXml(creds.username)}</username>
    <password>${escapeXml(creds.password)}</password>
    <appKey>${escapeXml(creds.appKey)}</appKey>
    <version>18</version>
    <style>rpc</style>
  </authInfo>`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

async function soapCall(method: string, params: string): Promise<Document> {
  const body = soapEnvelope(method, params);
  const proxiedUrl = `${CORS_PROXY}/?url=${encodeURIComponent(RR_ENDPOINT)}`;

  const res = await fetch(proxiedUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      'SOAPAction': `"${method}"`,
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    // Check for SOAP fault
    if (text.includes('faultstring')) {
      const match = text.match(/<faultstring[^>]*>([\s\S]*?)<\/faultstring>/);
      throw new Error(match ? match[1] : `SOAP fault (HTTP ${res.status})`);
    }
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
  }

  const xml = await res.text();
  const doc = new DOMParser().parseFromString(xml, 'text/xml');

  // Check for SOAP fault in successful response
  const fault = doc.getElementsByTagName('faultstring')[0];
  if (fault) throw new Error(fault.textContent || 'SOAP fault');

  return doc;
}

// ---------------------------------------------------------------------------
// Helper: extract text content from XML elements
// ---------------------------------------------------------------------------

function getChildText(el: Element, tag: string): string {
  // Try direct child first
  for (let i = 0; i < el.children.length; i++) {
    const child = el.children[i];
    if (child.localName === tag) return child.textContent?.trim() || '';
  }
  return '';
}

function getElements(doc: Document, localName: string): Element[] {
  const results: Element[] = [];
  const all = doc.getElementsByTagName('*');
  for (let i = 0; i < all.length; i++) {
    if (all[i].localName === localName) results.push(all[i]);
  }
  return results;
}

// ---------------------------------------------------------------------------
// API methods
// ---------------------------------------------------------------------------

export async function getZipCodeInfo(zip: string, creds: RRCredentials): Promise<RRCountyInfo> {
  const params = `<zipCode>${escapeXml(zip)}</zipCode>${authParams(creds)}`;
  const doc = await soapCall('getZipcodeInfo', params);

  // Response contains county info items
  const ctid = getElements(doc, 'ctid')[0]?.textContent || '';
  const countyName = getElements(doc, 'countyName')[0]?.textContent || '';
  const stateId = getElements(doc, 'stid')[0]?.textContent || '';
  const stateName = getElements(doc, 'stateName')[0]?.textContent || '';

  if (!ctid) throw new Error('No county found for this ZIP code');

  return {
    ctid: parseInt(ctid),
    countyName: countyName.trim(),
    stateId: parseInt(stateId),
    stateName: stateName.trim(),
  };
}

export async function getCountyInfo(ctid: number, creds: RRCredentials): Promise<RRCategory[]> {
  const params = `<ctid>${ctid}</ctid>${authParams(creds)}`;
  const doc = await soapCall('getCountyInfo', params);

  // CountyInfo response has cats > item (cat) > cid, cName, subcats > item (subcat) > scid, scName
  const categories: RRCategory[] = [];
  const catElements = getElements(doc, 'cid');

  for (const cidEl of catElements) {
    const parent = cidEl.parentElement;
    if (!parent) continue;
    const cid = parseInt(cidEl.textContent || '');
    const cName = getChildText(parent, 'cName');
    if (isNaN(cid) || !cName) continue;

    // Parse subcats within this cat
    const subcats: RRCategory[] = [];
    const subcatContainer = Array.from(parent.children).find(c => c.localName === 'subcats');
    if (subcatContainer) {
      for (let i = 0; i < subcatContainer.children.length; i++) {
        const sub = subcatContainer.children[i];
        const scid = getChildText(sub, 'scid');
        const scName = getChildText(sub, 'scName');
        if (scid && scName) {
          subcats.push({ catId: parseInt(scid), catName: scName });
        }
      }
    }

    categories.push({ catId: cid, catName: cName, subcats });
  }

  return categories;
}

export async function getSubcatFreqs(scid: number, _ctid: number, creds: RRCredentials): Promise<RRFrequency[]> {
  const params = `<scid>${scid}</scid>${authParams(creds)}`;
  const doc = await soapCall('getSubcatFreqs', params);

  return parseFrequencies(doc);
}

function parseFrequencies(doc: Document): RRFrequency[] {
  const freqs: RRFrequency[] = [];
  const items = getElements(doc, 'item');

  for (const item of items) {
    const freqStr = getChildText(item, 'freq') || getChildText(item, 'out');
    if (!freqStr) continue;

    const freq = parseFloat(freqStr);
    if (isNaN(freq) || freq <= 0) continue;

    freqs.push({
      freq,
      alpha: getChildText(item, 'alpha') || getChildText(item, 'callsign') || '',
      description: getChildText(item, 'descr') || getChildText(item, 'description') || '',
      mode: getChildText(item, 'mode') || 'FM',
      tone: getChildText(item, 'tone') || getChildText(item, 'pl') || 'CSQ',
      tag: getChildText(item, 'tag') || getChildText(item, 'tagDescr') || '',
    });
  }

  return freqs;
}

// ---------------------------------------------------------------------------
// Map RR frequency to a Channel partial for import
// ---------------------------------------------------------------------------

export function mapFrequencyToChannel(freq: RRFrequency): Partial<import('./types').Channel> {
  const channel: Partial<import('./types').Channel> = {
    name: freq.alpha.slice(0, 16) || freq.description.slice(0, 16) || 'Scanner',
    rxFrequency: freq.freq,
    txFrequency: freq.freq, // receive-only for scanner
    mode: 'analog' as const,
    bandwidth: 'wide' as const,
    power: 'low' as const,
    rxOnly: true,
  };

  // Parse tone field for CTCSS/DCS decode
  // Examples: "CSQ", "118.8 PL", "D023", "D023N", "203.5 DPL"
  const tone = freq.tone.trim();
  if (tone && tone !== 'CSQ') {
    // We store tone info in the channel name suffix if no dedicated field exists
    // The D578UV channel structure handles tones via _raw bytes, but for partial
    // imports we just set the basics. The tone info is visible in the description.
  }

  return channel;
}
