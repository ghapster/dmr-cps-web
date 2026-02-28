import type { RoamingChannel, RoamingZone } from '../lib/types';

interface Props {
  roamingChannels: RoamingChannel[];
  roamingZones: RoamingZone[];
}

export function RoamingViewer({ roamingChannels, roamingZones }: Props) {
  return (
    <div className="space-y-6">
      {/* Roaming Channels */}
      <div className="space-y-2">
        <h3 className="text-xs text-text-muted uppercase tracking-wider">
          Roaming Channels — {roamingChannels.length}
        </h3>
        <p className="text-[10px] text-text-muted">
          Roaming configuration is read-only.
        </p>
        <div className="overflow-auto border border-border rounded">
          <table className="w-full text-xs">
            <thead className="bg-surface-light">
              <tr>
                <th className="text-left px-3 py-2 text-text-muted font-medium w-16">#</th>
                <th className="text-left px-3 py-2 text-text-muted font-medium">Name</th>
                <th className="text-left px-3 py-2 text-text-muted font-medium w-24">Size</th>
              </tr>
            </thead>
            <tbody>
              {roamingChannels.map(rc => (
                <tr key={rc.index} className="border-t border-border/50 hover:bg-surface-light/50">
                  <td className="px-3 py-1.5 tabular-nums">{rc.index}</td>
                  <td className="px-3 py-1.5">{rc.name}</td>
                  <td className="px-3 py-1.5 text-text-muted">{rc._raw.byteLength} bytes</td>
                </tr>
              ))}
              {roamingChannels.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-3 py-4 text-center text-text-muted">
                    No roaming channels configured
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Roaming Zones */}
      <div className="space-y-2">
        <h3 className="text-xs text-text-muted uppercase tracking-wider">
          Roaming Zones — {roamingZones.length}
        </h3>
        <div className="overflow-auto border border-border rounded">
          <table className="w-full text-xs">
            <thead className="bg-surface-light">
              <tr>
                <th className="text-left px-3 py-2 text-text-muted font-medium w-16">#</th>
                <th className="text-left px-3 py-2 text-text-muted font-medium">Name</th>
                <th className="text-left px-3 py-2 text-text-muted font-medium w-32">Channels</th>
              </tr>
            </thead>
            <tbody>
              {roamingZones.map(rz => (
                <tr key={rz.index} className="border-t border-border/50 hover:bg-surface-light/50">
                  <td className="px-3 py-1.5 tabular-nums">{rz.index + 1}</td>
                  <td className="px-3 py-1.5">{rz.name}</td>
                  <td className="px-3 py-1.5 text-text-muted">
                    {rz.channelIndices.length} channels
                  </td>
                </tr>
              ))}
              {roamingZones.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-3 py-4 text-center text-text-muted">
                    No roaming zones configured
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
