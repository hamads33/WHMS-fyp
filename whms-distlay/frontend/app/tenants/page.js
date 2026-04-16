'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { StatusBadge } from '@/components/StatusBadge';
import { EmptyState } from '@/components/EmptyState';
import { TableSkeleton } from '@/components/LoadingSkeletons';
import { usePagination } from '@/hooks/usePagination';
import { apiClient } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function TenantsPage() {
  const [tenants, setTenants] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(null);
  const pagination = usePagination(1, 50);
  const { toast } = useToast();

  useEffect(() => {
    const fetchTenants = async () => {
      if (!getToken()) return;
      setIsLoading(true);

      try {
        const response = await apiClient.get(`/tenant?page=${pagination.page}&limit=${pagination.limit}`);

        if (response.success) {
          setTenants(Array.isArray(response.data) ? response.data : []);
          if (response.meta) {
            pagination.updateMeta(response.meta);
          }
        }
      } catch (error) {
        console.error('Failed to fetch tenants:', error);
        toast({
          title: 'Error',
          description: 'Failed to load tenants',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchTenants();
  }, [pagination.page, pagination.limit, toast]);

  const handleStatusChange = async (tenantId, newStatus) => {
    setUpdatingStatus(tenantId);

    try {
      const response = await apiClient.patch(`/tenant/${tenantId}/status`, {
        status: newStatus,
      });

      if (response.success) {
        toast({
          title: 'Success',
          description: 'Tenant status updated',
        });
        // Refetch tenants
        const res = await apiClient.get(`/tenant?page=${pagination.page}&limit=${pagination.limit}`);
        if (res.success) {
          setTenants(Array.isArray(res.data) ? res.data : []);
        }
      } else {
        toast({
          title: 'Error',
          description: response.message || 'Failed to update status',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update status',
        variant: 'destructive',
      });
    } finally {
      setUpdatingStatus(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Tenants" breadcrumbs={['Admin', 'Tenants']} />
        <Card>
          <CardContent className="pt-6">
            <TableSkeleton rows={5} cols={5} />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Tenants" breadcrumbs={['Admin', 'Tenants']} />

      <Card>
        <CardHeader>
          <CardTitle>All Tenants</CardTitle>
          <CardDescription>Manage your workspace tenants</CardDescription>
        </CardHeader>
        <CardContent>
          {tenants.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No tenants found"
              description="You don't have any tenants yet"
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenants.map((tenant) => (
                    <TableRow key={tenant.id} className="cursor-pointer hover:bg-muted">
                      <TableCell className="font-medium" onClick={() => {
                        setSelectedTenant(tenant);
                        setIsSheetOpen(true);
                      }}>
                        {tenant.email}
                      </TableCell>
                      <TableCell>{tenant.plan_name || 'N/A'}</TableCell>
                      <TableCell>
                        <Select
                          value={tenant.status}
                          onValueChange={(value) => handleStatusChange(tenant.id, value)}
                          disabled={updatingStatus === tenant.id}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="suspended">Suspended</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(tenant.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedTenant(tenant);
                            setIsSheetOpen(true);
                          }}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Page {pagination.page} of {pagination.pages} ({pagination.total} total)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => pagination.prevPage()}
                    disabled={!pagination.canPrevious}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => pagination.nextPage()}
                    disabled={!pagination.canNext}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Tenant Details Sheet */}
      {selectedTenant && (
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetContent className="w-full sm:w-96">
            <SheetHeader>
              <SheetTitle>Tenant Details</SheetTitle>
              <SheetDescription>
                {selectedTenant.email}
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-4 mt-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <p className="text-base font-semibold mt-1">{selectedTenant.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Plan</p>
                <p className="text-base font-semibold mt-1">{selectedTenant.plan_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <div className="mt-1">
                  <StatusBadge status={selectedTenant.status} />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Created At</p>
                <p className="text-base font-semibold mt-1">
                  {new Date(selectedTenant.created_at).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Last Seen</p>
                <p className="text-base font-semibold mt-1">
                  {selectedTenant.last_seen_at ? new Date(selectedTenant.last_seen_at).toLocaleDateString() : 'Never'}
                </p>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
