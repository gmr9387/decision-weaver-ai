import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings as SettingsIcon, Loader2 } from 'lucide-react';
import { InferenceTab } from '@/components/settings/InferenceTab';
import { PoliciesTab } from '@/components/settings/PoliciesTab';
import { OrganizationTab } from '@/components/settings/OrganizationTab';
import { NotificationsTab } from '@/components/settings/NotificationsTab';
import { WebhooksTab } from '@/components/settings/WebhooksTab';
import { ApiLogsTab } from '@/components/settings/ApiLogsTab';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface OrgSettings {
  autoResolveThreshold: number;
  escalationThreshold: number;
  modes: { instant: boolean; deep: boolean; assisted: boolean };
  notifications: {
    criticalEscalations: boolean;
    dailyDigest: boolean;
    ruleChangeAlerts: boolean;
    confidenceDrift: boolean;
  };
}

const DEFAULT_SETTINGS: OrgSettings = {
  autoResolveThreshold: 85,
  escalationThreshold: 40,
  modes: { instant: true, deep: true, assisted: false },
  notifications: { criticalEscalations: true, dailyDigest: true, ruleChangeAlerts: true, confidenceDrift: true },
};

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: org, isLoading } = useQuery({
    queryKey: ['organization'],
    queryFn: async () => {
      const { data: profile } = await supabase.from('profiles').select('organization_id').eq('user_id', user!.id).single();
      if (!profile?.organization_id) return null;
      const { data } = await supabase.from('organizations').select('*').eq('id', profile.organization_id).single();
      return data;
    },
    enabled: !!user,
  });

  const settings: OrgSettings = { ...DEFAULT_SETTINGS, ...((org?.settings as any) || {}) };

  const [autoResolveThreshold, setAutoResolveThreshold] = useState([settings.autoResolveThreshold]);
  const [escalationThreshold, setEscalationThreshold] = useState([settings.escalationThreshold]);
  const [modes, setModes] = useState(settings.modes);
  const [notifications, setNotifications] = useState(settings.notifications);
  const [orgName, setOrgName] = useState('');

  useEffect(() => {
    if (org) {
      const s = { ...DEFAULT_SETTINGS, ...((org.settings as any) || {}) };
      setAutoResolveThreshold([s.autoResolveThreshold]);
      setEscalationThreshold([s.escalationThreshold]);
      setModes(s.modes);
      setNotifications(s.notifications);
      setOrgName(org.name);
    }
  }, [org]);

  const saveMutation = useMutation({
    mutationFn: async (newSettings: OrgSettings) => {
      if (!org) throw new Error('No organization');
      const { error } = await supabase.from('organizations').update({
        settings: newSettings as any,
        name: orgName,
      }).eq('id', org.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization'] });
      toast({ title: 'Settings saved', description: 'Your configuration has been updated.' });
    },
    onError: (err: any) => {
      toast({ title: 'Error saving', description: err.message, variant: 'destructive' });
    },
  });

  const handleSave = () => {
    saveMutation.mutate({ autoResolveThreshold: autoResolveThreshold[0], escalationThreshold: escalationThreshold[0], modes, notifications });
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      </AppLayout>
    );
  }

  const apiKey = (org?.settings as any)?.api_key;

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-4xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <SettingsIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-display-sm text-foreground">Settings</h1>
              <p className="text-body-sm text-muted-foreground">Configure inference policies and system behavior</p>
            </div>
          </div>
          <Button variant="hero" onClick={handleSave} disabled={saveMutation.isPending} className="gap-2">
            {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Changes
          </Button>
        </div>

        <Tabs defaultValue="inference" className="space-y-4">
          <TabsList className="bg-surface-2 border border-border">
            <TabsTrigger value="inference">Inference</TabsTrigger>
            <TabsTrigger value="policies">Policies</TabsTrigger>
            <TabsTrigger value="organization">Organization</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
            <TabsTrigger value="api-logs">API Logs</TabsTrigger>
          </TabsList>

          <InferenceTab
            autoResolveThreshold={autoResolveThreshold} setAutoResolveThreshold={setAutoResolveThreshold}
            escalationThreshold={escalationThreshold} setEscalationThreshold={setEscalationThreshold}
            modes={modes} setModes={setModes}
          />
          <PoliciesTab />
          <OrganizationTab org={org} orgName={orgName} setOrgName={setOrgName} apiKey={apiKey} />
          <NotificationsTab notifications={notifications} setNotifications={setNotifications} />
          <WebhooksTab orgId={org?.id} />
          <ApiLogsTab orgId={org?.id} />
        </Tabs>
      </div>
    </AppLayout>
  );
}
