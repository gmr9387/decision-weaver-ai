import { TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, Activity, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

export function ApiLogsTab({ orgId }: { orgId?: string }) {
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
