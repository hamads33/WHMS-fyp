'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AlertCircle, Plus, Trash2, Edit, Play, Loader2, CheckCircle } from 'lucide-react';
import { ConfirmDialog } from '@/components/automation/confirm-dialog';

// ===== TOAST COMPONENT =====
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';
  const icon = type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />;

  return (
    <div className={`${bgColor} text-white p-4 rounded-lg shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-4 fixed top-4 right-4 z-50`}>
      {icon}
      <span className="font-medium">{message}</span>
    </div>
  );
};

// ===== API CONFIGURATION =====
const getApiBase = () => {
  if (typeof window === 'undefined') {
    return 'http://localhost:4000/api/automation';
  }
  return (process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/automation').replace(/\/$/, '');
};

// ===== MAIN PAGE COMPONENT =====
export default function WorkflowsListPage() {
  const router = useRouter();
  const API_BASE = getApiBase();

  // ===== STATE =====
  const [workflows, setWorkflows] = useState([]);
  const [filteredWorkflows, setFilteredWorkflows] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [isDeleting, setIsDeleting] = useState(null);
  const [isExecuting, setIsExecuting] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // ===== LOAD WORKFLOWS =====
  const loadWorkflows = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('📤 Fetching workflows from:', `${API_BASE}/workflows`);

      const response = await fetch(`${API_BASE}/workflows`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData?.error || errorData?.message || errorMessage;
        } catch (e) {
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('✅ Response:', data);

      // Handle both array and wrapped responses
      let workflowsList = [];
      if (Array.isArray(data)) {
        workflowsList = data;
      } else if (data?.data && Array.isArray(data.data)) {
        workflowsList = data.data;
      } else if (data?.workflows && Array.isArray(data.workflows)) {
        workflowsList = data.workflows;
      } else {
        workflowsList = [];
      }

      console.log('✅ Workflows loaded:', workflowsList.length);
      setWorkflows(workflowsList);
      setFilteredWorkflows(workflowsList);
    } catch (err) {
      console.error('❌ Error loading workflows:', err);
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      setToast({ type: 'error', message: `Failed to load workflows: ${errorMsg}` });
      setWorkflows([]);
      setFilteredWorkflows([]);
    } finally {
      setIsLoading(false);
    }
  }, [API_BASE]);

  // ===== SEARCH FILTER =====
  const handleSearch = useCallback(
    (query) => {
      setSearchQuery(query);

      if (!query.trim()) {
        setFilteredWorkflows(workflows);
        return;
      }

      const filtered = workflows.filter(
        (workflow) =>
          workflow.name.toLowerCase().includes(query.toLowerCase()) ||
          (workflow.description || '').toLowerCase().includes(query.toLowerCase())
      );

      setFilteredWorkflows(filtered);
    },
    [workflows]
  );

  // ===== DELETE WORKFLOW =====
  const handleDelete = useCallback(
    async (workflowId, workflowName) => {
      try {
        setIsDeleting(workflowId);
        console.log('🗑️ Deleting workflow:', workflowId);

        const response = await fetch(`${API_BASE}/workflows/${workflowId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData?.message || 'Failed to delete workflow');
        }

        console.log('✅ Workflow deleted:', workflowId);

        setToast({ type: 'success', message: `"${workflowName}" deleted successfully` });

        // Remove from UI immediately
        setWorkflows((prev) => prev.filter((w) => w.id !== workflowId));
        setFilteredWorkflows((prev) => prev.filter((w) => w.id !== workflowId));
      } catch (err) {
        console.error('❌ Delete error:', err);
        setToast({
          type: 'error',
          message: err instanceof Error ? err.message : 'Failed to delete workflow',
        });
      } finally {
        setIsDeleting(null);
      }
    },
    [API_BASE]
  );

  // ===== EXECUTE WORKFLOW =====
  const handleExecute = useCallback(
    async (workflowId, workflowName) => {
      try {
        setIsExecuting(workflowId);
        console.log('▶️ Executing workflow:', workflowId);

        const response = await fetch(`${API_BASE}/workflows/${workflowId}/run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input: {} }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result?.error || result?.message || 'Failed to execute workflow');
        }

        const runId = result.data?.runId || result.runId || 'unknown';
        console.log('✅ Workflow executed:', runId);

        setToast({
          type: 'success',
          message: `"${workflowName}" started (Run ID: ${runId})`,
        });

        // Reload workflows to update run counts
        setTimeout(loadWorkflows, 1000);
      } catch (err) {
        console.error('❌ Execute error:', err);
        setToast({
          type: 'error',
          message: err instanceof Error ? err.message : 'Failed to execute workflow',
        });
      } finally {
        setIsExecuting(null);
      }
    },
    [API_BASE, loadWorkflows]
  );

  // ===== EDIT WORKFLOW =====
  const handleEdit = useCallback((workflowId) => {
    router.push(`/admin/workflows/${workflowId}`);
  }, [router]);

  // ===== CREATE NEW =====
  const handleCreateNew = useCallback(() => {
    router.push('/admin/workflows/new');
  }, [router]);

  // ===== EFFECTS =====
  useEffect(() => {
    loadWorkflows();
  }, [loadWorkflows]);

  // ===== RENDER =====
  return (
    <div className="space-y-6 p-6">
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Workflows</h1>
          <p className="text-gray-600 mt-1">Manage your automation workflows</p>
        </div>
        <Button onClick={handleCreateNew} className="gap-2">
          <Plus className="h-4 w-4" />
          New Workflow
        </Button>
      </div>

      {/* Error Alert */}
      {error && !isLoading && (
        <Alert className="bg-red-50 border-red-300">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 flex items-center justify-between">
            <span>{error}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadWorkflows}
              className="ml-4 h-auto p-0 text-red-600 hover:text-red-700 font-semibold"
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Search Bar */}
      <Card className="p-4">
        <Input
          placeholder="Search workflows by name or description..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full"
        />
      </Card>

      {/* Workflows Table */}
      <Card>
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <span className="ml-4 text-gray-600">Loading workflows...</span>
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <AlertCircle className="h-12 w-12 text-red-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Unable to Load Workflows</h3>
            <p className="text-gray-500 mb-6">{error}</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={loadWorkflows} className="gap-2">
                <AlertCircle className="h-4 w-4" />
                Try Again
              </Button>
              <Button variant="outline" onClick={handleCreateNew} className="gap-2">
                <Plus className="h-4 w-4" />
                Create New Workflow
              </Button>
            </div>
          </div>
        ) : filteredWorkflows.length === 0 ? (
          <div className="p-12 text-center">
            <div className="h-12 w-12 text-gray-300 mx-auto mb-4 flex items-center justify-center text-2xl">
              📋
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              {workflows.length === 0 ? 'No workflows yet' : 'No results found'}
            </h3>
            <p className="text-gray-500 mb-6">
              {workflows.length === 0 ? 'Create your first workflow to get started' : 'Try adjusting your search query'}
            </p>
            {workflows.length === 0 && (
              <Button onClick={handleCreateNew} className="gap-2">
                <Plus className="h-4 w-4" />
                Create First Workflow
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Runs</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWorkflows.map((workflow) => (
                  <TableRow key={workflow.id}>
                    <TableCell className="font-medium">{workflow.name}</TableCell>
                    <TableCell className="text-gray-600">
                      {workflow.description || '—'}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          workflow.enabled
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {workflow.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {new Date(workflow.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                        {workflow._count?.runs || 0}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleExecute(workflow.id, workflow.name)}
                          disabled={isExecuting === workflow.id || !workflow.enabled}
                          className="gap-1"
                          title={!workflow.enabled ? 'Workflow is disabled' : 'Execute workflow'}
                        >
                          {isExecuting === workflow.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(workflow.id)}
                          disabled={isDeleting === workflow.id}
                          className="gap-1"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteTarget(workflow)}
                          disabled={isDeleting === workflow.id}
                          className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          {isDeleting === workflow.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Footer Stats */}
      {filteredWorkflows.length > 0 && (
        <Card className="p-4 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Total Workflows</p>
              <p className="text-2xl font-bold text-gray-900">{workflows.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Enabled</p>
              <p className="text-2xl font-bold text-green-600">
                {workflows.filter((w) => w.enabled).length}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Runs</p>
              <p className="text-2xl font-bold text-blue-600">
                {workflows.reduce((sum, w) => sum + (w._count?.runs || 0), 0)}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete workflow?"
        description={`"${deleteTarget?.name || ""}" and all its run history will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete Workflow"
        onConfirm={() => {
          handleDelete(deleteTarget?.id, deleteTarget?.name)
          setDeleteTarget(null)
        }}
      />
    </div>
  );
}