import { AppLayout } from '@/components/layout/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Settings as SettingsIcon, Shield, Zap, Users, Bell } from 'lucide-react';
import { useState } from 'react';

export default function Settings() {
  const [autoResolveThreshold, setAutoResolveThreshold] = useState([85]);
  const [escalationThreshold, setEscalationThreshold] = useState([40]);

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-4xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <SettingsIcon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-display-sm text-foreground">Settings</h1>
            <p className="text-body-sm text-muted-foreground">Configure inference policies and system behavior</p>
          </div>
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
              {[
                { mode: 'Instant Mode', desc: 'Normalization + rules + scoring. Fastest path.', enabled: true },
                { mode: 'Deep Mode', desc: 'Instant + contradiction analysis + expanded actions.', enabled: true },
                { mode: 'Assisted Reasoning', desc: 'Deep + optional LLM reasoning for complex cases.', enabled: false },
              ].map(m => (
                <div key={m.mode} className="flex items-center justify-between p-4 rounded-lg bg-surface-2">
                  <div>
                    <span className="text-body-sm font-medium text-foreground">{m.mode}</span>
                    <p className="text-caption text-muted-foreground">{m.desc}</p>
                  </div>
                  <Switch defaultChecked={m.enabled} />
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
                  <Input defaultValue="Acme Corp" className="bg-surface-2 max-w-sm" />
                </div>
                <div>
                  <label className="text-body-sm text-muted-foreground mb-1 block">Organization ID</label>
                  <Input defaultValue="org-001" className="bg-surface-2 max-w-sm" disabled />
                </div>
              </div>
              <Button>Save Changes</Button>
            </div>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <div className="rounded-xl border border-border bg-gradient-card p-6 space-y-4">
              <h3 className="text-body-md font-semibold text-foreground flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" /> Notification Preferences
              </h3>
              {[
                'Email on critical escalations',
                'Daily digest of auto-resolved cases',
                'Rule version change alerts',
                'Confidence drift warnings',
              ].map(n => (
                <div key={n} className="flex items-center justify-between p-4 rounded-lg bg-surface-2">
                  <span className="text-body-sm text-foreground">{n}</span>
                  <Switch defaultChecked />
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
