import { AppLayout } from '@/components/layout/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Settings as SettingsIcon, Shield, Zap, Users, Bell, Loader2, Key, Copy, RefreshCw, Activity, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

function ApiLogsTab({ orgId }: { orgId?: string }) {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['api-logs', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('api_request_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
    staleTime: 10000,
  });

  const totalRequests = logs.length;
  const errorCount = logs.filter(l => (l.status_code as number) >= 400).length;
  const successCount = logs.filter(l => (l.status_code as number) < 400).length;
  const avgDuration = totalRequests > 0
    ? Math.round(logs.reduce((sum, l) => sum + ((l.duration_ms as number) || 0), 0) / totalRequests)
    : 0;
  const errorRate = totalRequests > 0 ? ((errorCount / totalRequests) * 100).toFixed(1) : '0';

  return (
    <TabsContent value="api-logs" className="space-y-4">
      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Requests', value: totalRequests, icon: Activity, color: 'text-primary' },
          { label: 'Success', value: successCount, icon: CheckCircle2, color: 'text-emerald-400' },
          { label: 'Errors', value: `${errorCount} (${errorRate}%)`, icon: AlertCircle, color: 'text-red-400' },
          { label: 'Avg Latency', value: `${avgDuration}ms`, icon: Clock, color: 'text-amber-400' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-border bg-gradient-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <s.icon className={`w-4 h-4 ${s.color}`} />
              <span className="text-caption text-muted-foreground">{s.label}</span>
            </div>
            <span className="text-body-md font-bold text-foreground">{s.value}</span>
          </div>
        ))}
      </div>

      {/* Logs table */}
      <div className="rounded-xl border border-border bg-gradient-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-surface-2">
          <h3 className="text-body-sm font-semibold text-foreground flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" /> Request History
          </h3>
          <p className="text-caption text-muted-foreground">Last 100 API requests</p>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12">
            <Activity className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-body-sm text-muted-foreground">No API requests yet</p>
            <p className="text-caption text-muted-foreground">Submit a case via the API to see logs here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-body-sm">
              <thead>
                <tr className="border-b border-border bg-surface-2">
                  <th className="text-left text-overline text-muted-foreground uppercase px-4 py-2">Time</th>
                  <th className="text-left text-overline text-muted-foreground uppercase px-4 py-2">Status</th>
                  <th className="text-left text-overline text-muted-foreground uppercase px-4 py-2">Latency</th>
                  <th className="text-left text-overline text-muted-foreground uppercase px-4 py-2">IP</th>
                  <th className="text-left text-overline text-muted-foreground uppercase px-4 py-2">Summary</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log: any) => (
                  <tr key={log.id} className="border-b border-border/50 hover:bg-surface-hover transition-colors">
                    <td className="px-4 py-2 text-caption text-muted-foreground font-mono whitespace-nowrap">
                      {format(new Date(log.created_at), 'MMM d, HH:mm:ss')}
                    </td>
                    <td className="px-4 py-2">
                      <Badge variant={log.status_code < 400 ? 'success' : log.status_code === 429 ? 'warning' : 'destructive'} className="font-mono text-xs">
                        {log.status_code}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 text-caption text-muted-foreground font-mono">{log.duration_ms}ms</td>
                    <td className="px-4 py-2 text-caption text-muted-foreground font-mono">{log.ip_address}</td>
                    <td className="px-4 py-2 text-caption text-foreground max-w-[200px] truncate">{log.response_summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </TabsContent>
  );
}

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
            <TabsTrigger value="api-logs">API Logs</TabsTrigger>
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

            {/* API Key Section */}
            <div className="rounded-xl border border-border bg-gradient-card p-6 space-y-4">
              <h3 className="text-body-md font-semibold text-foreground flex items-center gap-2">
                <Key className="w-4 h-4 text-primary" /> API Ingest Key
              </h3>
              <p className="text-caption text-muted-foreground">
                Use this key in the <code className="bg-surface-2 px-1 rounded text-xs">x-api-key</code> header to submit cases via the API.
              </p>
              {(settings as any).api_key || (org?.settings as any)?.api_key ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={(org?.settings as any)?.api_key || ''}
                    className="bg-surface-2 max-w-md font-mono text-xs"
                    readOnly
                  />
                  <Button variant="outline" size="icon" className="shrink-0" onClick={() => {
                    navigator.clipboard.writeText((org?.settings as any)?.api_key || '');
                    toast({ title: 'Copied to clipboard' });
                  }}>
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="shrink-0" onClick={async () => {
                    if (!org) return;
                    const { data } = await supabase.rpc('generate_org_api_key' as any, { org_id: org.id });
                    queryClient.invalidateQueries({ queryKey: ['organization'] });
                    toast({ title: 'API key regenerated', description: 'The old key is now invalid.' });
                  }}>
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <Button variant="outline" className="gap-2" onClick={async () => {
                  if (!org) return;
                  const { data } = await supabase.rpc('generate_org_api_key' as any, { org_id: org.id });
                  queryClient.invalidateQueries({ queryKey: ['organization'] });
                  toast({ title: 'API key generated', description: 'You can now use this key to submit cases via the API.' });
                }}>
                  <Key className="w-4 h-4" /> Generate API Key
                </Button>
              )}
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

          <ApiLogsTab orgId={org?.id} />
        </Tabs>
      </div>
    </AppLayout>
  );
}
