import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Loader2, ScrollText } from 'lucide-react';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function WebhookDeliveryLogs({ orgId }: { orgId?: string }) {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['webhook-delivery-logs', orgId],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('webhook_delivery_logs' as any)
        .select('*, webhooks:webhook_id(url)')
        .order('created_at', { ascending: false })
        .limit(50) as any);
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
    refetchInterval: 15000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 text-primary animate-spin" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-8">
        <ScrollText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-body-sm text-muted-foreground">No delivery attempts yet</p>
        <p className="text-caption text-muted-foreground">Logs will appear here when webhooks fire</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Time</TableHead>
            <TableHead>Webhook</TableHead>
            <TableHead>Event</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Attempt</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log: any) => (
            <TableRow key={log.id}>
              <TableCell className="text-caption text-muted-foreground whitespace-nowrap">
                {format(new Date(log.created_at), 'MMM d, HH:mm:ss')}
              </TableCell>
              <TableCell className="font-mono text-caption truncate max-w-[200px]">
                {log.webhooks?.url || '—'}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-[10px]">{log.event}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant={log.status === 'success' ? 'success' : 'destructive'} className="text-[10px]">
                  {log.status}
                </Badge>
              </TableCell>
              <TableCell className="text-caption text-muted-foreground">
                {log.status_code ?? '—'}
              </TableCell>
              <TableCell className="text-caption text-muted-foreground">
                {log.duration_ms != null ? `${log.duration_ms}ms` : '—'}
              </TableCell>
              <TableCell className="text-caption text-muted-foreground">
                {log.attempt}/{log.max_attempts}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
