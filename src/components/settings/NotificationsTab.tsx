import { TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Bell } from 'lucide-react';

interface NotificationsTabProps {
  notifications: {
    criticalEscalations: boolean;
    dailyDigest: boolean;
    ruleChangeAlerts: boolean;
    confidenceDrift: boolean;
  };
  setNotifications: React.Dispatch<React.SetStateAction<NotificationsTabProps['notifications']>>;
}

export function NotificationsTab({ notifications, setNotifications }: NotificationsTabProps) {
  return (
    <TabsContent value="notifications" className="space-y-4">
      <div className="rounded-xl border border-border bg-gradient-card p-6 space-y-4">
        <h3 className="text-body-md font-semibold text-foreground flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" /> Notification Preferences
        </h3>
        {([
          { key: 'criticalEscalations' as const, label: 'Email on critical escalations' },
          { key: 'dailyDigest' as const, label: 'Daily digest of auto-resolved cases' },
          { key: 'ruleChangeAlerts' as const, label: 'Rule version change alerts' },
          { key: 'confidenceDrift' as const, label: 'Confidence drift warnings' },
        ]).map(n => (
          <div key={n.key} className="flex items-center justify-between p-4 rounded-lg bg-surface-2">
            <span className="text-body-sm text-foreground">{n.label}</span>
            <Switch checked={notifications[n.key]} onCheckedChange={v => setNotifications(prev => ({ ...prev, [n.key]: v }))} />
          </div>
        ))}
      </div>
    </TabsContent>
  );
}
