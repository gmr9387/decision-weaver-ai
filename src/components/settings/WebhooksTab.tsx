import { useState } from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, Webhook, Plus, Trash2, Eye, EyeOff, TestTube } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export function WebhooksTab({ orgId }: { orgId?: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newUrl, setNewUrl] = useState('');
  const [newSecret, setNewSecret] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, boolean>>({});

  const { data: webhooks = [], isLoading } = useQuery({
    queryKey: ['webhooks', orgId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('webhooks' as any).select('*').order('created_at', { ascending: false }) as any);
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!orgId || !newUrl) throw new Error('URL is required');
      const { error } = await (supabase.from('webhooks' as any).insert({
        organization_id: orgId,
        url: newUrl,
        signing_secret: newSecret || null,
        description: newDesc || null,
      }) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      setNewUrl(''); setNewSecret(''); setNewDesc(''); setShowForm(false);
      toast({ title: 'Webhook added' });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await (supabase.from('webhooks' as any).update({ enabled }).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['webhooks'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('webhooks' as any).delete().eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      toast({ title: 'Webhook deleted' });
    },
  });

  return (
    <TabsContent value="webhooks" className="space-y-4">
      <div className="rounded-xl border border-border bg-gradient-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-body-md font-semibold text-foreground flex items-center gap-2">
            <Webhook className="w-4 h-4 text-primary" /> Webhook Notifications
          </h3>
          {!showForm && (
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowForm(true)}>
              <Plus className="w-3.5 h-3.5" /> Add Webhook
            </Button>
          )}
        </div>
        <p className="text-caption text-muted-foreground">
          Receive HTTP POST notifications when cases are ingested via the API. Payloads include case details, severity, and facts count.
        </p>

        {showForm && (
          <div className="p-4 rounded-lg bg-surface-2 border border-border space-y-3">
            <div>
              <label className="text-caption text-muted-foreground mb-1 block">Webhook URL *</label>
              <Input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="https://your-server.com/webhook" className="bg-background" />
            </div>
            <div>
              <label className="text-caption text-muted-foreground mb-1 block">Signing Secret (optional)</label>
              <Input value={newSecret} onChange={e => setNewSecret(e.target.value)} placeholder="whsec_..." className="bg-background" type="password" />
              <p className="text-caption text-muted-foreground mt-1">Used to generate HMAC-SHA256 signature in the <code className="bg-surface-2 px-1 rounded text-xs">x-webhook-signature</code> header</p>
            </div>
            <div>
              <label className="text-caption text-muted-foreground mb-1 block">Description (optional)</label>
              <Input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="e.g. Slack alerts, PagerDuty" className="bg-background" />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => addMutation.mutate()} disabled={!newUrl || addMutation.isPending}>
                {addMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />} Save
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          </div>
        ) : webhooks.length === 0 && !showForm ? (
          <div className="text-center py-8">
            <Webhook className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-body-sm text-muted-foreground">No webhooks configured</p>
            <p className="text-caption text-muted-foreground">Add a webhook to receive notifications when cases are ingested</p>
          </div>
        ) : (
          <div className="space-y-2">
            {webhooks.map((wh: any) => (
              <div key={wh.id} className="flex items-center gap-3 p-4 rounded-lg bg-surface-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <code className="text-body-sm font-mono text-foreground truncate">{wh.url}</code>
                    <Badge variant={wh.enabled ? 'success' : 'secondary'} className="text-[10px] shrink-0">
                      {wh.enabled ? 'Active' : 'Disabled'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    {wh.description && <span className="text-caption text-muted-foreground">{wh.description}</span>}
                    {wh.signing_secret && (
                      <span className="text-caption text-muted-foreground flex items-center gap-1">
                        🔑 Signed
                      </span>
                    )}
                    <span className="text-caption text-muted-foreground">
                      Added {format(new Date(wh.created_at), 'MMM d, yyyy')}
                    </span>
                  </div>
                </div>
                <Switch checked={wh.enabled} onCheckedChange={v => toggleMutation.mutate({ id: wh.id, enabled: v })} />
                <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate(wh.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-gradient-card p-6 space-y-3">
        <h3 className="text-body-md font-semibold text-foreground">Payload Format</h3>
        <pre className="p-4 rounded-lg bg-surface-1 border border-border text-sm font-mono text-foreground overflow-x-auto whitespace-pre">{`{
  "event": "case.ingested",
  "timestamp": "2026-02-28T16:30:00Z",
  "case": {
    "id": "uuid",
    "case_number": "IC-2026-1012",
    "status": "open",
    "severity": "critical",
    "category": "Risk Assessment",
    "facts_count": 5,
    "created_at": "2026-02-28T16:30:00Z"
  }
}`}</pre>
        <p className="text-caption text-muted-foreground">
          If a signing secret is configured, the <code className="bg-surface-2 px-1 rounded text-xs">x-webhook-signature</code> header contains an HMAC-SHA256 hex digest of the raw body.
        </p>
      </div>
    </TabsContent>
  );
}
