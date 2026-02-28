import type { AprsSettings } from '../lib/types';

interface Props {
  aprsSettings: AprsSettings;
  onUpdateAprs: (changes: Partial<AprsSettings>) => void;
}

export function AprsEditor({ aprsSettings, onUpdateAprs }: Props) {
  const offsets = aprsSettings._fieldOffsets;

  const fields: {
    label: string;
    value: string;
    maxLen: number;
    onChange: (val: string) => void;
  }[] = [
    {
      label: 'GPS Message',
      value: aprsSettings.gpsMessage,
      maxLen: offsets.gpsMessage.maxLen,
      onChange: val => onUpdateAprs({ gpsMessage: val }),
    },
    {
      label: 'Destination',
      value: aprsSettings.destination,
      maxLen: offsets.destination.maxLen,
      onChange: val => onUpdateAprs({ destination: val }),
    },
    {
      label: 'Callsign',
      value: aprsSettings.callsign,
      maxLen: offsets.callsign.maxLen,
      onChange: val => onUpdateAprs({ callsign: val }),
    },
    {
      label: 'Comment',
      value: aprsSettings.comment,
      maxLen: offsets.comment.maxLen,
      onChange: val => onUpdateAprs({ comment: val }),
    },
  ];

  // Split paths into two fields (path 1 and path 2)
  const pathMaxLen = offsets.paths.maxLen;
  const path1 = aprsSettings.paths[0] || '';
  const path2 = aprsSettings.paths[1] || '';

  return (
    <div className="space-y-4">
      <h3 className="text-xs text-text-muted uppercase tracking-wider">APRS Settings</h3>
      <p className="text-[10px] text-text-muted">
        Edit APRS configuration. String lengths are limited to the original field allocation.
      </p>
      <div className="max-w-lg space-y-3">
        {fields.map(field => (
          <div key={field.label} className="flex items-start gap-3">
            <span className="text-xs text-text-muted w-28 shrink-0 pt-2">{field.label}:</span>
            <div className="flex-1">
              <input
                type="text"
                value={field.value}
                onChange={e => field.onChange(e.target.value)}
                maxLength={field.maxLen}
                className="w-full bg-transparent border border-border/50 rounded px-3 py-1.5 text-xs font-medium
                           focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
              />
              <span className="text-[9px] text-text-muted mt-0.5 block">
                {field.value.length}/{field.maxLen}
              </span>
            </div>
          </div>
        ))}

        {/* SSID — numeric input */}
        <div className="flex items-start gap-3">
          <span className="text-xs text-text-muted w-28 shrink-0 pt-2">SSID:</span>
          <div className="flex-1">
            <input
              type="number"
              value={aprsSettings.ssid}
              onChange={e => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val) && val >= 0 && val <= 15) {
                  onUpdateAprs({ ssid: val });
                }
              }}
              min={0}
              max={15}
              className="w-20 bg-transparent border border-border/50 rounded px-3 py-1.5 text-xs font-medium tabular-nums
                         focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30
                         [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-[9px] text-text-muted mt-0.5 block">0–15</span>
          </div>
        </div>

        {/* Path 1 */}
        <div className="flex items-start gap-3">
          <span className="text-xs text-text-muted w-28 shrink-0 pt-2">Path 1:</span>
          <div className="flex-1">
            <input
              type="text"
              value={path1}
              onChange={e => {
                const newPaths = [e.target.value];
                if (path2) newPaths.push(path2);
                onUpdateAprs({ paths: newPaths });
              }}
              maxLength={pathMaxLen}
              className="w-full bg-transparent border border-border/50 rounded px-3 py-1.5 text-xs font-medium
                         focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
            />
          </div>
        </div>

        {/* Path 2 */}
        <div className="flex items-start gap-3">
          <span className="text-xs text-text-muted w-28 shrink-0 pt-2">Path 2:</span>
          <div className="flex-1">
            <input
              type="text"
              value={path2}
              onChange={e => {
                const newPaths = [path1];
                if (e.target.value) newPaths.push(e.target.value);
                onUpdateAprs({ paths: newPaths });
              }}
              maxLength={pathMaxLen > path1.length ? pathMaxLen - path1.length : 0}
              className="w-full bg-transparent border border-border/50 rounded px-3 py-1.5 text-xs font-medium
                         focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
            />
            <span className="text-[9px] text-text-muted mt-0.5 block">
              Combined path length: {path1.length + path2.length}/{pathMaxLen}
            </span>
          </div>
        </div>
      </div>
      <div className="mt-4">
        <span className="text-[10px] text-text-muted">
          Raw section size: {aprsSettings._raw.byteLength} bytes
        </span>
      </div>
    </div>
  );
}
