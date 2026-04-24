'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusBadge } from '@/components/StatusBadge';
import { EmptyState } from '@/components/EmptyState';
import { TableSkeleton } from '@/components/LoadingSkeletons';
import { apiClient } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { Activity, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function CommandsPage() {
  const [tenants, setTenants] = useState([]);
  const [commands, setCommands] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState('');
  const [commandType, setCommandType] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const { toast } = useToast();

  // Fetch tenants on mount
  useEffect(() => {
    const fetchTenants = async () => {
      if (!getToken()) return;

      try {
        const response = await apiClient.get('/tenant');
        if (response.success) {
          setTenants(Array.isArray(response.data) ? response.data : []);
        }
      } catch (error) {
        console.error('Failed to fetch tenants:', error);
      }
    };

    fetchTenants();
  }, []);

  const fetchCommands = async () => {
    if (!getToken()) return;
    setIsLoading(true);
    try {
      const response = await apiClient.get('/commands');
      if (response.success) {
        setCommands(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error) {
      console.error('Failed to fetch commands:', error);
      toast({ title: 'Error', description: 'Failed to load commands', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch commands
  useEffect(() => {
    fetchCommands();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleIssueCommand = async () => {
    if (!selectedTenant || !commandType) {
      toast({
        title: 'Error',
        description: 'Please select a tenant and command type',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiClient.post('/commands', {
        tenant_id: selectedTenant,
        type: commandType,
      });

      if (response.success) {
        toast({
          title: 'Success',
          description: 'Command issued successfully',
        });
        setSelectedTenant('');
        setCommandType('');
        await fetchCommands();
      } else {
        toast({
          title: 'Error',
          description: response.message || 'Failed to issue command',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to issue command',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCommands = commands.filter((cmd) => {
    if (statusFilter === 'all') return true;
    return cmd.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Commands" breadcrumbs={['Admin', 'Commands']} />

      {/* Issue Command Card */}
      <Card>
        <CardHeader>
          <CardTitle>Issue New Command</CardTitle>
          <CardDescription>Send a command to a tenant agent</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 flex-col sm:flex-row">
            <Select value={selectedTenant} onValueChange={setSelectedTenant}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Select a tenant" />
              </SelectTrigger>
              <SelectContent>
                {tenants.map((tenant) => (
                  <SelectItem key={tenant.id} value={tenant.id}>
                    {tenant.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={commandType} onValueChange={setCommandType}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Select command type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="suspend">Suspend</SelectItem>
                <SelectItem value="resume">Resume</SelectItem>
                <SelectItem value="restart">Restart</SelectItem>
              </SelectContent>
            </Select>

            <Button
              onClick={handleIssueCommand}
              disabled={isSubmitting || !selectedTenant || !commandType}
              className="w-full sm:w-auto"
            >
              {isSubmitting ? 'Issuing...' : 'Issue Command'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Commands Table */}
      <Card>
        <CardHeader>
          <CardTitle>Command History</CardTitle>
          <CardDescription>All commands issued to agents</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={statusFilter} onValueChange={setStatusFilter} className="mb-4">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="executed">Executed</TabsTrigger>
              <TabsTrigger value="failed">Failed</TabsTrigger>
            </TabsList>
          </Tabs>

          {isLoading ? (
            <TableSkeleton rows={5} cols={5} />
          ) : filteredCommands.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="No commands found"
              description={statusFilter === 'all'
                ? 'No commands have been issued yet'
                : `No ${statusFilter} commands`}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Executed At</TableHead>
                  <TableHead>Result</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCommands.map((cmd) => (
                  <TableRow key={cmd.id}>
                    <TableCell className="font-medium capitalize">{cmd.type}</TableCell>
                    <TableCell>{cmd.tenant_email || tenants.find(t => t.id === cmd.tenant_id)?.email || '—'}</TableCell>
                    <TableCell>
                      <StatusBadge status={cmd.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(cmd.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {cmd.executed_at ? new Date(cmd.executed_at).toLocaleDateString() : '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[160px] truncate">
                      {cmd.result?.output || (cmd.result ? JSON.stringify(cmd.result) : '—')}
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
