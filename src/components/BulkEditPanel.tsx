import { useState } from 'react';
import type { Channel, ChannelMode, PowerLevel, Bandwidth, TimeSlot } from '../lib/types';

interface Props {
  count: number;
  onApply: (changes: Partial<Channel>) => void;
  onClose: () => void;
}

const NO_CHANGE = '__no_change__';

export function BulkEditPanel({ count, onApply, onClose }: Props) {
  const [mode, setMode] = useState(NO_CHANGE);
  const [power, setPower] = useState(NO_CHANGE);
  const [bandwidth, setBandwidth] = useState(NO_CHANGE);
  const [colorCode, setColorCode] = useState(NO_CHANGE);
  const [timeSlot, setTimeSlot] = useState(NO_CHANGE);
  const [rxOnly, setRxOnly] = useState(NO_CHANGE);

  const hasChanges = [mode, power, bandwidth, colorCode, timeSlot, rxOnly].some(v => v !== NO_CHANGE);

  const handleApply = () => {
    const changes: Partial<Channel> = {};
    if (mode !== NO_CHANGE) changes.mode = mode as ChannelMode;
    if (power !== NO_CHANGE) changes.power = power as PowerLevel;
    if (bandwidth !== NO_CHANGE) changes.bandwidth = bandwidth as Bandwidth;
    if (colorCode !== NO_CHANGE) changes.colorCode = parseInt(colorCode);
    if (timeSlot !== NO_CHANGE) changes.timeSlot = parseInt(timeSlot) as TimeSlot;
    if (rxOnly !== NO_CHANGE) changes.rxOnly = rxOnly === 'true';
    onApply(changes);
  };

  const selectClass = "bg-surface-lighter text-text text-sm px-2 py-1.5 rounded-md border border-border outline-none focus:border-primary/50";

  return (
    <div className="bg-surface-light border border-border rounded-lg px-4 py-3 flex items-center gap-4 flex-wrap">
      <span className="text-sm text-text-muted font-medium">Bulk Edit</span>

      <label className="flex items-center gap-1.5 text-xs text-text-muted">
        Mode
        <select value={mode} onChange={e => setMode(e.target.value)} className={selectClass}>
          <option value={NO_CHANGE}>— No change —</option>
          <option value="analog">FM</option>
          <option value="digital">DMR</option>
        </select>
      </label>

      <label className="flex items-center gap-1.5 text-xs text-text-muted">
        Power
        <select value={power} onChange={e => setPower(e.target.value)} className={selectClass}>
          <option value={NO_CHANGE}>— No change —</option>
          <option value="low">Low</option>
          <option value="mid">Mid</option>
          <option value="high">High</option>
          <option value="turbo">Turbo</option>
        </select>
      </label>

      <label className="flex items-center gap-1.5 text-xs text-text-muted">
        BW
        <select value={bandwidth} onChange={e => setBandwidth(e.target.value)} className={selectClass}>
          <option value={NO_CHANGE}>— No change —</option>
          <option value="narrow">12.5 kHz</option>
          <option value="wide">25 kHz</option>
        </select>
      </label>

      <label className="flex items-center gap-1.5 text-xs text-text-muted">
        CC
        <select value={colorCode} onChange={e => setColorCode(e.target.value)} className={selectClass}>
          <option value={NO_CHANGE}>— No change —</option>
          {Array.from({ length: 16 }, (_, i) => (
            <option key={i} value={String(i)}>{i}</option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-1.5 text-xs text-text-muted">
        TS
        <select value={timeSlot} onChange={e => setTimeSlot(e.target.value)} className={selectClass}>
          <option value={NO_CHANGE}>— No change —</option>
          <option value="1">TS1</option>
          <option value="2">TS2</option>
        </select>
      </label>

      <label className="flex items-center gap-1.5 text-xs text-text-muted">
        RX Only
        <select value={rxOnly} onChange={e => setRxOnly(e.target.value)} className={selectClass}>
          <option value={NO_CHANGE}>— No change —</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      </label>

      <div className="flex items-center gap-2 ml-auto">
        <button
          onClick={handleApply}
          disabled={!hasChanges}
          className="px-4 py-1.5 text-sm bg-primary hover:bg-primary-light text-white rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Apply to {count} channel{count > 1 ? 's' : ''}
        </button>
        <button
          onClick={onClose}
          className="px-3 py-1.5 text-sm text-text-dimmed hover:text-text-muted transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
