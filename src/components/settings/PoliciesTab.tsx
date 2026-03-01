import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Shield } from 'lucide-react';

export function PoliciesTab() {
  return (
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
  );
}
