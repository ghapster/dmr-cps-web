import type { RoamingChannel, RoamingZone } from '../lib/types';

interface Props {
  roamingChannels: RoamingChannel[];
  roamingZones: RoamingZone[];
  onUpdateRoamingChannel: (index: number, changes: Partial<RoamingChannel>) => void;
  onUpdateRoamingZone: (index: number, changes: Partial<RoamingZone>) => void;
}

export function RoamingEditor({ roamingChannels, roamingZones, onUpdateRoamingChannel, onUpdateRoamingZone }: Props) {
  return (
    <div className="space-y-6">
      {/* Roaming Channels */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-text-muted">
          Roaming Channels — {roamingChannels.length}
        </h3>
        <div className="overflow-auto rounded-xl border border-border" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <table className="w-full text-sm">
            <thead className="bg-surface-light">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted w-16">#</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted w-24">Size</th>
              </tr>
            </thead>
            <tbody>
              {roamingChannels.map(rc => (
                <tr key={rc.index} className="border-t border-border-subtle hover:bg-surface-light/50">
                  <td className="px-4 py-2 tabular-nums font-mono text-xs text-text-dimmed">{rc.index}</td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={rc.name}
                      onChange={e => onUpdateRoamingChannel(rc.index, { name: e.target.value.slice(0, rc._nameLen) })}
                      className="bg-transparent border-none outline-none text-sm w-64"
                    />
                  </td>
                  <td className="px-4 py-2 text-text-dimmed font-mono text-xs">{rc._raw.byteLength} bytes</td>
                </tr>
              ))}
              {roamingChannels.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-text-dimmed text-sm">
                    No roaming channels configured
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Roaming Zones */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-text-muted">
          Roaming Zones — {roamingZones.length}
        </h3>
        <div className="overflow-auto rounded-xl border border-border" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <table className="w-full text-sm">
            <thead className="bg-surface-light">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted w-16">#</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted w-32">Channels</th>
              </tr>
            </thead>
            <tbody>
              {roamingZones.map(rz => (
                <tr key={rz.index} className="border-t border-border-subtle hover:bg-surface-light/50">
                  <td className="px-4 py-2 tabular-nums font-mono text-xs text-text-dimmed">{rz.index + 1}</td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={rz.name}
                      onChange={e => onUpdateRoamingZone(rz.index, { name: e.target.value.slice(0, rz._nameLen) })}
                      className="bg-transparent border-none outline-none text-sm w-64"
                    />
                  </td>
                  <td className="px-4 py-2 text-text-dimmed">
                    {rz.channelIndices.length} channels
                  </td>
                </tr>
              ))}
              {roamingZones.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-text-dimmed text-sm">
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
