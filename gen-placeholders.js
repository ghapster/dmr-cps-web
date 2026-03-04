const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'public', 'screenshots');

function tableRows(y0, count) {
  let s = '';
  for (let i = 0; i < count; i++) {
    const y = y0 + i * 28;
    const bg = i % 2 === 0 ? '#141414' : '#111';
    s += `<rect x="40" y="${y}" width="720" height="28" fill="${bg}"/>`;
    const widths = [30, 100, 80, 80, 60, 60];
    for (let c = 0; c < 6; c++) {
      s += `<rect x="${50 + c * 118}" y="${y + 7}" width="${widths[c]}" height="14" rx="3" fill="#252525"/>`;
    }
    if (i === 3) {
      s += `<rect x="40" y="${y}" width="720" height="28" fill="#6366f1" opacity="0.1"/>`;
    }
  }
  return s;
}

function tabBar(y) {
  const tabs = ['General', 'Display', 'Audio', 'Keys', 'GPS', 'BT', 'APRS', 'Boot', 'Other'];
  let s = '';
  tabs.forEach((t, i) => {
    const x = 50 + i * 78;
    const active = i === 0;
    s += `<rect x="${x}" y="${y}" width="70" height="30" rx="6" fill="${active ? '#6366f1' : '#1a1a1a'}" stroke="${active ? '#6366f1' : '#333'}" stroke-width="1"/>`;
    s += `<text x="${x + 35}" y="${y + 19}" text-anchor="middle" fill="${active ? '#fff' : '#888'}" font-size="11" font-family="Inter,system-ui,sans-serif">${t}</text>`;
  });
  return s;
}

function settingsFields(y0) {
  const labels = ['Brightness', 'SQL Level', 'VOX Level', 'Timeout Timer', 'Backlight Time', 'Key Beep'];
  let s = '';
  labels.forEach((l, i) => {
    const y = y0 + i * 42;
    s += `<text x="60" y="${y + 16}" fill="#999" font-size="12" font-family="Inter,system-ui,sans-serif">${l}</text>`;
    s += `<rect x="220" y="${y}" width="200" height="28" rx="6" fill="#1a1a1a" stroke="#333" stroke-width="1"/>`;
    s += `<rect x="228" y="${y + 8}" width="${60 + i * 12}" height="12" rx="3" fill="#252525"/>`;
  });
  return s;
}

function listItems(y0, count) {
  let s = '';
  for (let i = 0; i < count; i++) {
    const y = y0 + i * 36;
    s += `<rect x="50" y="${y}" width="700" height="32" rx="6" fill="#141414" stroke="#222" stroke-width="1"/>`;
    // drag handle dots
    s += `<circle cx="70" cy="${y + 12}" r="2" fill="#444"/>`;
    s += `<circle cx="70" cy="${y + 20}" r="2" fill="#444"/>`;
    s += `<circle cx="76" cy="${y + 12}" r="2" fill="#444"/>`;
    s += `<circle cx="76" cy="${y + 20}" r="2" fill="#444"/>`;
    s += `<rect x="90" y="${y + 10}" width="${80 + i * 15}" height="12" rx="3" fill="#252525"/>`;
  }
  return s;
}

const screenshots = [
  {
    name: 'hero-channel-editor',
    build() {
      let c = '';
      // Header row
      c += `<rect x="40" y="80" width="720" height="32" fill="#1a1a1a"/>`;
      const hdrs = ['#', 'Channel Name', 'RX Freq', 'TX Freq', 'Mode', 'Power'];
      hdrs.forEach((h, i) => {
        c += `<text x="${55 + i * 118}" y="100" fill="#666" font-size="11" font-family="Inter,system-ui,sans-serif">${h}</text>`;
      });
      c += tableRows(112, 12);
      return c;
    },
  },
  {
    name: 'usb-connected',
    build() {
      let c = '';
      // Toolbar
      c += `<rect x="0" y="70" width="800" height="48" fill="#111"/>`;
      // Connected pill
      c += `<rect x="50" y="82" width="170" height="24" rx="12" fill="#22c55e" opacity="0.12"/>`;
      c += `<circle cx="68" cy="94" r="5" fill="#22c55e"/>`;
      c += `<text x="80" y="98" fill="#22c55e" font-size="12" font-family="Inter,system-ui,sans-serif">D578UV Connected</text>`;
      // Buttons
      c += `<rect x="250" y="82" width="80" height="24" rx="6" fill="#6366f1"/>`;
      c += `<text x="272" y="98" fill="#fff" font-size="11" font-family="Inter,system-ui,sans-serif">Read</text>`;
      c += `<rect x="340" y="82" width="80" height="24" rx="6" fill="#1a1a1a" stroke="#333" stroke-width="1"/>`;
      c += `<text x="360" y="98" fill="#ccc" font-size="11" font-family="Inter,system-ui,sans-serif">Write</text>`;
      c += tableRows(130, 10);
      return c;
    },
  },
  {
    name: 'bulk-edit',
    build() {
      let c = '';
      // Table with checkboxes
      c += `<rect x="40" y="80" width="720" height="32" fill="#1a1a1a"/>`;
      const hdrs = ['', 'Channel Name', 'RX Freq', 'TX Freq', 'Mode', 'Power'];
      hdrs.forEach((h, i) => {
        c += `<text x="${55 + i * 118}" y="100" fill="#666" font-size="11" font-family="Inter,system-ui,sans-serif">${h}</text>`;
      });
      // Selected rows
      for (let i = 0; i < 10; i++) {
        const y = 112 + i * 28;
        const sel = i >= 2 && i <= 5;
        c += `<rect x="40" y="${y}" width="720" height="28" fill="${sel ? '#6366f1' : (i % 2 === 0 ? '#141414' : '#111')}" opacity="${sel ? '0.12' : '1'}"/>`;
        // checkbox
        c += `<rect x="52" y="${y + 7}" width="14" height="14" rx="3" fill="${sel ? '#6366f1' : '#252525'}" stroke="${sel ? '#6366f1' : '#333'}" stroke-width="1"/>`;
        if (sel) c += `<path d="M56 ${y + 14} l2 2 4-4" stroke="#fff" stroke-width="2" fill="none"/>`;
        for (let col = 1; col < 6; col++) {
          c += `<rect x="${50 + col * 118}" y="${y + 7}" width="${col === 1 ? 100 : 70}" height="14" rx="3" fill="#252525"/>`;
        }
      }
      // Side panel
      c += `<rect x="580" y="80" width="190" height="220" rx="8" fill="#1a1a1a" stroke="#333" stroke-width="1"/>`;
      c += `<text x="600" y="105" fill="#fff" font-size="13" font-family="Inter,system-ui,sans-serif" font-weight="600">Bulk Edit</text>`;
      c += `<text x="600" y="122" fill="#888" font-size="10" font-family="Inter,system-ui,sans-serif">4 channels selected</text>`;
      const fields = ['Mode', 'Power', 'Bandwidth', 'Color Code'];
      fields.forEach((f, i) => {
        const fy = 140 + i * 36;
        c += `<text x="600" y="${fy}" fill="#999" font-size="10" font-family="Inter,system-ui,sans-serif">${f}</text>`;
        c += `<rect x="600" y="${fy + 5}" width="150" height="22" rx="4" fill="#0d0d0d" stroke="#333" stroke-width="1"/>`;
      });
      c += `<rect x="600" y="276" width="150" height="28" rx="6" fill="#6366f1"/>`;
      c += `<text x="647" y="294" fill="#fff" font-size="11" font-family="Inter,system-ui,sans-serif" text-anchor="middle">Apply</text>`;
      return c;
    },
  },
  {
    name: 'scanner-lookup',
    build() {
      let c = '';
      c += `<rect x="0" y="70" width="800" height="430" fill="#000" opacity="0.5"/>`;
      c += `<rect x="100" y="90" width="600" height="370" rx="12" fill="#141414" stroke="#333" stroke-width="1"/>`;
      c += `<text x="400" y="125" text-anchor="middle" fill="#fff" font-size="16" font-family="Inter,system-ui,sans-serif" font-weight="600">Scanner Lookup</text>`;
      c += `<text x="400" y="145" text-anchor="middle" fill="#888" font-size="11" font-family="Inter,system-ui,sans-serif">RadioReference.com</text>`;
      // Search bar
      c += `<rect x="130" y="160" width="540" height="32" rx="6" fill="#0d0d0d" stroke="#333" stroke-width="1"/>`;
      c += `<text x="145" y="180" fill="#555" font-size="12" font-family="Inter,system-ui,sans-serif">Search county or state...</text>`;
      // Results
      const freqs = ['155.0100', '155.7900', '156.0750', '158.7375', '460.0250', '460.2500'];
      const descs = ['Fire Dispatch', 'EMS', 'Police Tac 1', 'Highway Patrol', 'Public Works', 'Water Dept'];
      freqs.forEach((f, i) => {
        const y = 205 + i * 32;
        c += `<rect x="130" y="${y}" width="540" height="28" rx="0" fill="${i % 2 === 0 ? '#1a1a1a' : '#161616'}"/>`;
        c += `<text x="145" y="${y + 18}" fill="#06b6d4" font-size="12" font-family="monospace">${f}</text>`;
        c += `<text x="280" y="${y + 18}" fill="#ccc" font-size="11" font-family="Inter,system-ui,sans-serif">${descs[i]}</text>`;
        c += `<text x="520" y="${y + 18}" fill="#666" font-size="10" font-family="Inter,system-ui,sans-serif">NFM</text>`;
      });
      c += `<rect x="480" y="415" width="100" height="30" rx="6" fill="#6366f1"/>`;
      c += `<text x="507" y="434" fill="#fff" font-size="12" font-family="Inter,system-ui,sans-serif">Import</text>`;
      return c;
    },
  },
  {
    name: 'settings-tabs',
    build() {
      let c = '';
      c += tabBar(85);
      c += settingsFields(135);
      return c;
    },
  },
  {
    name: 'zone-editor',
    build() {
      let c = '';
      c += `<text x="60" y="100" fill="#fff" font-size="14" font-family="Inter,system-ui,sans-serif" font-weight="600">Zone 1 — Local Repeaters</text>`;
      c += listItems(115, 9);
      return c;
    },
  },
  {
    name: 'csv-import',
    build() {
      let c = '';
      c += `<rect x="0" y="70" width="800" height="430" fill="#000" opacity="0.5"/>`;
      c += `<rect x="80" y="90" width="640" height="370" rx="12" fill="#141414" stroke="#333" stroke-width="1"/>`;
      c += `<text x="400" y="125" text-anchor="middle" fill="#fff" font-size="16" font-family="Inter,system-ui,sans-serif" font-weight="600">CSV Import</text>`;
      // File drop zone
      c += `<rect x="110" y="140" width="580" height="50" rx="8" fill="#0d0d0d" stroke="#333" stroke-width="1" stroke-dasharray="6,4"/>`;
      c += `<text x="400" y="170" text-anchor="middle" fill="#666" font-size="12" font-family="Inter,system-ui,sans-serif">Drop CSV file here or click to browse</text>`;
      // Preview table
      c += `<rect x="110" y="205" width="580" height="24" fill="#1a1a1a"/>`;
      const cols = ['', 'Name', 'RX Freq', 'TX Freq', 'Mode'];
      cols.forEach((h, i) => {
        c += `<text x="${125 + i * 115}" y="221" fill="#666" font-size="10" font-family="Inter,system-ui,sans-serif">${h}</text>`;
      });
      for (let i = 0; i < 5; i++) {
        const y = 229 + i * 26;
        c += `<rect x="110" y="${y}" width="580" height="26" fill="${i % 2 === 0 ? '#111' : '#0d0d0d'}"/>`;
        c += `<rect x="122" y="${y + 6}" width="14" height="14" rx="3" fill="#6366f1" stroke="#6366f1" stroke-width="1"/>`;
        c += `<path d="M126 ${y + 13} l2 2 4-4" stroke="#fff" stroke-width="1.5" fill="none"/>`;
        for (let col = 1; col < 5; col++) {
          c += `<rect x="${125 + col * 115}" y="${y + 7}" width="${col === 1 ? 90 : 65}" height="12" rx="3" fill="#252525"/>`;
        }
      }
      c += `<rect x="490" y="415" width="100" height="30" rx="6" fill="#6366f1"/>`;
      c += `<text x="517" y="434" fill="#fff" font-size="12" font-family="Inter,system-ui,sans-serif">Import</text>`;
      c += `<rect x="600" y="415" width="100" height="30" rx="6" fill="#1a1a1a" stroke="#333" stroke-width="1"/>`;
      c += `<text x="630" y="434" fill="#ccc" font-size="12" font-family="Inter,system-ui,sans-serif">Cancel</text>`;
      return c;
    },
  },
];

screenshots.forEach(s => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0d0d0d"/>
      <stop offset="100%" stop-color="#12121a"/>
    </linearGradient>
  </defs>
  <rect width="800" height="500" fill="url(#bg)"/>
  ${s.build()}
</svg>`;

  fs.writeFileSync(path.join(dir, s.name + '.svg'), svg);
  console.log('Created', s.name + '.svg');
});
