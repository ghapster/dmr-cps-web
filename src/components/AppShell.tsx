import { useState } from 'react';
import type { ActiveSection, ValidationIssue, Codeplug } from '../lib/types';

interface SidebarItem {
  key: ActiveSection;
  label: string;
  count?: number;
}

interface Props {
  activeSection: ActiveSection;
  onSectionChange: (section: ActiveSection) => void;
  codeplug: Codeplug | null;
  issues: ValidationIssue[];
  children: React.ReactNode;
}

const sectionNavMap: Record<ValidationIssue['section'], ActiveSection> = {
  channel: 'channels',
  zone: 'zones',
  contact: 'contacts',
  scanList: 'scanLists',
  groupList: 'groupLists',
  roaming: 'roaming',
  general: 'settings',
};

const MAX_VISIBLE_ISSUES = 20;

export function AppShell({ activeSection, onSectionChange, codeplug, issues, children }: Props) {
  const [issuesExpanded, setIssuesExpanded] = useState(false);

  const items: SidebarItem[] = [
    { key: 'channels', label: 'Channels', count: codeplug?.channels.length },
    { key: 'zones', label: 'Zones', count: codeplug?.zones.length },
    { key: 'radioIds', label: 'Radio IDs', count: codeplug?.radioIds.length },
    { key: 'contacts', label: 'Contacts', count: codeplug?.analogContacts.length },
    { key: 'digitalContacts', label: 'Digital Contacts', count: codeplug?.digitalContacts.length },
    { key: 'scanLists', label: 'Scan Lists', count: codeplug?.scanLists.length },
    { key: 'textMessages', label: 'Text Messages', count: codeplug?.textMessages.length },
    { key: 'groupLists', label: 'Group Lists', count: codeplug?.groupLists.length },
    { key: 'aprs', label: 'APRS' },
    { key: 'roaming', label: 'Roaming', count: codeplug ? codeplug.roamingChannels.length + codeplug.roamingZones.length : undefined },
    { key: 'settings', label: 'Settings' },
    { key: 'talkgroupLookup', label: 'TG Lookup' },
  ];

  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warnCount = issues.filter(i => i.severity === 'warning').length;
  const totalCount = errorCount + warnCount;
  const visibleIssues = issues.filter(i => i.severity !== 'info').slice(0, MAX_VISIBLE_ISSUES);
  const hiddenCount = totalCount - visibleIssues.length;

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Sidebar */}
      <nav className="w-52 bg-surface border-r border-border-subtle flex flex-col shrink-0">
        <div className="flex-1 py-2">
          {items.map(item => (
            <button
              key={item.key}
              onClick={() => onSectionChange(item.key)}
              className={`w-full text-left px-3 py-2 mx-0 text-sm transition-colors flex items-center justify-between ${
                activeSection === item.key
                  ? 'bg-surface-lighter text-text'
                  : 'text-text-muted hover:bg-surface-light hover:text-text'
              }`}
            >
              <div className="flex items-center gap-2">
                {activeSection === item.key && (
                  <div className="w-0.5 h-4 bg-primary rounded-full shrink-0" />
                )}
                <span>{item.label}</span>
              </div>
              {item.count !== undefined && (
                <span className="text-xs text-text-dimmed">
                  {item.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Validation summary */}
        {totalCount > 0 && (
          <div className="border-t border-border-subtle">
            <button
              onClick={() => setIssuesExpanded(!issuesExpanded)}
              className="w-full px-4 py-3 text-xs flex items-center gap-2 hover:bg-surface-light transition-colors"
            >
              <span className={`transition-transform ${issuesExpanded ? 'rotate-90' : ''}`}>&#9654;</span>
              <span className="flex gap-2">
                {errorCount > 0 && (
                  <span className="text-accent-red">{errorCount} error{errorCount > 1 ? 's' : ''}</span>
                )}
                {warnCount > 0 && (
                  <span className="text-accent-amber">{warnCount} warning{warnCount > 1 ? 's' : ''}</span>
                )}
              </span>
            </button>
            {issuesExpanded && (
              <div className="max-h-48 overflow-y-auto px-1 pb-2">
                {visibleIssues.map((issue, i) => (
                  <button
                    key={i}
                    onClick={() => onSectionChange(sectionNavMap[issue.section])}
                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-surface-light rounded-md transition-colors"
                  >
                    <span className={issue.severity === 'error' ? 'text-accent-red' : 'text-accent-amber'}>
                      {issue.message}
                    </span>
                  </button>
                ))}
                {hiddenCount > 0 && (
                  <div className="px-3 py-1.5 text-xs text-text-dimmed">
                    and {hiddenCount} more...
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-5">
        {children}
      </main>
    </div>
  );
}
