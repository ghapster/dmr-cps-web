import { useState, useMemo } from 'react';
import type { FileHeader } from '../lib/types';
import { getGitHubToken, setGitHubToken, clearGitHubToken } from '../lib/storage';
import {
  decodeSettings, encodeSettings,
  decodeRadioMemorySettings, encodeRadioMemorySettings,
  KEY_FUNCTIONS, MENU_EXIT_OPTIONS, VFO_STEP_SIZES,
  STE_TYPES, STE_FREQUENCIES, GPS_TIMEZONES,
  ROAMING_START_CONDITIONS, NAME_COLORS,
  SHORT_KEY_FIELDS, LONG_KEY_FIELDS, KEY_LABELS,
  keyFunctionLabel,
  type RadioSettings,
} from '../lib/settings-codec';

interface Props {
  header: FileHeader;
  settingsBlock: Uint8Array;
  generalSettingsRaw?: Uint8Array;
  onSyncNow?: () => void;
  onUpdateSettings?: (block: Uint8Array) => void;
  onUpdateGeneralSettings?: (block: Uint8Array) => void;
}

type SettingsTab = 'display' | 'audio' | 'timeouts' | 'gps' | 'boot' | 'roaming' | 'keys' | 'vfo' | 'other';

function hexDump(data: Uint8Array, maxRows: number = 28): string[] {
  const rows: string[] = [];
  for (let i = 0; i < Math.min(data.length, maxRows * 16); i += 16) {
    const offset = i.toString(16).padStart(4, '0');
    const hex: string[] = [];
    let ascii = '';
    for (let j = 0; j < 16; j++) {
      if (i + j < data.length) {
        const b = data[i + j];
        hex.push(b.toString(16).padStart(2, '0'));
        ascii += (b >= 0x20 && b < 0x7f) ? String.fromCharCode(b) : '.';
      } else {
        hex.push('  ');
        ascii += ' ';
      }
    }
    rows.push(`${offset}  ${hex.slice(0, 8).join(' ')}  ${hex.slice(8).join(' ')}  |${ascii}|`);
  }
  return rows;
}

export function SettingsViewer({ header, settingsBlock, generalSettingsRaw, onSyncNow, onUpdateSettings, onUpdateGeneralSettings }: Props) {
  const [tokenInput, setTokenInput] = useState('');
  const [hasToken, setHasToken] = useState(() => !!getGitHubToken());
  const [activeTab, setActiveTab] = useState<SettingsTab>('display');
  const [hexExpanded, setHexExpanded] = useState(false);

  const isRadio = !!generalSettingsRaw;

  const settings = useMemo(() => {
    if (generalSettingsRaw) return decodeRadioMemorySettings(generalSettingsRaw);
    return decodeSettings(settingsBlock);
  }, [settingsBlock, generalSettingsRaw]);

  const update = (changes: Partial<RadioSettings>) => {
    const updated = { ...settings, ...changes };
    if (generalSettingsRaw && onUpdateGeneralSettings) {
      onUpdateGeneralSettings(encodeRadioMemorySettings(updated, generalSettingsRaw));
    } else if (onUpdateSettings) {
      onUpdateSettings(encodeSettings(updated, settingsBlock));
    }
  };

  const handleSaveToken = () => {
    const trimmed = tokenInput.trim();
    if (!trimmed) return;
    setGitHubToken(trimmed);
    setHasToken(true);
    setTokenInput('');
  };

  const handleClearToken = () => {
    clearGitHubToken();
    setHasToken(false);
    setTokenInput('');
  };

  const tabs: { key: SettingsTab; label: string; radioOnly?: boolean }[] = [
    { key: 'display', label: 'Display' },
    { key: 'audio', label: 'Audio', radioOnly: true },
    { key: 'timeouts', label: 'Timeouts', radioOnly: true },
    { key: 'gps', label: 'GPS / BT', radioOnly: true },
    { key: 'boot', label: 'Boot', radioOnly: true },
    { key: 'roaming', label: 'Roaming', radioOnly: true },
    { key: 'keys', label: 'Keys' },
    { key: 'vfo', label: 'VFO Scan' },
    { key: 'other', label: 'Other' },
  ];

  const editable = !!(onUpdateSettings || onUpdateGeneralSettings);

  return (
    <div className="space-y-6">
      {/* Header info */}
      <div>
        <h3 className="text-sm font-medium text-text-muted mb-4">File Header</h3>
        <div className="rounded-xl border border-border p-5 max-w-lg" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <span className="text-text-muted">Version:</span>
            <span className="font-medium">{header.version}</span>
            <span className="text-text-muted">Model:</span>
            <span className="font-medium">{header.modelName}</span>
            <span className="text-text-muted">CPS Version:</span>
            <span className="font-medium">{header.cpsVersion}</span>
            <span className="text-text-muted">Payload Size:</span>
            <span className="font-medium tabular-nums font-mono">{header.payloadSize.toLocaleString()} bytes</span>
            <span className="text-text-muted">Source:</span>
            <span className="font-medium">{isRadio ? 'Radio (USB)' : 'RDT File'}</span>
          </div>
        </div>
      </div>

      {/* Cloud Sync */}
      <div>
        <h3 className="text-sm font-medium text-text-muted mb-4">Cloud Sync</h3>
        <div className="rounded-xl border border-border p-5 max-w-lg space-y-4" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-text-muted">Status:</span>
            {hasToken ? (
              <span className="text-xs font-medium text-accent-green bg-accent-green/10 px-2 py-0.5 rounded-md">Connected</span>
            ) : (
              <span className="text-xs font-medium text-text-dimmed bg-surface-lighter px-2 py-0.5 rounded-md">Not configured</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="password"
              value={tokenInput}
              onChange={e => setTokenInput(e.target.value)}
              placeholder={hasToken ? 'Token saved — enter new to replace' : 'GitHub Personal Access Token'}
              className="flex-1 px-3 py-1.5 text-sm bg-surface-light border border-border rounded-md focus:outline-none focus:border-primary"
              onKeyDown={e => { if (e.key === 'Enter') handleSaveToken(); }}
            />
            <button
              onClick={handleSaveToken}
              disabled={!tokenInput.trim()}
              className="px-3 py-1.5 text-sm bg-primary hover:bg-primary-light text-white rounded-md transition-colors disabled:opacity-40"
            >
              Save
            </button>
            {hasToken && (
              <button
                onClick={handleClearToken}
                className="px-3 py-1.5 text-sm bg-surface-lighter hover:bg-zinc-700 border border-border rounded-md transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          {hasToken && onSyncNow && (
            <button
              onClick={onSyncNow}
              className="px-4 py-1.5 text-sm bg-surface-lighter hover:bg-zinc-700 border border-border rounded-md transition-colors"
            >
              Sync Now
            </button>
          )}

          <p className="text-xs text-text-dimmed leading-relaxed">
            To sync your codeplug across devices, create a GitHub
            Personal Access Token with <span className="font-mono">repo</span> scope.
            Your codeplug is stored locally (IndexedDB) and optionally pushed to
            GitHub Pages for cross-device access.
          </p>
        </div>
      </div>

      {/* Radio Settings — tabbed editable sections */}
      <div>
        <h3 className="text-sm font-medium text-text-muted mb-4">Radio Settings</h3>
        <div className="rounded-xl border border-border" style={{ boxShadow: 'var(--shadow-sm)' }}>
          {/* Tab pills */}
          <div className="flex gap-1 px-4 pt-4 pb-2 border-b border-border flex-wrap">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  activeTab === t.key
                    ? 'bg-primary text-white'
                    : t.radioOnly && !isRadio
                      ? 'text-text-dimmed/50 cursor-not-allowed'
                      : 'text-text-muted hover:bg-surface-lighter'
                }`}
                disabled={t.radioOnly && !isRadio}
                title={t.radioOnly && !isRadio ? 'Available after reading from radio via USB' : undefined}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-5">
            {activeTab === 'display' && <DisplayTab settings={settings} editable={editable} onUpdate={update} isRadio={isRadio} />}
            {activeTab === 'audio' && <AudioTab settings={settings} editable={editable} onUpdate={update} />}
            {activeTab === 'timeouts' && <TimeoutsTab settings={settings} editable={editable} onUpdate={update} />}
            {activeTab === 'gps' && <GpsBtTab settings={settings} editable={editable} onUpdate={update} />}
            {activeTab === 'boot' && <BootTab settings={settings} editable={editable} onUpdate={update} />}
            {activeTab === 'roaming' && <RoamingTab settings={settings} editable={editable} onUpdate={update} />}
            {activeTab === 'keys' && <KeyFunctionTab settings={settings} editable={editable} onUpdate={update} />}
            {activeTab === 'vfo' && <VfoScanTab settings={settings} editable={editable} onUpdate={update} isRadio={isRadio} />}
            {activeTab === 'other' && <OtherTab settings={settings} editable={editable} onUpdate={update} isRadio={isRadio} />}
          </div>
        </div>
      </div>

      {/* Raw Hex Dump */}
      <div>
        <button
          onClick={() => setHexExpanded(!hexExpanded)}
          className="flex items-center gap-2 text-sm font-medium text-text-muted hover:text-text transition-colors mb-2"
        >
          <svg
            viewBox="0 0 24 24"
            className={`w-4 h-4 transition-transform ${hexExpanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M9 5l7 7-7 7" />
          </svg>
          Raw Hex Dump ({isRadio ? `${generalSettingsRaw!.length} bytes (radio memory)` : `${settingsBlock.length} bytes (RDT)`})
        </button>
        {hexExpanded && (
          <div className="bg-surface-light rounded-lg p-4 overflow-auto max-h-96 font-mono text-xs leading-5 text-text-muted">
            {hexDump(isRadio ? generalSettingsRaw! : settingsBlock).map((line, i) => (
              <div key={i} className="whitespace-pre">{line}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Shared components ---

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4">
      <span className="text-sm text-text-muted w-48 shrink-0">{label}</span>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function BoolSelect({ value, editable, onChange, trueLabel = 'On', falseLabel = 'Off' }: {
  value?: boolean; editable: boolean; onChange: (v: boolean) => void; trueLabel?: string; falseLabel?: string;
}) {
  if (value === undefined) return <span className="text-text-dimmed text-sm">—</span>;
  return (
    <select
      value={value ? '1' : '0'}
      disabled={!editable}
      onChange={e => onChange(e.target.value === '1')}
      className="px-3 py-1.5 text-sm bg-surface-light border border-border rounded-md focus:outline-none focus:border-primary w-24"
    >
      <option value="1">{trueLabel}</option>
      <option value="0">{falseLabel}</option>
    </select>
  );
}

function EnumSelect({ value, options, editable, onChange, width = 'w-40' }: {
  value?: number; options: { value: number; label: string }[]; editable: boolean; onChange: (v: number) => void; width?: string;
}) {
  if (value === undefined) return <span className="text-text-dimmed text-sm">—</span>;
  return (
    <select
      value={value}
      disabled={!editable}
      onChange={e => onChange(Number(e.target.value))}
      className={`px-3 py-1.5 text-sm bg-surface-light border border-border rounded-md focus:outline-none focus:border-primary ${width}`}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function NumberField({ value, min, max, editable, onChange, suffix, width = 'w-24' }: {
  value?: number; min: number; max: number; editable: boolean; onChange: (v: number) => void; suffix?: string; width?: string;
}) {
  if (value === undefined) return <span className="text-text-dimmed text-sm">—</span>;
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        disabled={!editable}
        onChange={e => {
          const n = Number(e.target.value);
          if (n >= min && n <= max) onChange(n);
        }}
        className={`px-3 py-1.5 text-sm bg-surface-light border border-border rounded-md focus:outline-none focus:border-primary font-mono tabular-nums ${width}`}
      />
      {suffix && <span className="text-xs text-text-dimmed">{suffix}</span>}
    </div>
  );
}

function SliderField({ value, min, max, editable, onChange }: {
  value: number; min: number; max: number; editable: boolean; onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        disabled={!editable}
        onChange={e => onChange(Number(e.target.value))}
        className="flex-1 accent-primary"
      />
      <span className="text-sm font-mono w-6 text-right">{value}</span>
    </div>
  );
}

// --- Tab components ---

interface TabProps {
  settings: RadioSettings;
  editable: boolean;
  onUpdate: (c: Partial<RadioSettings>) => void;
  isRadio?: boolean;
}

function DisplayTab({ settings, editable, onUpdate, isRadio }: TabProps) {
  return (
    <div className="space-y-4 max-w-lg">
      <FieldRow label="Brightness">
        <SliderField value={settings.brightness} min={1} max={10} editable={editable} onChange={v => onUpdate({ brightness: v })} />
      </FieldRow>

      <FieldRow label="Menu Exit Time">
        <EnumSelect value={settings.menuExitTime} options={MENU_EXIT_OPTIONS} editable={editable} onChange={v => onUpdate({ menuExitTime: v })} width="w-32" />
      </FieldRow>

      <FieldRow label="Status Message">
        <input
          type="text"
          value={settings.statusMessage1}
          disabled={!editable || isRadio}
          maxLength={16}
          onChange={e => onUpdate({ statusMessage1: e.target.value })}
          className="px-3 py-1.5 text-sm bg-surface-light border border-border rounded-md focus:outline-none focus:border-primary w-64 font-mono"
          title={isRadio ? 'Status message is in a separate memory region' : undefined}
        />
      </FieldRow>

      {isRadio && (
        <>
          <FieldRow label="Language">
            <EnumSelect
              value={settings.language}
              options={[{ value: 0, label: 'English' }, { value: 1, label: 'Chinese' }]}
              editable={editable}
              onChange={v => onUpdate({ language: v })}
            />
          </FieldRow>

          <FieldRow label="Show Clock">
            <BoolSelect value={settings.showClock} editable={editable} onChange={v => onUpdate({ showClock: v })} />
          </FieldRow>

          <FieldRow label="Show Channel Number">
            <BoolSelect value={settings.showChannelNumber} editable={editable} onChange={v => onUpdate({ showChannelNumber: v })} />
          </FieldRow>

          <FieldRow label="Show Current Contact">
            <BoolSelect value={settings.showCurrentContact} editable={editable} onChange={v => onUpdate({ showCurrentContact: v })} />
          </FieldRow>

          <FieldRow label="Display Separator">
            <BoolSelect value={settings.displaySeparator} editable={editable} onChange={v => onUpdate({ displaySeparator: v })} />
          </FieldRow>

          <FieldRow label="TX Backlight Duration">
            <NumberField value={settings.txBacklightDuration} min={0} max={30} editable={editable} onChange={v => onUpdate({ txBacklightDuration: v })} suffix="sec" />
          </FieldRow>

          <FieldRow label="Standby Text Color">
            <EnumSelect value={settings.standbyTextColor} options={NAME_COLORS} editable={editable} onChange={v => onUpdate({ standbyTextColor: v })} />
          </FieldRow>

          <FieldRow label="Standby Background Color">
            <EnumSelect value={settings.standbyBgColor} options={NAME_COLORS} editable={editable} onChange={v => onUpdate({ standbyBgColor: v })} />
          </FieldRow>
        </>
      )}
    </div>
  );
}

function AudioTab({ settings, editable, onUpdate }: TabProps) {
  return (
    <div className="space-y-4 max-w-lg">
      <FieldRow label="Key Tone">
        <BoolSelect value={settings.keyTone} editable={editable} onChange={v => onUpdate({ keyTone: v })} />
      </FieldRow>

      <FieldRow label="Startup Tone">
        <BoolSelect value={settings.startupTone} editable={editable} onChange={v => onUpdate({ startupTone: v })} />
      </FieldRow>

      <FieldRow label="Call End Prompt">
        <BoolSelect value={settings.callEndPrompt} editable={editable} onChange={v => onUpdate({ callEndPrompt: v })} />
      </FieldRow>

      <FieldRow label="DMR Mic Gain">
        {settings.dmrMicGain !== undefined ? (
          <SliderField value={settings.dmrMicGain} min={1} max={10} editable={editable} onChange={v => onUpdate({ dmrMicGain: v })} />
        ) : <span className="text-text-dimmed text-sm">—</span>}
      </FieldRow>

      <FieldRow label="Max Speaker Volume">
        {settings.maxSpeakerVolume !== undefined ? (
          <SliderField value={settings.maxSpeakerVolume} min={1} max={10} editable={editable} onChange={v => onUpdate({ maxSpeakerVolume: v })} />
        ) : <span className="text-text-dimmed text-sm">—</span>}
      </FieldRow>

      <FieldRow label="STE Type">
        <EnumSelect value={settings.steType} options={STE_TYPES} editable={editable} onChange={v => onUpdate({ steType: v })} />
      </FieldRow>

      <FieldRow label="STE Frequency">
        <EnumSelect value={settings.steFrequency} options={STE_FREQUENCIES} editable={editable} onChange={v => onUpdate({ steFrequency: v })} />
      </FieldRow>
    </div>
  );
}

function TimeoutsTab({ settings, editable, onUpdate }: TabProps) {
  // TX timeout options: 0=off, 1-10 = 30-300s
  const txTimeoutOptions = [{ value: 0, label: 'Off' }];
  for (let i = 1; i <= 10; i++) txTimeoutOptions.push({ value: i, label: `${i * 30}s` });

  return (
    <div className="space-y-4 max-w-lg">
      <FieldRow label="TX Timeout">
        <EnumSelect value={settings.txTimeout} options={txTimeoutOptions} editable={editable} onChange={v => onUpdate({ txTimeout: v })} />
      </FieldRow>

      <FieldRow label="Group Call Hang Time">
        <NumberField value={settings.groupCallHangTime} min={0} max={30} editable={editable} onChange={v => onUpdate({ groupCallHangTime: v })} suffix="sec" />
      </FieldRow>

      <FieldRow label="Private Call Hang Time">
        <NumberField value={settings.privateCallHangTime} min={0} max={30} editable={editable} onChange={v => onUpdate({ privateCallHangTime: v })} suffix="sec" />
      </FieldRow>

      <FieldRow label="Long Press Duration">
        <NumberField value={settings.longPressDuration} min={1} max={5} editable={editable} onChange={v => onUpdate({ longPressDuration: v })} suffix="sec" />
      </FieldRow>
    </div>
  );
}

function GpsBtTab({ settings, editable, onUpdate }: TabProps) {
  return (
    <div className="space-y-5 max-w-lg">
      <div>
        <h4 className="text-xs font-medium text-text-dimmed mb-3 uppercase tracking-wider">GPS</h4>
        <div className="space-y-4">
          <FieldRow label="GPS Enable">
            <BoolSelect value={settings.gpsEnable} editable={editable} onChange={v => onUpdate({ gpsEnable: v })} />
          </FieldRow>

          <FieldRow label="GPS Timezone">
            <EnumSelect value={settings.gpsTimezone} options={GPS_TIMEZONES} editable={editable} onChange={v => onUpdate({ gpsTimezone: v })} width="w-56" />
          </FieldRow>

          <FieldRow label="GPS Update Period">
            <NumberField value={settings.gpsUpdatePeriod} min={0} max={255} editable={editable} onChange={v => onUpdate({ gpsUpdatePeriod: v })} suffix="sec" />
          </FieldRow>

          <FieldRow label="GPS Units">
            <EnumSelect
              value={settings.gpsUnits}
              options={[{ value: 0, label: 'Metric' }, { value: 1, label: 'Imperial' }]}
              editable={editable}
              onChange={v => onUpdate({ gpsUnits: v })}
            />
          </FieldRow>
        </div>
      </div>

      <div>
        <h4 className="text-xs font-medium text-text-dimmed mb-3 uppercase tracking-wider">Bluetooth</h4>
        <div className="space-y-4">
          <FieldRow label="Bluetooth Enable">
            <BoolSelect value={settings.bluetoothEnable} editable={editable} onChange={v => onUpdate({ bluetoothEnable: v })} />
          </FieldRow>

          <FieldRow label="BT Mic Gain">
            {settings.btMicGain !== undefined ? (
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={4}
                  value={settings.btMicGain}
                  disabled={!editable}
                  onChange={e => onUpdate({ btMicGain: Number(e.target.value) })}
                  className="flex-1 accent-primary"
                />
                <span className="text-sm font-mono w-6 text-right">{(settings.btMicGain + 1) * 2}</span>
              </div>
            ) : <span className="text-text-dimmed text-sm">—</span>}
          </FieldRow>

          <FieldRow label="BT Speaker Gain">
            {settings.btSpeakerGain !== undefined ? (
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={4}
                  value={settings.btSpeakerGain}
                  disabled={!editable}
                  onChange={e => onUpdate({ btSpeakerGain: Number(e.target.value) })}
                  className="flex-1 accent-primary"
                />
                <span className="text-sm font-mono w-6 text-right">{(settings.btSpeakerGain + 1) * 2}</span>
              </div>
            ) : <span className="text-text-dimmed text-sm">—</span>}
          </FieldRow>
        </div>
      </div>
    </div>
  );
}

function BootTab({ settings, editable, onUpdate }: TabProps) {
  return (
    <div className="space-y-4 max-w-lg">
      <FieldRow label="Default Channels Enable">
        <BoolSelect value={settings.defaultChannelsEnable} editable={editable} onChange={v => onUpdate({ defaultChannelsEnable: v })} />
      </FieldRow>

      <FieldRow label="Default Zone A">
        <NumberField value={settings.defaultZoneA} min={0} max={250} editable={editable} onChange={v => onUpdate({ defaultZoneA: v })} />
      </FieldRow>

      <FieldRow label="Default Zone B">
        <NumberField value={settings.defaultZoneB} min={0} max={250} editable={editable} onChange={v => onUpdate({ defaultZoneB: v })} />
      </FieldRow>

      <FieldRow label="Default Channel A">
        {settings.defaultChannelA !== undefined ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={255}
              value={settings.defaultChannelA}
              disabled={!editable}
              onChange={e => onUpdate({ defaultChannelA: Number(e.target.value) })}
              className="px-3 py-1.5 text-sm bg-surface-light border border-border rounded-md focus:outline-none focus:border-primary font-mono tabular-nums w-24"
            />
            {settings.defaultChannelA === 0xFF && <span className="text-xs text-text-dimmed">VFO</span>}
          </div>
        ) : <span className="text-text-dimmed text-sm">—</span>}
      </FieldRow>

      <FieldRow label="Default Channel B">
        {settings.defaultChannelB !== undefined ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={255}
              value={settings.defaultChannelB}
              disabled={!editable}
              onChange={e => onUpdate({ defaultChannelB: Number(e.target.value) })}
              className="px-3 py-1.5 text-sm bg-surface-light border border-border rounded-md focus:outline-none focus:border-primary font-mono tabular-nums w-24"
            />
            {settings.defaultChannelB === 0xFF && <span className="text-xs text-text-dimmed">VFO</span>}
          </div>
        ) : <span className="text-text-dimmed text-sm">—</span>}
      </FieldRow>
    </div>
  );
}

function RoamingTab({ settings, editable, onUpdate }: TabProps) {
  return (
    <div className="space-y-4 max-w-lg">
      <FieldRow label="Roaming Enable">
        <BoolSelect value={settings.roamingEnable} editable={editable} onChange={v => onUpdate({ roamingEnable: v })} />
      </FieldRow>

      <FieldRow label="Auto Roam Period">
        <NumberField value={settings.autoRoamPeriod} min={0} max={255} editable={editable} onChange={v => onUpdate({ autoRoamPeriod: v })} suffix="min" />
      </FieldRow>

      <FieldRow label="Auto Roam Delay">
        <NumberField value={settings.autoRoamDelay} min={0} max={255} editable={editable} onChange={v => onUpdate({ autoRoamDelay: v })} suffix="sec" />
      </FieldRow>

      <FieldRow label="Repeater Range Check">
        <BoolSelect value={settings.repeaterRangeCheck} editable={editable} onChange={v => onUpdate({ repeaterRangeCheck: v })} />
      </FieldRow>

      <FieldRow label="Range Check Interval">
        {settings.rangeCheckInterval !== undefined ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={50}
              value={settings.rangeCheckInterval}
              disabled={!editable}
              onChange={e => onUpdate({ rangeCheckInterval: Number(e.target.value) })}
              className="px-3 py-1.5 text-sm bg-surface-light border border-border rounded-md focus:outline-none focus:border-primary font-mono tabular-nums w-24"
            />
            <span className="text-xs text-text-dimmed">{settings.rangeCheckInterval * 5}s</span>
          </div>
        ) : <span className="text-text-dimmed text-sm">—</span>}
      </FieldRow>

      <FieldRow label="Roaming Start Condition">
        <EnumSelect value={settings.roamingStartCondition} options={ROAMING_START_CONDITIONS} editable={editable} onChange={v => onUpdate({ roamingStartCondition: v })} />
      </FieldRow>
    </div>
  );
}

function KeySelect({ value, editable, onChange }: {
  value: number; editable: boolean; onChange: (v: number) => void;
}) {
  const isKnown = KEY_FUNCTIONS.some(kf => kf.value === value);
  return (
    <select
      value={value}
      disabled={!editable}
      onChange={e => onChange(Number(e.target.value))}
      className="w-full px-2 py-1 text-xs bg-surface-light border border-border rounded-md focus:outline-none focus:border-primary"
    >
      {!isKnown && (
        <option value={value}>{keyFunctionLabel(value)}</option>
      )}
      {KEY_FUNCTIONS.map(kf => (
        <option key={kf.value} value={kf.value}>{kf.label}</option>
      ))}
    </select>
  );
}

function KeyFunctionTab({ settings, editable, onUpdate }: TabProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-text-dimmed text-xs">
            <th className="text-left pb-2 pr-3 w-12">Key</th>
            <th className="text-left pb-2 px-2">Short Press</th>
            <th className="text-left pb-2 pl-2">Long Press</th>
          </tr>
        </thead>
        <tbody>
          {KEY_LABELS.map((label, i) => (
            <tr key={label} className="border-t border-border/50">
              <td className="py-1.5 pr-3 font-medium text-text-muted">{label}</td>
              <td className="py-1.5 px-2">
                <KeySelect
                  value={settings[SHORT_KEY_FIELDS[i]]}
                  editable={editable}
                  onChange={v => onUpdate({ [SHORT_KEY_FIELDS[i]]: v })}
                />
              </td>
              <td className="py-1.5 pl-2">
                <KeySelect
                  value={settings[LONG_KEY_FIELDS[i]]}
                  editable={editable}
                  onChange={v => onUpdate({ [LONG_KEY_FIELDS[i]]: v })}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VfoScanTab({ settings, editable, onUpdate, isRadio }: TabProps) {
  return (
    <div className="space-y-5 max-w-lg">
      {isRadio && (
        <div className="space-y-4 mb-4">
          <FieldRow label="VFO Mode A">
            <EnumSelect
              value={settings.vfoModeA}
              options={[{ value: 0, label: 'Memory' }, { value: 1, label: 'VFO' }]}
              editable={editable}
              onChange={v => onUpdate({ vfoModeA: v })}
            />
          </FieldRow>

          <FieldRow label="VFO Mode B">
            <EnumSelect
              value={settings.vfoModeB}
              options={[{ value: 0, label: 'Memory' }, { value: 1, label: 'VFO' }]}
              editable={editable}
              onChange={v => onUpdate({ vfoModeB: v })}
            />
          </FieldRow>

          <FieldRow label="VFO Step Size">
            <EnumSelect value={settings.vfoStepSize} options={VFO_STEP_SIZES} editable={editable} onChange={v => onUpdate({ vfoStepSize: v })} />
          </FieldRow>
        </div>
      )}

      <div>
        <h4 className="text-xs font-medium text-text-dimmed mb-3 uppercase tracking-wider">UHF Range</h4>
        <div className="space-y-3">
          <FieldRow label="Start Frequency (MHz)">
            <input
              type="number"
              step="0.00001"
              value={settings.vfoScanStartUhf.toFixed(5)}
              disabled={!editable}
              onChange={e => onUpdate({ vfoScanStartUhf: Number(e.target.value) })}
              className="px-3 py-1.5 text-sm bg-surface-light border border-border rounded-md focus:outline-none focus:border-primary w-40 font-mono tabular-nums"
            />
          </FieldRow>
          <FieldRow label="End Frequency (MHz)">
            <input
              type="number"
              step="0.00001"
              value={settings.vfoScanEndUhf.toFixed(5)}
              disabled={!editable}
              onChange={e => onUpdate({ vfoScanEndUhf: Number(e.target.value) })}
              className="px-3 py-1.5 text-sm bg-surface-light border border-border rounded-md focus:outline-none focus:border-primary w-40 font-mono tabular-nums"
            />
          </FieldRow>
        </div>
      </div>

      <div>
        <h4 className="text-xs font-medium text-text-dimmed mb-3 uppercase tracking-wider">VHF Range</h4>
        <div className="space-y-3">
          <FieldRow label="Start Frequency (MHz)">
            <input
              type="number"
              step="0.00001"
              value={settings.vfoScanStartVhf.toFixed(5)}
              disabled={!editable}
              onChange={e => onUpdate({ vfoScanStartVhf: Number(e.target.value) })}
              className="px-3 py-1.5 text-sm bg-surface-light border border-border rounded-md focus:outline-none focus:border-primary w-40 font-mono tabular-nums"
            />
          </FieldRow>
          <FieldRow label="End Frequency (MHz)">
            <input
              type="number"
              step="0.00001"
              value={settings.vfoScanEndVhf.toFixed(5)}
              disabled={!editable}
              onChange={e => onUpdate({ vfoScanEndVhf: Number(e.target.value) })}
              className="px-3 py-1.5 text-sm bg-surface-light border border-border rounded-md focus:outline-none focus:border-primary w-40 font-mono tabular-nums"
            />
          </FieldRow>
        </div>
      </div>
    </div>
  );
}

function OtherTab({ settings, editable, onUpdate, isRadio }: TabProps) {
  return (
    <div className="space-y-4 max-w-lg">
      <FieldRow label="SQL Level A">
        <select
          value={settings.sqlLevelA}
          disabled={!editable}
          onChange={e => onUpdate({ sqlLevelA: Number(e.target.value) })}
          className="px-3 py-1.5 text-sm bg-surface-light border border-border rounded-md focus:outline-none focus:border-primary w-24"
        >
          {Array.from({ length: 10 }, (_, i) => (
            <option key={i} value={i}>{i}</option>
          ))}
        </select>
      </FieldRow>

      <FieldRow label="SQL Level B">
        <select
          value={settings.sqlLevelB}
          disabled={!editable}
          onChange={e => onUpdate({ sqlLevelB: Number(e.target.value) })}
          className="px-3 py-1.5 text-sm bg-surface-light border border-border rounded-md focus:outline-none focus:border-primary w-24"
        >
          {Array.from({ length: 10 }, (_, i) => (
            <option key={i} value={i}>{i}</option>
          ))}
        </select>
      </FieldRow>

      {isRadio && (
        <>
          <FieldRow label="Recording Enable">
            <BoolSelect value={settings.recordingEnable} editable={editable} onChange={v => onUpdate({ recordingEnable: v })} />
          </FieldRow>

          <FieldRow label="Remote Stun/Kill">
            <BoolSelect value={settings.remoteStunKill} editable={editable} onChange={v => onUpdate({ remoteStunKill: v })} />
          </FieldRow>

          <FieldRow label="Talk Permit (DMR)">
            <BoolSelect value={settings.talkPermitDmr} editable={editable} onChange={v => onUpdate({ talkPermitDmr: v })} />
          </FieldRow>

          <FieldRow label="Talk Permit (FM)">
            <BoolSelect value={settings.talkPermitFm} editable={editable} onChange={v => onUpdate({ talkPermitFm: v })} />
          </FieldRow>
        </>
      )}
    </div>
  );
}
