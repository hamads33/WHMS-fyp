"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Search,
  Filter,
  MoreVertical,
  Shield,
  UserX,
  LogOut,
  UserCheck,
  Edit,
  AlertCircle,
  TrendingUp,
  UserCog,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { UsersAPI } from "@/lib/api/users";

export default function UsersPage() {
  const { toast } = useToast();

  // State
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Dialog state
  const [editRolesDialog, setEditRolesDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRoles, setSelectedRoles] = useState([]);

  // Load data
  useEffect(() => {
    loadUsers();
    loadRoles();
    loadStats();
  }, [page, roleFilter, statusFilter, searchQuery]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await UsersAPI.listUsers({
        page,
        limit: 20,
        q: searchQuery,
        role: roleFilter && roleFilter !== "all" ? roleFilter : "",
        status: statusFilter && statusFilter !== "all" ? statusFilter : "",
      });
      setUsers(data.users || []);
      setTotal(data.total || 0);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const data = await UsersAPI.listRoles();
      setRoles(data.roles || []);
    } catch (error) {
      console.error("Failed to load roles:", error);
    }
  };

  const loadStats = async () => {
    try {
      const data = await UsersAPI.getUserStats();
      setStats(data);
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  };

  const handleEditRoles = (user) => {
    setSelectedUser(user);
    setSelectedRoles(user.roles || []);
    setEditRolesDialog(true);
  };

  const handleSaveRoles = async () => {
    try {
      await UsersAPI.updateUserRoles(selectedUser.id, selectedRoles);
      toast({
        title: "Success",
        description: "User roles updated successfully",
      });
      setEditRolesDialog(false);
      loadUsers();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to update roles",
        variant: "destructive",
      });
    }
  };

  const handleDeactivate = async (user) => {
    if (!confirm(`Deactivate ${user.email}?`)) return;

    try {
      await UsersAPI.deactivateUser(user.id);
      toast({
        title: "Success",
        description: "User deactivated successfully",
      });
      loadUsers();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to deactivate user",
        variant: "destructive",
      });
    }
  };

  const handleActivate = async (user) => {
    try {
      await UsersAPI.activateUser(user.id);
      toast({
        title: "Success",
        description: "User activated successfully",
      });
      loadUsers();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to activate user",
        variant: "destructive",
      });
    }
  };

  const handleForceLogout = async (user) => {
    if (!confirm(`Force logout ${user.email} from all sessions?`)) return;

    try {
      await UsersAPI.forceLogout(user.id);
      toast({
        title: "Success",
        description: "User logged out from all sessions",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to force logout",
        variant: "destructive",
      });
    }
  };

  const getRoleBadgeVariant = (role) => {
    const variants = {
      superadmin: "destructive",
      admin: "default",
      staff: "secondary",
      client: "outline",
      reseller: "secondary",
      developer: "outline",
    };
    return variants[role] || "outline";
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage user accounts, roles, and permissions
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Users
                  </p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Active Users
                  </p>
                  <p className="text-2xl font-bold">{stats.active}</p>
                </div>
                <UserCheck className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Disabled
                  </p>
                  <p className="text-2xl font-bold">{stats.disabled}</p>
                </div>
                <UserX className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Roles
                  </p>
                  <p className="text-2xl font-bold">{roles.length}</p>
                </div>
                <Shield className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={roleFilter || undefined} onValueChange={(value) => setRoleFilter(value || "")}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.name}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter || undefined} onValueChange={(value) => setStatusFilter(value || "")}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Verified</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      <span className="text-muted-foreground">Loading users...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle className="h-8 w-8 text-muted-foreground" />
                      <span className="text-muted-foreground">No users found</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {user.roles.length > 0 ? (
                          user.roles.map((role) => (
                            <Badge
                              key={role}
                              variant={getRoleBadgeVariant(role)}
                              className="text-xs"
                            >
                              {role}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            No roles
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.disabled ? (
                        <Badge variant="destructive">Disabled</Badge>
                      ) : (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          Active
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.emailVerified ? (
                        <Badge variant="outline" className="text-blue-600 border-blue-600">
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-gray-600">
                          Unverified
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleEditRoles(user)}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Roles
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleForceLogout(user)}
                          >
                            <LogOut className="mr-2 h-4 w-4" />
                            Force Logout
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {user.disabled ? (
                            <DropdownMenuItem
                              onClick={() => handleActivate(user)}
                            >
                              <UserCheck className="mr-2 h-4 w-4" />
                              Activate User
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => handleDeactivate(user)}
                              className="text-red-600"
                            >
                              <UserX className="mr-2 h-4 w-4" />
                              Deactivate User
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {!loading && total > 20 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, total)} of{" "}
            {total} users
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page * 20 >= total}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Edit Roles Dialog */}
      <Dialog open={editRolesDialog} onOpenChange={setEditRolesDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Roles</DialogTitle>
            <DialogDescription>
              Manage roles for {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {roles.map((role) => (
              <div key={role.id} className="flex items-start space-x-3">
                <Checkbox
                  id={`role-${role.id}`}
                  checked={selectedRoles.includes(role.name)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedRoles([...selectedRoles, role.name]);
                    } else {
                      setSelectedRoles(
                        selectedRoles.filter((r) => r !== role.name)
                      );
                    }
                  }}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label
                    htmlFor={`role-${role.id}`}
                    className="text-sm font-medium cursor-pointer"
                  >
                    {role.name}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {role.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditRolesDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveRoles}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}