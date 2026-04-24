'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/StatusBadge';
import { EmptyState } from '@/components/EmptyState';
import { CardSkeleton, TableSkeleton } from '@/components/LoadingSkeletons';
import { apiClient } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { Activity } from 'lucide-react';

export default function DashboardPage() {
  const [subscription, setSubscription] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [commands, setCommands] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!getToken()) return;

      try {
        const [subRes, tenantRes] = await Promise.all([
          apiClient.get('/billing/subscription'),
          apiClient.get('/tenant/me'),
        ]);

        if (subRes.success) setSubscription(subRes.data);
        if (tenantRes.success) {
          setTenant(tenantRes.data);
          const cmdRes = await apiClient.get(`/commands/tenant/${tenantRes.data.id}?limit=5`);
          if (cmdRes.success) setCommands(Array.isArray(cmdRes.data) ? cmdRes.data : []);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" />
        <CardSkeleton count={3} />
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-4">Recent Commands</h2>
          <TableSkeleton rows={5} cols={4} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">My Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {subscription?.plan_name || 'N/A'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {subscription?.price ? `$${subscription.price}/${subscription.billing_cycle}` : 'No active plan'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Agent Status</CardTitle>
          </CardHeader>
          <CardContent>
            {tenant?.agent_status ? (
              <StatusBadge status={tenant.agent_status} />
            ) : (
              <p className="text-sm text-muted-foreground">Not installed</p>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              {tenant?.agent_hostname ? `Host: ${tenant.agent_hostname} · ` : ''}
              Last seen: {tenant?.agent_last_seen ? new Date(tenant.agent_last_seen).toLocaleString() : 'Never'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Renewal Date</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {subscription?.renewal_date
                ? new Date(subscription.renewal_date).toLocaleDateString()
                : '—'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Next billing cycle</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Commands */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Commands
          </CardTitle>
          <CardDescription>Last 5 commands executed</CardDescription>
        </CardHeader>
        <CardContent>
          {commands.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="No commands yet"
              description="Commands will appear here as they are executed."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Executed At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commands.map((command) => (
                  <TableRow key={command.id}>
                    <TableCell className="font-medium capitalize">{command.type}</TableCell>
                    <TableCell>
                      <StatusBadge status={command.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(command.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {command.executed_at ? new Date(command.executed_at).toLocaleDateString() : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
