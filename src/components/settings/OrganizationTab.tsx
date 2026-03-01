import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Key, Copy, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface OrganizationTabProps {
  org: any;
  orgName: string;
  setOrgName: (v: string) => void;
  apiKey?: string;
}

export function OrganizationTab({ org, orgName, setOrgName, apiKey }: OrganizationTabProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const regenerateKey = async () => {
    if (!org) return;
    await supabase.rpc('generate_org_api_key' as any, { org_id: org.id });
    queryClient.invalidateQueries({ queryKey: ['organization'] });
    toast({ title: 'API key regenerated', description: 'The old key is now invalid.' });
  };

  const generateKey = async () => {
    if (!org) return;
    await supabase.rpc('generate_org_api_key' as any, { org_id: org.id });
    queryClient.invalidateQueries({ queryKey: ['organization'] });
    toast({ title: 'API key generated', description: 'You can now use this key to submit cases via the API.' });
  };

  return (
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

      <div className="rounded-xl border border-border bg-gradient-card p-6 space-y-4">
        <h3 className="text-body-md font-semibold text-foreground flex items-center gap-2">
          <Key className="w-4 h-4 text-primary" /> API Ingest Key
        </h3>
        <p className="text-caption text-muted-foreground">
          Use this key in the <code className="bg-surface-2 px-1 rounded text-xs">x-api-key</code> header to submit cases via the API.
        </p>
        {apiKey ? (
          <div className="flex items-center gap-2">
            <Input value={apiKey} className="bg-surface-2 max-w-md font-mono text-xs" readOnly />
            <Button variant="outline" size="icon" className="shrink-0" onClick={() => {
              navigator.clipboard.writeText(apiKey);
              toast({ title: 'Copied to clipboard' });
            }}>
              <Copy className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" className="shrink-0" onClick={regenerateKey}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <Button variant="outline" className="gap-2" onClick={generateKey}>
            <Key className="w-4 h-4" /> Generate API Key
          </Button>
        )}
      </div>
    </TabsContent>
  );
}
