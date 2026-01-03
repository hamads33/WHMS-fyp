/**
 * Workflow Builder Component
 * ============================================================
 * Visual interface for building and managing workflows
 * 
 * Features:
 *  - Create/edit workflows
 *  - Drag-and-drop task builder
 *  - Visual workflow canvas
 *  - Task configuration
 *  - Preview/execute workflows
 */

import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertCircle,
  Plus,
  Trash2,
  Play,
  Eye,
  Save,
  Copy,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const WorkflowBuilder = ({ workflowId, onSave, defaultWorkflow = null }) => {
  const [workflow, setWorkflow] = useState(
    defaultWorkflow || {
      name: "",
      description: "",
      trigger: "manual",
      type: "sequential",
      definition: {
        tasks: [],
      },
      enabled: true,
    }
  );

  const [selectedTask, setSelectedTask] = useState(null);
  const [errors, setErrors] = useState({});
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState(null);
  const [expandedTasks, setExpandedTasks] = useState({});

  // Add new task
  const addTask = useCallback(() => {
    const newTask = {
      id: `task_${Date.now()}`,
      type: "action",
      description: "New Task",
      actionType: "http_request",
      input: {},
      retry: {
        times: 1,
        delayMs: 1000,
        backoff: "linear",
      },
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

  // Update task
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

  // Delete task
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

  // Toggle task expansion
  const toggleTask = useCallback((taskId) => {
    setExpandedTasks((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  }, []);

  // Validate workflow
  const validateWorkflow = useCallback(() => {
    const newErrors = {};

    if (!workflow.name) {
      newErrors.name = "Workflow name is required";
    }

    if (workflow.definition.tasks.length === 0) {
      newErrors.tasks = "At least one task is required";
    }

    workflow.definition.tasks.forEach((task) => {
      if (!task.description) {
        newErrors[`task_${task.id}`] = "Task description is required";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [workflow]);

  // Save workflow
  const handleSave = useCallback(async () => {
    if (!validateWorkflow()) {
      return;
    }

    try {
      if (onSave) {
        await onSave(workflow);
      }
    } catch (error) {
      setErrors({ submit: error.message });
    }
  }, [workflow, validateWorkflow, onSave]);

  // Execute workflow
  const handleExecute = useCallback(async () => {
    if (!validateWorkflow()) {
      return;
    }

    setIsExecuting(true);
    try {
      // TODO: Call API to execute workflow
      console.log("Executing workflow:", workflow);
      setExecutionResult({
        status: "success",
        output: { message: "Workflow executed successfully" },
        duration: 1234,
      });
    } catch (error) {
      setExecutionResult({
        status: "failed",
        error: error.message,
      });
    } finally {
      setIsExecuting(false);
    }
  }, [workflow, validateWorkflow]);

  const selectedTaskData = workflow.definition.tasks.find(
    (t) => t.id === selectedTask
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name">Workflow Name</Label>
            <Input
              id="name"
              value={workflow.name}
              onChange={(e) =>
                setWorkflow((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="e.g., Send Email on New User"
            />
            {errors.name && (
              <p className="text-sm text-red-500 mt-1">{errors.name}</p>
            )}
          </div>

          <div>
            <Label htmlFor="trigger">Trigger Type</Label>
            <Select value={workflow.trigger} onValueChange={(val) =>
              setWorkflow((prev) => ({ ...prev, trigger: val }))
            }>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="webhook">Webhook</SelectItem>
                <SelectItem value="schedule">Scheduled</SelectItem>
                <SelectItem value="event">Event</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={workflow.description}
              onChange={(e) =>
                setWorkflow((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Describe what this workflow does"
              rows={2}
            />
          </div>
        </div>
      </Card>

      {/* Tasks Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Task List */}
        <div className="lg:col-span-1">
          <Card className="p-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Tasks</h3>
                <Button size="sm" onClick={addTask}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>

              {errors.tasks && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errors.tasks}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                {workflow.definition.tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`p-3 border rounded-lg cursor-pointer transition ${
                      selectedTask === task.id
                        ? "bg-blue-50 border-blue-500"
                        : "hover:bg-gray-50"
                    }`}
                    onClick={() => setSelectedTask(task.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{task.description}</p>
                        <p className="text-xs text-gray-500 capitalize">
                          {task.type}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTask(task.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Task Configuration */}
        <div className="lg:col-span-2">
          {selectedTaskData ? (
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Configure Task</h3>
              <Tabs defaultValue="basic" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="basic">Basic</TabsTrigger>
                  <TabsTrigger value="input">Input</TabsTrigger>
                  <TabsTrigger value="advanced">Advanced</TabsTrigger>
                </TabsList>

                {/* Basic Tab */}
                <TabsContent value="basic" className="space-y-4">
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={selectedTaskData.description}
                      onChange={(e) =>
                        updateTask(selectedTask, {
                          description: e.target.value,
                        })
                      }
                    />
                    {errors[`task_${selectedTask}`] && (
                      <p className="text-sm text-red-500 mt-1">
                        {errors[`task_${selectedTask}`]}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="type">Task Type</Label>
                    <Select
                      value={selectedTaskData.type}
                      onValueChange={(val) =>
                        updateTask(selectedTask, { type: val })
                      }
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

                  {selectedTaskData.type === "action" && (
                    <div>
                      <Label htmlFor="actionType">Action Type</Label>
                      <Select
                        value={selectedTaskData.actionType || ""}
                        onValueChange={(val) =>
                          updateTask(selectedTask, { actionType: val })
                        }
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

                  {selectedTaskData.type === "condition" && (
                    <div className="space-y-2">
                      <Label htmlFor="condition">Condition Expression</Label>
                      <Textarea
                        id="condition"
                        value={selectedTaskData.condition || ""}
                        onChange={(e) =>
                          updateTask(selectedTask, { condition: e.target.value })
                        }
                        placeholder="e.g., input.amount > 1000"
                        rows={2}
                      />
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
                          // Invalid JSON, ignore
                        }
                      }}
                      placeholder="{\n  key: value\n}"
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
                      onChange={(e) =>
                        updateTask(selectedTask, {
                          timeout: parseInt(e.target.value),
                        })
                      }
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
                          retry: {
                            ...selectedTaskData.retry,
                            times: parseInt(e.target.value),
                          },
                        })
                      }
                      min={0}
                      max={10}
                    />
                  </div>

                  <div>
                    <Label htmlFor="skipIf">Skip If (Condition)</Label>
                    <Input
                      id="skipIf"
                      value={selectedTaskData.skipIf || ""}
                      onChange={(e) =>
                        updateTask(selectedTask, { skipIf: e.target.value })
                      }
                      placeholder="e.g., input.skip === true"
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
          <Button onClick={handleSave} className="gap-2">
            <Save className="h-4 w-4" />
            Save Workflow
          </Button>

          <Button onClick={handleExecute} variant="outline" disabled={isExecuting}>
            <Play className="h-4 w-4 mr-2" />
            {isExecuting ? "Executing..." : "Execute"}
          </Button>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Eye className="h-4 w-4" />
                Preview
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Workflow Preview</DialogTitle>
              </DialogHeader>
              <pre className="bg-gray-50 p-4 rounded-lg overflow-auto max-h-96 text-sm font-mono">
                {JSON.stringify(workflow, null, 2)}
              </pre>
            </DialogContent>
          </Dialog>
        </div>
      </Card>

      {/* Execution Result */}
      {executionResult && (
        <Card
          className={`p-4 ${
            executionResult.status === "success"
              ? "bg-green-50 border-green-200"
              : "bg-red-50 border-red-200"
          }`}
        >
          <h4 className="font-semibold mb-2">
            {executionResult.status === "success" ? "✅ Success" : "❌ Failed"}
          </h4>
          <pre className="text-sm font-mono whitespace-pre-wrap">
            {JSON.stringify(executionResult, null, 2)}
          </pre>
        </Card>
      )}
    </div>
  );
};

export default WorkflowBuilder;