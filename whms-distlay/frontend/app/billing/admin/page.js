'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { StatusBadge } from '@/components/StatusBadge';
import { EmptyState } from '@/components/EmptyState';
import { TableSkeleton } from '@/components/LoadingSkeletons';
import { apiClient } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { DollarSign, Trash2, Edit2, Plus, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function PlanManagementPage() {
  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    description: '',
    billing_cycle: 'monthly',
    trial_days: '',
    sort_order: '',
    is_active: true,
    features: [],
    metadata: [],
  });

  // Fetch plans
  useEffect(() => {
    const fetchPlans = async () => {
      if (!getToken()) return;
      setIsLoading(true);

      try {
        const response = await apiClient.get('/billing/admin/plans');

        if (response.success) {
          setPlans(Array.isArray(response.data) ? response.data : []);
        }
      } catch (error) {
        console.error('Failed to fetch plans:', error);
        toast({
          title: 'Error',
          description: 'Failed to load plans',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlans();
  }, [toast]);

  const openSheet = (plan = null) => {
    if (plan) {
      setEditingPlan(plan);
      setFormData({
        name: plan.name,
        price: plan.price,
        description: plan.description || '',
        billing_cycle: plan.billing_cycle || 'monthly',
        trial_days: plan.trial_days ?? 0,
        sort_order: plan.sort_order ?? 0,
        is_active: plan.is_active,
        features: Object.entries(plan.features || {}).map(([k, v]) => ({ key: k, value: String(v) })),
        metadata: Object.entries(plan.metadata || {}).map(([k, v]) => ({ key: k, value: String(v) })),
      });
    } else {
      setEditingPlan(null);
      setFormData({
        name: '',
        price: '',
        description: '',
        billing_cycle: 'monthly',
        trial_days: '',
        sort_order: '',
        is_active: true,
        features: [],
        metadata: [],
      });
    }
    setIsSheetOpen(true);
  };

  const handleSavePlan = async () => {
    if (!formData.name || !formData.price) {
      toast({
        title: 'Error',
        description: 'Name and price are required',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        name: formData.name,
        price: parseFloat(formData.price),
        description: formData.description,
        billing_cycle: formData.billing_cycle,
        trial_days: parseInt(formData.trial_days) || 0,
        sort_order: parseInt(formData.sort_order) || 0,
        is_active: formData.is_active,
        features: Object.fromEntries(
          formData.features.filter(f => f.key.trim()).map(f => [f.key.trim(), f.value])
        ),
        metadata: Object.fromEntries(
          formData.metadata.filter(m => m.key.trim()).map(m => [m.key.trim(), m.value])
        ),
      };

      if (editingPlan) {
        const response = await apiClient.patch(`/billing/admin/plans/${editingPlan.id}`, payload);
        if (response.success) {
          toast({
            title: 'Success',
            description: 'Plan updated successfully',
          });
        }
      } else {
        const response = await apiClient.post('/billing/admin/plans', payload);
        if (response.success) {
          toast({
            title: 'Success',
            description: 'Plan created successfully',
          });
        }
      }

      // Refetch plans
      const res = await apiClient.get('/billing/admin/plans');
      if (res.success) {
        setPlans(Array.isArray(res.data) ? res.data : []);
      }
      setIsSheetOpen(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save plan',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePlan = async () => {
    setIsSubmitting(true);

    try {
      const response = await apiClient.delete(`/billing/admin/plans/${deleteConfirm.id}`);

      if (response.success) {
        toast({
          title: 'Success',
          description: 'Plan deleted successfully',
        });
        // Refetch plans
        const res = await apiClient.get('/billing/admin/plans');
        if (res.success) {
          setPlans(Array.isArray(res.data) ? res.data : []);
        }
      } else {
        toast({
          title: 'Error',
          description: response.message || 'Failed to delete plan',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete plan',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
      setDeleteConfirm(null);
    }
  };

  const handleToggleActive = async (plan) => {
    try {
      const response = await apiClient.patch(`/billing/admin/plans/${plan.id}`, {
        is_active: !plan.is_active,
      });

      if (response.success) {
        toast({
          title: 'Success',
          description: `Plan ${!plan.is_active ? 'activated' : 'deactivated'}`,
        });
        // Refetch plans
        const res = await apiClient.get('/billing/admin/plans');
        if (res.success) {
          setPlans(Array.isArray(res.data) ? res.data : []);
        }
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update plan',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Plan Management" breadcrumbs={['Admin', 'Billing', 'Plans']} />
        <Card>
          <CardContent className="pt-6">
            <TableSkeleton rows={5} cols={6} />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Plan Management" breadcrumbs={['Admin', 'Billing', 'Plans']} />
        <Button onClick={() => openSheet()} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          New Plan
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Plans</CardTitle>
          <CardDescription>Manage billing plans and pricing</CardDescription>
        </CardHeader>
        <CardContent>
          {plans.length === 0 ? (
            <EmptyState
              icon={DollarSign}
              title="No plans found"
              description="Create your first plan"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Billing</TableHead>
                  <TableHead>Trial</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="font-medium">{plan.name}</TableCell>
                    <TableCell>${plan.price}</TableCell>
                    <TableCell className="capitalize">{plan.billing_cycle}</TableCell>
                    <TableCell>{plan.trial_days} days</TableCell>
                    <TableCell>
                      <StatusBadge status={plan.is_active ? 'active' : 'inactive'} />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openSheet(plan)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleActive(plan)}
                        >
                          {plan.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setDeleteConfirm(plan)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Plan Edit/Create Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-full sm:w-96 overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editingPlan ? 'Edit Plan' : 'Create New Plan'}
            </SheetTitle>
            <SheetDescription>
              {editingPlan ? `Editing ${editingPlan.name}` : 'Add a new billing plan'}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 mt-6">
            <div>
              <Label htmlFor="name">Plan Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Pro Plan"
              />
            </div>

            <div>
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="99.99"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Plan description"
              />
            </div>

            <div>
              <Label htmlFor="billing_cycle">Billing Cycle</Label>
              <Select value={formData.billing_cycle} onValueChange={(value) => setFormData({ ...formData, billing_cycle: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                  <SelectItem value="one_time">One-time</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="trial_days">Trial Days</Label>
              <Input
                id="trial_days"
                type="number"
                value={formData.trial_days}
                onChange={(e) => setFormData({ ...formData, trial_days: e.target.value })}
                placeholder="0"
              />
            </div>

            <div>
              <Label htmlFor="sort_order">Sort Order</Label>
              <Input
                id="sort_order"
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: e.target.value })}
                placeholder="0"
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label>Active</Label>
            </div>

            {/* Features */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Features</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setFormData({ ...formData, features: [...formData.features, { key: '', value: '' }] })}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              </div>
              <div className="space-y-2">
                {formData.features.map((feature, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={feature.key}
                      onChange={(e) => {
                        const next = [...formData.features];
                        next[i] = { ...next[i], key: e.target.value };
                        setFormData({ ...formData, features: next });
                      }}
                      placeholder="key (e.g. storage_gb)"
                      className="w-1/2"
                    />
                    <Input
                      value={feature.value}
                      onChange={(e) => {
                        const next = [...formData.features];
                        next[i] = { ...next[i], value: e.target.value };
                        setFormData({ ...formData, features: next });
                      }}
                      placeholder="value (e.g. 100)"
                      className="w-1/2"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setFormData({ ...formData, features: formData.features.filter((_, idx) => idx !== i) })}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Metadata */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Metadata</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setFormData({ ...formData, metadata: [...formData.metadata, { key: '', value: '' }] })}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              </div>
              <div className="space-y-2">
                {formData.metadata.map((item, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={item.key}
                      onChange={(e) => {
                        const next = [...formData.metadata];
                        next[i] = { ...next[i], key: e.target.value };
                        setFormData({ ...formData, metadata: next });
                      }}
                      placeholder="key"
                      className="w-1/2"
                    />
                    <Input
                      value={item.value}
                      onChange={(e) => {
                        const next = [...formData.metadata];
                        next[i] = { ...next[i], value: e.target.value };
                        setFormData({ ...formData, metadata: next });
                      }}
                      placeholder="value"
                      className="w-1/2"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setFormData({ ...formData, metadata: formData.metadata.filter((_, idx) => idx !== i) })}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <Button
              onClick={handleSavePlan}
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? 'Saving...' : editingPlan ? 'Update Plan' : 'Create Plan'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Plan?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete the "{deleteConfirm.name}" plan? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-800">
              Note: Existing subscriptions will not be affected.
            </div>
            <div className="flex gap-3 justify-end">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeletePlan}
                disabled={isSubmitting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isSubmitting ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
