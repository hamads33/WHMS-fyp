'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertCircle,
  Plus,
  Trash2,
  Play,
  Eye,
  Save,
  Loader2,
  CheckCircle,
  ArrowLeft,
} from 'lucide-react';

// ===== TOAST COMPONENT =====
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';
  const icon = type === 'success' ? (
    <CheckCircle className="h-5 w-5" />
  ) : (
    <AlertCircle className="h-5 w-5" />
  );

  return (
    <div
      className={`${bgColor} text-white p-4 rounded-lg shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-4 fixed top-4 right-4 z-50`}
    >
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

// ===== MAIN WORKFLOW BUILDER =====
const WorkflowBuilder = ({ onWorkflowCreated, onError }) => {
  const router = useRouter();
  const params = useParams();
  const workflowId = params?.workflowId && params.workflowId !== 'new' 
    ? parseInt(params.workflowId, 10)
    : null;

  const isNewWorkflow = !workflowId;
  const API_BASE = getApiBase();

  // ===== STATE =====
  const [workflow, setWorkflow] = useState({
    name: '',
    description: '',
    definition: { tasks: [] },
    enabled: true,
  });

  const [selectedTask, setSelectedTask] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isLoading, setIsLoading] = useState(workflowId ? true : false);
  const [message, setMessage] = useState(null);
  const [toast, setToast] = useState(null);

  // ===== LOAD EXISTING WORKFLOW =====
  useEffect(() => {
    if (workflowId && !isNewWorkflow) {
      loadWorkflow();
    } else {
      setIsLoading(false);
    }
  }, [workflowId, isNewWorkflow]);

  const loadWorkflow = async () => {
    try {
      setIsLoading(true);
      const url = `${API_BASE}/workflows/${workflowId}`;
      console.log('🔥 Fetching workflow from:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const statusText = response.statusText || 'Unknown error';
        throw new Error(`HTTP ${response.status} ${statusText}`);
      }

      const data = await response.json();
      const workflowData = data.data || data;

      setWorkflow({
        name: workflowData.name || '',
        description: workflowData.description || '',
        definition: workflowData.definition || { tasks: [] },
        enabled: workflowData.enabled ?? true,
      });

      setToast({
        type: 'success',
        message: 'Workflow loaded successfully',
      });
    } catch (err) {
      console.error('❌ Load error:', err);
      const errorMsg = err.message || 'Failed to load workflow';
      setToast({ type: 'error', message: errorMsg });
      onError?.(err);
      setTimeout(() => router.push('/admin/workflows'), 2000);
    } finally {
      setIsLoading(false);
    }
  };

  // ===== TASK OPERATIONS =====
  const addTask = useCallback(() => {
    const newTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'action',
      description: 'New Task',
      actionType: 'http_request',
      input: {},
      timeout: 30000,
      retry: { times: 1, delayMs: 1000, backoff: 'linear' },
    };

    setWorkflow((prev) => ({
      ...prev,
      definition: {
        ...prev.definition,
        tasks: [...prev.definition.tasks, newTask],
      },
    }));

    setSelectedTask(newTask.id);
  }, []);

  const updateTask = useCallback((taskId, updates) => {
    setWorkflow((prev) => ({
      ...prev,
      definition: {
        ...prev.definition,
        tasks: prev.definition.tasks.map((t) =>
          t.id === taskId ? { ...t, ...updates } : t
        ),
      },
    }));
  }, []);

  const deleteTask = useCallback((taskId) => {
    setWorkflow((prev) => ({
      ...prev,
      definition: {
        ...prev.definition,
        tasks: prev.definition.tasks.filter((t) => t.id !== taskId),
      },
    }));
    setSelectedTask(null);
  }, []);

  // ===== VALIDATION =====
  const validateWorkflow = useCallback(() => {
    const newErrors = {};

    if (!workflow.name || workflow.name.trim() === '') {
      newErrors.name = 'Workflow name is required';
    }

    if (workflow.definition.tasks.length === 0) {
      newErrors.tasks = 'At least one task is required';
    }

    workflow.definition.tasks.forEach((task) => {
      if (!task.description || task.description.trim() === '') {
        newErrors[`task_${task.id}`] = 'Task description is required';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [workflow]);

  // ===== SAVE WORKFLOW =====
  const handleSave = useCallback(async () => {
    if (!validateWorkflow()) {
      const errorMsg = 'Please fix validation errors';
      setMessage({ type: 'error', text: errorMsg });
      setToast({ type: 'error', message: errorMsg });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const payload = {
        name: workflow.name,
        description: workflow.description || '',
        definition: {
          name: workflow.name,
          tasks: workflow.definition.tasks.map((task) => ({
            id: task.id,
            type: task.type,
            description: task.description,
            actionType: task.actionType,
            input: task.input || {},
            timeout: task.timeout || 30000,
            retry: task.retry || { times: 1, delayMs: 1000, backoff: 'linear' },
            ...(task.skipIf && task.skipIf.trim() && { skipIf: task.skipIf }),
          })),
        },
        enabled: workflow.enabled,
      };

      const isUpdate = !!workflowId && !isNewWorkflow;
      const method = isUpdate ? 'PUT' : 'POST';
      const url = isUpdate ? `${API_BASE}/workflows/${workflowId}` : `${API_BASE}/workflows`;

      console.log(`🤤 ${method} ${url}`, payload);

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData?.error || errorData?.message || `HTTP ${response.status}`;
        throw new Error(errorMsg);
      }

      const result = await response.json();
      const successMessage = isUpdate ? 'Workflow updated!' : 'Workflow created!';

      setMessage({ type: 'success', text: successMessage });
      setToast({ type: 'success', message: successMessage });
      setErrors({});

      if (isNewWorkflow && onWorkflowCreated) {
        const createdId = result.data?.id;
        onWorkflowCreated(createdId);
      }

      if (isNewWorkflow) {
        setTimeout(() => router.push('/admin/workflows'), 1500);
      }
    } catch (error) {
      console.error('❌ Save error:', error);
      const errorMsg = error.message || 'Failed to save workflow';
      setMessage({ type: 'error', text: errorMsg });
      setToast({ type: 'error', message: errorMsg });
      onError?.(error);
    } finally {
      setIsSaving(false);
    }
  }, [workflow, workflowId, isNewWorkflow, validateWorkflow, API_BASE, router, onWorkflowCreated, onError]);

  // ===== EXECUTE WORKFLOW =====
  const handleExecute = useCallback(async () => {
    if (!workflowId || isNewWorkflow) {
      const errorMsg = 'Save workflow first before executing';
      setMessage({ type: 'error', text: errorMsg });
      setToast({ type: 'error', message: errorMsg });
      return;
    }

    setIsExecuting(true);
    setMessage(null);

    try {
      const url = `${API_BASE}/workflows/${workflowId}/run`;
      console.log('🚀 Executing:', url);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: {} }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      const runId = result.data?.runId;

      setMessage({ type: 'success', text: `Workflow started (Run: ${runId})` });
      setToast({ type: 'success', message: `Workflow executed! Run ID: ${runId}` });
    } catch (error) {
      console.error('❌ Execute error:', error);
      const errorMsg = error.message || 'Failed to execute workflow';
      setMessage({ type: 'error', text: errorMsg });
      setToast({ type: 'error', message: errorMsg });
    } finally {
      setIsExecuting(false);
    }
  }, [workflowId, isNewWorkflow, API_BASE]);

  // ===== GET SELECTED TASK =====
  const selectedTaskData = selectedTask
    ? workflow.definition.tasks.find((t) => t.id === selectedTask)
    : null;

  // ===== LOADING STATE =====
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Loading workflow...</p>
        </div>
      </div>
    );
  }

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

 z
      {/* Error Alert */}
      {message?.type === 'error' && (
        <Alert className="bg-red-50 border-red-300">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Success Alert */}
      {message?.type === 'success' && (
        <Alert className="bg-green-50 border-green-300">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Workflow Info */}
      <Card className="p-6 space-y-4">
        <div>
          <Label htmlFor="name">Workflow Name *</Label>
          <Input
            id="name"
            value={workflow.name}
            onChange={(e) => setWorkflow({ ...workflow, name: e.target.value })}
            placeholder="e.g., Process Orders"
            className={errors.name ? 'border-red-500' : ''}
          />
          {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={workflow.description}
            onChange={(e) => setWorkflow({ ...workflow, description: e.target.value })}
            placeholder="Describe what this workflow does"
            rows={3}
          />
        </div>

        <div className="flex items-center gap-3">
          <Label htmlFor="enabled" className="flex items-center gap-2 cursor-pointer">
            <input
              id="enabled"
              type="checkbox"
              checked={workflow.enabled}
              onChange={(e) => setWorkflow({ ...workflow, enabled: e.target.checked })}
            />
            Enabled
          </Label>
        </div>
      </Card>

      {/* Main Layout */}
      <div className="grid grid-cols-3 gap-6">
        {/* Tasks List */}
        <Card className="p-4 col-span-1">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Tasks</h3>
              <Button onClick={addTask} size="sm" variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {errors.tasks && <p className="text-red-500 text-sm">{errors.tasks}</p>}

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {workflow.definition.tasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => setSelectedTask(task.id)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedTask === task.id
                      ? 'bg-blue-100 border border-blue-300'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  <p className="font-medium text-sm">{task.description}</p>
                  <p className="text-xs text-gray-600">{task.type}</p>
                </div>
              ))}

              {workflow.definition.tasks.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No tasks yet</p>
              )}
            </div>
          </div>
        </Card>

        {/* Task Details */}
        <div className="col-span-2 space-y-4">
          {selectedTaskData ? (
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">Task: {selectedTaskData.description}</h3>
                <Button
                  onClick={() => deleteTask(selectedTask)}
                  variant="destructive"
                  size="sm"
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </div>

              <Tabs defaultValue="basic" className="w-full">
                <TabsList>
                  <TabsTrigger value="basic">Basic</TabsTrigger>
                  <TabsTrigger value="input">Input</TabsTrigger>
                  <TabsTrigger value="advanced">Advanced</TabsTrigger>
                </TabsList>

                {/* Basic Tab */}
                <TabsContent value="basic" className="space-y-4">
                  <div>
                    <Label htmlFor="description">Task Description *</Label>
                    <Input
                      id="description"
                      value={selectedTaskData.description}
                      onChange={(e) => updateTask(selectedTask, { description: e.target.value })}
                      placeholder="Describe what this task does"
                    />
                  </div>

                  <div>
                    <Label htmlFor="type">Task Type</Label>
                    <Select
                      value={selectedTaskData.type}
                      onValueChange={(val) => updateTask(selectedTask, { type: val })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="action">Action</SelectItem>
                        <SelectItem value="condition">Condition</SelectItem>
                        <SelectItem value="loop">Loop</SelectItem>
                        <SelectItem value="parallel">Parallel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedTaskData.type === 'action' && (
                    <div>
                      <Label htmlFor="actionType">Action Type</Label>
                      <Select
                        value={selectedTaskData.actionType || ''}
                        onValueChange={(val) => updateTask(selectedTask, { actionType: val })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="http_request">HTTP Request</SelectItem>
                          <SelectItem value="send_email">Send Email</SelectItem>
                          <SelectItem value="database_query">Database Query</SelectItem>
                          <SelectItem value="webhook_call">Webhook Call</SelectItem>
                          <SelectItem value="transform_data">Transform Data</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </TabsContent>

                {/* Input Tab */}
                <TabsContent value="input" className="space-y-4">
                  <div>
                    <Label>Input Variables (JSON)</Label>
                    <Textarea
                      value={JSON.stringify(selectedTaskData.input || {}, null, 2)}
                      onChange={(e) => {
                        try {
                          const input = JSON.parse(e.target.value);
                          updateTask(selectedTask, { input });
                        } catch (err) {
                          // Invalid JSON - ignore
                        }
                      }}
                      placeholder='{\n  "key": "value"\n}'
                      rows={6}
                      className="font-mono text-sm"
                    />
                  </div>
                </TabsContent>

                {/* Advanced Tab */}
                <TabsContent value="advanced" className="space-y-4">
                  <div>
                    <Label htmlFor="timeout">Timeout (ms)</Label>
                    <Input
                      id="timeout"
                      type="number"
                      value={selectedTaskData.timeout || 30000}
                      onChange={(e) => updateTask(selectedTask, { timeout: parseInt(e.target.value, 10) })}
                      min={1000}
                    />
                  </div>

                  <div>
                    <Label htmlFor="retries">Retry Times</Label>
                    <Input
                      id="retries"
                      type="number"
                      value={selectedTaskData.retry?.times || 1}
                      onChange={(e) =>
                        updateTask(selectedTask, {
                          retry: { ...selectedTaskData.retry, times: parseInt(e.target.value, 10) },
                        })
                      }
                      min={0}
                      max={10}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </Card>
          ) : (
            <Card className="p-6 text-center text-gray-500">
              Select a task or create a new one to configure it
            </Card>
          )}
        </div>
      </div>

      {/* Actions */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleSave}
            className="gap-2"
            disabled={isSaving || isExecuting}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Workflow
              </>
            )}
          </Button>

          {!isNewWorkflow && workflowId && (
            <Button
              onClick={handleExecute}
              variant="outline"
              disabled={isSaving || isExecuting}
              className="gap-2"
            >
              {isExecuting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Executing...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Execute
                </>
              )}
            </Button>
          )}

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Eye className="h-4 w-4" />
                Preview JSON
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Workflow Preview</DialogTitle>
              </DialogHeader>
              <pre className="bg-gray-50 p-4 rounded-lg overflow-auto max-h-96 text-sm font-mono">
                {JSON.stringify(
                  {
                    name: workflow.name,
                    description: workflow.description || null,
                    definition: { name: workflow.name, tasks: workflow.definition.tasks },
                    enabled: workflow.enabled,
                  },
                  null,
                  2
                )}
              </pre>
            </DialogContent>
          </Dialog>
        </div>
      </Card>
    </div>
  );
};

export default WorkflowBuilder;