import type { AprsSettings } from '../lib/types';

interface Props {
  aprsSettings: AprsSettings;
}

export function AprsViewer({ aprsSettings }: Props) {
  const fields = [
    { label: 'GPS Message', value: aprsSettings.gpsMessage },
    { label: 'Callsign', value: aprsSettings.callsign },
    { label: 'Destination', value: aprsSettings.destination },
    { label: 'Path', value: aprsSettings.path },
    { label: 'Comment', value: aprsSettings.comment },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-xs text-text-muted uppercase tracking-wider">APRS Settings</h3>
      <p className="text-[10px] text-text-muted">
        APRS configuration is read-only. Settings preserved for round-trip fidelity.
      </p>
      <div className="max-w-lg space-y-3">
        {fields.map(field => (
          <div key={field.label} className="flex items-start gap-3">
            <span className="text-xs text-text-muted w-28 shrink-0 pt-1">{field.label}:</span>
            <span className="text-xs font-medium bg-surface border border-border rounded px-3 py-1.5 flex-1 min-h-[30px]">
              {field.value || <span className="text-text-muted italic">empty</span>}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <span className="text-[10px] text-text-muted">
          Raw section size: {aprsSettings._raw.byteLength} bytes
        </span>
      </div>
    </div>
  );
}
