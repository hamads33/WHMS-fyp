"use client";

import { useState, useEffect } from "react";
import { Plus, Shield, Trash2, Edit, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ✅ FIXED: Use correct API import
import { IpRulesAPI } from "@/lib/iprules";

export function IpRulesPageClient() {
  // State
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Form states
  const [selectedRule, setSelectedRule] = useState(null);
  const [formData, setFormData] = useState({
    pattern: "",
    type: "ALLOW",
    description: "",
    active: true,
  });

  // ------------------------------------------------------------------
  // Load rules on mount
  // ------------------------------------------------------------------
  useEffect(() => {
    loadRules();
  }, []);

  // ------------------------------------------------------------------
  // Auto-clear messages
  // ------------------------------------------------------------------
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // ------------------------------------------------------------------
  // API Functions
  // ------------------------------------------------------------------
  async function loadRules() {
    try {
      setLoading(true);
      setError(null);
      // ✅ FIXED: Use IpRulesAPI
      const data = await IpRulesAPI.listRules();
      setRules(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load IP rules:", err);
      setError("Failed to load IP rules. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function createRule() {
    try {
      setLoading(true);
      setError(null);

      // Validation
      if (!formData.pattern.trim()) {
        setError("IP pattern is required");
        return;
      }

      // ✅ FIXED: Use IpRulesAPI
      await IpRulesAPI.createRule({
        pattern: formData.pattern.trim(),
        type: formData.type,
        description: formData.description.trim(),
      });

      setSuccess("IP rule created successfully");
      setIsCreateOpen(false);
      resetForm();
      await loadRules();
    } catch (err) {
      console.error("Failed to create rule:", err);
      setError(err?.message || "Failed to create IP rule");
    } finally {
      setLoading(false);
    }
  }

  async function updateRule() {
    if (!selectedRule) return;

    try {
      setLoading(true);
      setError(null);

      // ✅ FIXED: Use IpRulesAPI
      await IpRulesAPI.updateRule(selectedRule.id, {
        pattern: formData.pattern.trim(),
        type: formData.type,
        description: formData.description.trim(),
        active: formData.active,
      });

      setSuccess("IP rule updated successfully");
      setIsEditOpen(false);
      resetForm();
      await loadRules();
    } catch (err) {
      console.error("Failed to update rule:", err);
      setError(err?.message || "Failed to update IP rule");
    } finally {
      setLoading(false);
    }
  }

  async function deleteRule() {
    if (!selectedRule) return;

    try {
      setLoading(true);
      setError(null);

      // ✅ FIXED: Use IpRulesAPI
      await IpRulesAPI.deleteRule(selectedRule.id);

      setSuccess("IP rule deleted successfully");
      setIsDeleteOpen(false);
      setSelectedRule(null);
      await loadRules();
    } catch (err) {
      console.error("Failed to delete rule:", err);
      setError(err?.message || "Failed to delete IP rule");
    } finally {
      setLoading(false);
    }
  }

  async function toggleRuleStatus(rule) {
    try {
      setError(null);

      // ✅ FIXED: Use IpRulesAPI
      await IpRulesAPI.updateRule(rule.id, {
        active: !rule.active,
      });

      setSuccess(`Rule ${!rule.active ? "enabled" : "disabled"} successfully`);
      await loadRules();
    } catch (err) {
      console.error("Failed to toggle rule status:", err);
      setError(err?.message || "Failed to toggle rule status");
    }
  }

  // ------------------------------------------------------------------
  // Handlers
  // ------------------------------------------------------------------
  function handleCreateClick() {
    resetForm();
    setIsCreateOpen(true);
  }

  function handleEditClick(rule) {
    setSelectedRule(rule);
    setFormData({
      pattern: rule.pattern,
      type: rule.type,
      description: rule.description || "",
      active: rule.active ?? true,
    });
    setIsEditOpen(true);
  }

  function handleDeleteClick(rule) {
    setSelectedRule(rule);
    setIsDeleteOpen(true);
  }

  function resetForm() {
    setFormData({
      pattern: "",
      type: "ALLOW",
      description: "",
      active: true,
    });
    setSelectedRule(null);
  }

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">IP Access Rules</h1>
          <p className="text-muted-foreground mt-2">
            Manage IP-based access control for your application
          </p>
        </div>
        <Button onClick={handleCreateClick}>
          <Plus className="h-4 w-4 mr-2" />
          Add Rule
        </Button>
      </div>

      {/* Success Alert */}
      {success && (
        <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
          <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertTitle className="text-green-800 dark:text-green-200">
            Success
          </AlertTitle>
          <AlertDescription className="text-green-700 dark:text-green-300">
            {success}
          </AlertDescription>
        </Alert>
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <X className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Info Card */}
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                How IP Rules Work
              </p>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>DENY</strong> rules block access from specific IPs or ranges.
                <br />
                <strong>ALLOW</strong> rules permit access (useful for whitelisting).
                <br />
                Rules are evaluated in order: DENY takes precedence.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rules Table */}
      <Card>
        <CardHeader>
          <CardTitle>Current Rules ({rules.length})</CardTitle>
          <CardDescription>
            Active and inactive IP access rules
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && rules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading rules...
            </div>
          ) : rules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No IP rules configured. Click &quot;Add Rule&quot; to create one.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>IP Pattern</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleRuleStatus(rule)}
                          className="h-auto p-0"
                        >
                          <Badge
                            variant={rule.active ? "default" : "secondary"}
                            className="cursor-pointer"
                          >
                            {rule.active ? "Active" : "Inactive"}
                          </Badge>
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={rule.type === "ALLOW" ? "outline" : "destructive"}
                        >
                          {rule.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {rule.pattern}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {rule.description || (
                          <span className="text-muted-foreground italic">
                            No description
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditClick(rule)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(rule)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create IP Rule</DialogTitle>
            <DialogDescription>
              Add a new IP access rule to control access to your application.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="type">
                Rule Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.type}
                onValueChange={(value) =>
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALLOW">Allow (Whitelist)</SelectItem>
                  <SelectItem value="DENY">Deny (Blacklist)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="pattern">
                IP Pattern <span className="text-destructive">*</span>
              </Label>
              <Input
                id="pattern"
                placeholder="e.g., 192.168.1.0/24 or 203.0.113.5"
                value={formData.pattern}
                onChange={(e) =>
                  setFormData({ ...formData, pattern: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                Single IP, CIDR notation, or range
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Optional description..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button onClick={createRule} disabled={loading || !formData.pattern}>
              {loading ? "Creating..." : "Create Rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit IP Rule</DialogTitle>
            <DialogDescription>
              Update the IP access rule configuration.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-type">Rule Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) =>
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALLOW">Allow (Whitelist)</SelectItem>
                  <SelectItem value="DENY">Deny (Blacklist)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-pattern">IP Pattern</Label>
              <Input
                id="edit-pattern"
                value={formData.pattern}
                onChange={(e) =>
                  setFormData({ ...formData, pattern: e.target.value })
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button onClick={updateRule} disabled={loading || !formData.pattern}>
              {loading ? "Updating..." : "Update Rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete IP Rule</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this IP rule? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>

          {selectedRule && (
            <div className="rounded-lg border p-4 space-y-2 bg-muted/50">
              <p className="text-sm">
                <span className="font-medium">Type:</span>{" "}
                <Badge variant={selectedRule.type === "ALLOW" ? "outline" : "destructive"}>
                  {selectedRule.type}
                </Badge>
              </p>
              <p className="text-sm">
                <span className="font-medium">Pattern:</span>{" "}
                <code className="font-mono">{selectedRule.pattern}</code>
              </p>
              {selectedRule.description && (
                <p className="text-sm">
                  <span className="font-medium">Description:</span>{" "}
                  {selectedRule.description}
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={deleteRule}
              disabled={loading}
            >
              {loading ? "Deleting..." : "Delete Rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
