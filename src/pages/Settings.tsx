import { AppLayout } from '@/components/layout/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Settings as SettingsIcon, Shield, Zap, Users, Bell, Loader2 } from 'lucide-react';
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
    saveMutation.mutate({
      autoResolveThreshold: autoResolveThreshold[0],
      escalationThreshold: escalationThreshold[0],
      modes,
      notifications,
    });
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
          </TabsList>

          <TabsContent value="inference" className="space-y-4">
            <div className="rounded-xl border border-border bg-gradient-card p-6 space-y-6">
              <h3 className="text-body-md font-semibold text-foreground flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" /> Confidence Thresholds
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-body-sm text-muted-foreground">Auto-Resolution Threshold</span>
                    <Badge variant="confidence" className="font-mono">{autoResolveThreshold[0]}%</Badge>
                  </div>
                  <Slider value={autoResolveThreshold} onValueChange={setAutoResolveThreshold} min={50} max={99} step={1} />
                  <p className="text-caption text-muted-foreground mt-1">Cases above this confidence are auto-resolved</p>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-body-sm text-muted-foreground">Escalation Threshold</span>
                    <Badge variant="warning" className="font-mono">{escalationThreshold[0]}%</Badge>
                  </div>
                  <Slider value={escalationThreshold} onValueChange={setEscalationThreshold} min={10} max={70} step={1} />
                  <p className="text-caption text-muted-foreground mt-1">Cases below this confidence are escalated</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-gradient-card p-6 space-y-4">
              <h3 className="text-body-md font-semibold text-foreground">Inference Modes</h3>
              {([
                { key: 'instant' as const, mode: 'Instant Mode', desc: 'Normalization + rules + scoring. Fastest path.' },
                { key: 'deep' as const, mode: 'Deep Mode', desc: 'Instant + contradiction analysis + expanded actions.' },
                { key: 'assisted' as const, mode: 'Assisted Reasoning', desc: 'Deep + optional LLM reasoning for complex cases.' },
              ]).map(m => (
                <div key={m.key} className="flex items-center justify-between p-4 rounded-lg bg-surface-2">
                  <div>
                    <span className="text-body-sm font-medium text-foreground">{m.mode}</span>
                    <p className="text-caption text-muted-foreground">{m.desc}</p>
                  </div>
                  <Switch checked={modes[m.key]} onCheckedChange={v => setModes(prev => ({ ...prev, [m.key]: v }))} />
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="policies" className="space-y-4">
            <div className="rounded-xl border border-border bg-gradient-card p-6 space-y-4">
              <h3 className="text-body-md font-semibold text-foreground flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" /> Severity Policies
              </h3>
              {['Critical', 'High', 'Medium', 'Low'].map(sev => (
                <div key={sev} className="flex items-center justify-between p-4 rounded-lg bg-surface-2">
                  <div>
                    <span className="text-body-sm font-medium text-foreground">{sev} Severity</span>
                    <p className="text-caption text-muted-foreground">Configure routing and SLA for {sev.toLowerCase()} severity cases</p>
                  </div>
                  <Button variant="outline" size="sm">Configure</Button>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="organization" className="space-y-4">
            <div className="rounded-xl border border-border bg-gradient-card p-6 space-y-4">
              <h3 className="text-body-md font-semibold text-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" /> Organization
              </h3>
              <div className="grid gap-4">
                <div>
                  <label className="text-body-sm text-muted-foreground mb-1 block">Organization Name</label>
                  <Input value={orgName} onChange={e => setOrgName(e.target.value)} className="bg-surface-2 max-w-sm" />
                </div>
                <div>
                  <label className="text-body-sm text-muted-foreground mb-1 block">Organization ID</label>
                  <Input value={org?.id || ''} className="bg-surface-2 max-w-sm" disabled />
                </div>
              </div>
            </div>
          </TabsContent>

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
        </Tabs>
      </div>
    </AppLayout>
  );
}
