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

export function AppShell({ activeSection, onSectionChange, codeplug, issues, children }: Props) {
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
  ];

  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warnCount = issues.filter(i => i.severity === 'warning').length;

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Sidebar */}
      <nav className="w-48 bg-surface border-r border-border flex flex-col shrink-0">
        <div className="flex-1 py-2">
          {items.map(item => (
            <button
              key={item.key}
              onClick={() => onSectionChange(item.key)}
              className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center justify-between ${
                activeSection === item.key
                  ? 'bg-primary/20 text-primary-light border-r-2 border-primary-light'
                  : 'text-text-muted hover:bg-surface-light hover:text-text'
              }`}
            >
              <span>{item.label}</span>
              {item.count !== undefined && (
                <span className="text-[10px] text-text-muted bg-surface-lighter px-1.5 py-0.5 rounded">
                  {item.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Validation summary */}
        {(errorCount > 0 || warnCount > 0) && (
          <div className="px-4 py-2 border-t border-border text-[10px] space-y-1">
            {errorCount > 0 && (
              <div className="text-accent-red">{errorCount} error{errorCount > 1 ? 's' : ''}</div>
            )}
            {warnCount > 0 && (
              <div className="text-accent-amber">{warnCount} warning{warnCount > 1 ? 's' : ''}</div>
            )}
          </div>
        )}
      </nav>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-4">
        {children}
      </main>
    </div>
  );
}
