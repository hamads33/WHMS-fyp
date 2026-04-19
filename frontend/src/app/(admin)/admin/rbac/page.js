"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import {
  Users, Search, MoreVertical, Shield, UserX, LogOut,
  UserCheck, Edit, AlertCircle, Lock, CheckCircle2, XCircle,
  RefreshCw, UserCog, Key, Package, ShoppingCart, CreditCard,
  Database, Zap, ShieldAlert, Puzzle, User, Store, Code2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { UsersAPI } from "@/lib/api/users";
import { RbacAPI } from "@/lib/api/rbac";
import { useAuth } from "@/lib/context/AuthContext";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/hooks/usePermissions";

// ── Config ─────────────────────────────────────────────────────────────────

const MATRIX_ROLES = ["superadmin", "admin", "staff", "developer"];

const ROLE_LABEL = {
  superadmin: "Superadmin",
  admin: "Admin",
  staff: "Staff",
  developer: "Developer",
  client: "Client",
  reseller: "Reseller",
};

const MODULE_ICON = {
  "Admin Portal":  Shield,
  "Users":         Users,
  "Roles":         Key,
  "Services":      Package,
  "Orders":        ShoppingCart,
  "Billing":       CreditCard,
  "Backups":       Database,
  "Automation":    Zap,
  "Security":      ShieldAlert,
  "Plugins":       Puzzle,
  "Client Portal": User,
  "Reseller":      Store,
  "Developer":     Code2,
};

// ── Page ───────────────────────────────────────────────────────────────────

export default function RbacPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { isSuperAdmin } = useAuth();
  const { canAssignRoles, canDeactivateUsers, canForceLogout, canImpersonate } = usePermissions();

  // Users tab
  const [users, setUsers]             = useState([]);
  const [allRoles, setAllRoles]       = useState([]);
  const [stats, setStats]             = useState(null);
  const [loading, setLoading]         = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter]   = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage]               = useState(1);
  const [total, setTotal]             = useState(0);
  const [editRolesDialog, setEditRolesDialog] = useState(false);
  const [selectedUser, setSelectedUser]       = useState(null);
  const [selectedRoles, setSelectedRoles]     = useState([]);

  // Matrix tab
  const [grouped, setGrouped]           = useState({});
  const [roleMap, setRoleMap]           = useState({});
  const [bootstrapped, setBootstrapped] = useState(false);
  const [matrixLoading, setMatrixLoading] = useState(true);
  const [matrixError, setMatrixError]   = useState(null);
  const [saving, setSaving]             = useState(null);

  useEffect(() => { loadUsers(); loadRolesForDropdown(); loadStats(); initMatrix(); }, []);
  useEffect(() => { loadUsers(); }, [page, roleFilter, statusFilter, searchQuery]);

  // ── Data loaders ──────────────────────────────────────────────────
  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await UsersAPI.listUsers({
        page, limit: 20,
        q: searchQuery,
        role: roleFilter && roleFilter !== "all" ? roleFilter : "",
        status: statusFilter && statusFilter !== "all" ? statusFilter : "",
      });
      setUsers(data.users || []);
      setTotal(data.total || 0);
    } catch {
      toast({ title: "Error", description: "Failed to load users", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const loadRolesForDropdown = async () => {
    try { const data = await UsersAPI.listRoles(); setAllRoles(data.roles || []); }
    catch { console.error("Failed to load roles"); }
  };

  const loadStats = async () => {
    try { const data = await UsersAPI.getUserStats(); setStats(data); }
    catch { console.error("Failed to load stats"); }
  };

  const initMatrix = async () => {
    try {
      setMatrixLoading(true); setMatrixError(null);
      await RbacAPI.bootstrap(); setBootstrapped(true);
      const permData = await RbacAPI.listPermissions();
      setGrouped(permData?.grouped || {});
      await refreshRoleMap();
    } catch (err) {
      const msg = err?.message || "Unknown error";
      setMatrixError(msg);
      toast({ title: "Error", description: `Failed to initialize permissions: ${msg}`, variant: "destructive" });
    } finally {
      setMatrixLoading(false);
    }
  };

  const refreshRoleMap = async () => {
    const data = await RbacAPI.listRoles();
    const map = {};
    for (const role of data.roles || []) {
      const keys = (role.permissions || []).map((p) => typeof p === "string" ? p : p.key);
      map[role.name] = { id: role.id, permKeys: new Set(keys), userCount: role.userCount || 0 };
    }
    setRoleMap(map);
  };

  const handleToggle = useCallback(async (roleName, permKey, currentlyGranted) => {
    if (!isSuperAdmin) return;
    const role = roleMap[roleName];
    if (!role) return;
    setRoleMap((prev) => {
      const newSet = new Set(prev[roleName].permKeys);
      currentlyGranted ? newSet.delete(permKey) : newSet.add(permKey);
      return { ...prev, [roleName]: { ...prev[roleName], permKeys: newSet } };
    });
    try {
      await RbacAPI.togglePermission(role.id, permKey, !currentlyGranted);
    } catch (err) {
      setRoleMap((prev) => {
        const revertSet = new Set(prev[roleName].permKeys);
        currentlyGranted ? revertSet.add(permKey) : revertSet.delete(permKey);
        return { ...prev, [roleName]: { ...prev[roleName], permKeys: revertSet } };
      });
      toast({ title: "Error", description: err.message || "Failed to update permission", variant: "destructive" });
    }
  }, [roleMap, isSuperAdmin]);

  const handleToggleModule = useCallback(async (roleName, modulePerms, allGranted) => {
    if (!isSuperAdmin) return;
    const role = roleMap[roleName];
    if (!role) return;
    const currentKeys = new Set(roleMap[roleName].permKeys);
    allGranted ? modulePerms.forEach((p) => currentKeys.delete(p.key)) : modulePerms.forEach((p) => currentKeys.add(p.key));
    setSaving(roleName);
    setRoleMap((prev) => ({ ...prev, [roleName]: { ...prev[roleName], permKeys: currentKeys } }));
    try { await RbacAPI.setRolePermissions(role.id, [...currentKeys]); }
    catch (err) { await refreshRoleMap(); toast({ title: "Error", description: err.message || "Failed to update module", variant: "destructive" }); }
    finally { setSaving(null); }
  }, [roleMap, isSuperAdmin]);

  const handleEditRoles = (user) => { setSelectedUser(user); setSelectedRoles(user.roles || []); setEditRolesDialog(true); };
  const handleSaveRoles = async () => {
    try {
      await UsersAPI.updateUserRoles(selectedUser.id, selectedRoles);
      toast({ title: "Success", description: "User roles updated" });
      setEditRolesDialog(false); loadUsers(); loadStats();
    } catch (error) {
      toast({ title: "Error", description: error.message || "Failed to update roles", variant: "destructive" });
    }
  };
  const toggleUserRole = (roleName, checked) => {
    if (roleName === "superadmin" && !isSuperAdmin) return;
    setSelectedRoles(checked ? [...selectedRoles, roleName] : selectedRoles.filter((r) => r !== roleName));
  };
  const handleDeactivate = async (user) => {
    if (!confirm(`Deactivate ${user.email}?`)) return;
    try { await UsersAPI.deactivateUser(user.id); toast({ title: "Success", description: "User deactivated" }); loadUsers(); }
    catch { toast({ title: "Error", description: "Failed to deactivate user", variant: "destructive" }); }
  };
  const handleActivate = async (user) => {
    try { await UsersAPI.activateUser(user.id); toast({ title: "Success", description: "User activated" }); loadUsers(); }
    catch { toast({ title: "Error", description: "Failed to activate user", variant: "destructive" }); }
  };
  const handleForceLogout = async (user) => {
    if (!confirm(`Force logout ${user.email}?`)) return;
    try { await UsersAPI.forceLogout(user.id); toast({ title: "Success", description: "User logged out from all sessions" }); }
    catch { toast({ title: "Error", description: "Failed to force logout", variant: "destructive" }); }
  };
  const handleImpersonate = (user) => router.push(`/admin/impersonation?userId=${user.id}`);

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8 space-y-6">

      {/* ── Page Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">RBAC Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Control what each role can see and do across the system</p>
        </div>
        {bootstrapped && (
          <Badge variant="secondary" className="gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-foreground/40" />
            Permissions synced
          </Badge>
        )}
      </div>

      {/* ── Stats ── */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total Users",  value: stats.total,     icon: Users },
            { label: "Active",       value: stats.active,    icon: UserCheck },
            { label: "Disabled",     value: stats.disabled,  icon: UserX },
            { label: "Total Roles",  value: allRoles.length, icon: Shield },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label}>
              <CardContent className="flex items-center gap-4 p-5">
                <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="text-2xl font-semibold leading-none mt-0.5">{value ?? "—"}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Tabs ── */}
      <Tabs defaultValue="permissions">
        <TabsList>
          <TabsTrigger value="permissions" className="gap-2">
            <Lock className="h-3.5 w-3.5" />Module Permissions
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-3.5 w-3.5" />Users
          </TabsTrigger>
        </TabsList>

        {/* ══ PERMISSION MATRIX ══ */}
        <TabsContent value="permissions" className="mt-6 space-y-4">

          {/* Read-only notice */}
          {!isSuperAdmin && (
            <div className="flex items-center gap-3 rounded-md border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span><strong className="text-foreground">Read-only view.</strong> Only superadmins can grant or revoke permissions.</span>
            </div>
          )}

          {matrixLoading ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-24 gap-3">
                <RefreshCw className="h-5 w-5 text-muted-foreground animate-spin" />
                <p className="text-sm text-muted-foreground">Loading permission matrix…</p>
              </CardContent>
            </Card>
          ) : matrixError ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
                <AlertCircle className="h-6 w-6 text-muted-foreground" />
                <p className="font-medium text-sm">Failed to load permissions</p>
                <p className="text-xs text-muted-foreground font-mono bg-muted px-3 py-1.5 rounded max-w-md break-all text-center">{matrixError}</p>
                <Button variant="outline" size="sm" onClick={initMatrix} className="mt-1 gap-2">
                  <RefreshCw className="h-3.5 w-3.5" />Retry
                </Button>
              </CardContent>
            </Card>
          ) : Object.keys(grouped).length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
                <AlertCircle className="h-6 w-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No permissions found. Backend may need restarting.</p>
                <Button variant="outline" size="sm" onClick={initMatrix} className="gap-2">
                  <RefreshCw className="h-3.5 w-3.5" />Retry
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="px-6 py-3 text-left w-80 min-w-[280px]">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Module / Permission
                        </span>
                      </th>
                      {MATRIX_ROLES.map((role) => {
                        const info = roleMap[role];
                        return (
                          <th key={role} className="px-4 py-3 text-center min-w-[130px]">
                            <div className="flex flex-col items-center gap-1">
                              <Badge variant="outline" className="font-medium capitalize">
                                {ROLE_LABEL[role] || role}
                              </Badge>
                              {info && (
                                <span className="text-[11px] text-muted-foreground">
                                  {info.userCount} {info.userCount === 1 ? "user" : "users"}
                                </span>
                              )}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>

                  <tbody>
                    {Object.entries(grouped).map(([moduleName, perms]) => {
                      const ModIcon = MODULE_ICON[moduleName] || Shield;

                      return (
                        <Fragment key={moduleName}>
                          {/* Module header row */}
                          <tr className="border-b border-t bg-muted/25">
                            <td className="px-6 py-2.5">
                              <div className="flex items-center gap-2">
                                <ModIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <span className="font-medium text-sm">{moduleName}</span>
                                <span className="text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                  {perms.length}
                                </span>
                              </div>
                            </td>
                            {MATRIX_ROLES.map((roleName) => {
                              const role = roleMap[roleName];
                              if (!role) return <td key={roleName} className="px-4 py-2.5" />;
                              const allGranted = perms.every((p) => role.permKeys.has(p.key));
                              const someGranted = perms.some((p) => role.permKeys.has(p.key));
                              return (
                                <td key={roleName} className="px-4 py-2.5 text-center">
                                  {isSuperAdmin ? (
                                    <button
                                      disabled={saving === roleName}
                                      onClick={() => handleToggleModule(roleName, perms, allGranted)}
                                      className={`text-[11px] font-medium px-2.5 py-1 rounded border transition-colors
                                        ${allGranted
                                          ? "bg-secondary text-secondary-foreground border-border hover:bg-secondary/80"
                                          : someGranted
                                            ? "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                                            : "bg-transparent text-muted-foreground border-border/50 hover:bg-muted"
                                        }
                                        disabled:opacity-40 disabled:cursor-not-allowed`}
                                    >
                                      {allGranted ? "Revoke all" : "Grant all"}
                                    </button>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">
                                      {perms.filter(p => role.permKeys.has(p.key)).length}/{perms.length}
                                    </span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>

                          {/* Permission rows */}
                          {perms.map((perm, idx) => (
                            <tr
                              key={perm.key}
                              className={`border-b transition-colors hover:bg-muted/20 ${idx % 2 !== 0 ? "bg-muted/5" : ""}`}
                            >
                              <td className="px-6 py-3 pl-14">
                                <div className="font-medium text-sm leading-snug">{perm.description}</div>
                                <div className="text-[11px] text-muted-foreground font-mono mt-0.5">{perm.key}</div>
                              </td>
                              {MATRIX_ROLES.map((roleName) => {
                                const role = roleMap[roleName];
                                const granted = role?.permKeys?.has(perm.key) ?? false;
                                return (
                                  <td key={roleName} className="px-4 py-3 text-center">
                                    {isSuperAdmin ? (
                                      <button
                                        disabled={saving === roleName}
                                        onClick={() => handleToggle(roleName, perm.key, granted)}
                                        title={granted ? `Revoke from ${roleName}` : `Grant to ${roleName}`}
                                        className={`w-5 h-5 rounded-sm border flex items-center justify-center mx-auto transition-colors
                                          disabled:opacity-40 disabled:cursor-not-allowed
                                          ${granted
                                            ? "bg-primary border-primary"
                                            : "bg-background border-input hover:border-foreground/40"
                                          }`}
                                      >
                                        {granted && <CheckCircle2 className="h-3 w-3 text-primary-foreground" />}
                                      </button>
                                    ) : granted ? (
                                      <div className="w-5 h-5 rounded-sm bg-primary flex items-center justify-center mx-auto">
                                        <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
                                      </div>
                                    ) : (
                                      <div className="w-5 h-5 rounded-sm border border-input bg-background mx-auto" />
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {isSuperAdmin && !matrixLoading && !matrixError && (
            <p className="text-xs text-muted-foreground px-1">
              Changes save instantly. Users receive updated permissions on next login or session refresh.
            </p>
          )}
        </TabsContent>

        {/* ══ USERS TAB ══ */}
        <TabsContent value="users" className="mt-6 space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={roleFilter || undefined} onValueChange={(v) => setRoleFilter(v || "")}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="All roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {allRoles.map((r) => (
                  <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter || undefined} onValueChange={(v) => setStatusFilter(v || "")}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="All status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Users table */}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">User</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(6)].map((_, j) => (
                        <TableCell key={j}>
                          <div className="h-4 bg-muted animate-pulse rounded" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-20 text-center text-sm text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : users.map((user) => {
                  const initials = user.email.split("@")[0].slice(0, 2).toUpperCase();
                  return (
                    <TableRow key={user.id}>
                      <TableCell className="pl-6 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs font-medium shrink-0">
                            {initials}
                          </div>
                          <span className="text-sm truncate max-w-[200px]">{user.email}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex gap-1 flex-wrap">
                          {user.roles.length > 0
                            ? user.roles.map((role) => (
                                <Badge key={role} variant="secondary" className="text-xs capitalize">
                                  {role}
                                </Badge>
                              ))
                            : <span className="text-xs text-muted-foreground italic">No roles</span>}
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <Badge variant={user.disabled ? "outline" : "secondary"} className="text-xs">
                          {user.disabled ? "Disabled" : "Active"}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3">
                        {user.emailVerified ? (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <CheckCircle2 className="h-3.5 w-3.5" />Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <XCircle className="h-3.5 w-3.5" />Unverified
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="py-3 text-sm text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </TableCell>
                      <TableCell className="text-right pr-6 py-3">
                        {(canAssignRoles || canForceLogout || canDeactivateUsers || canImpersonate) ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              {canAssignRoles && (
                                <DropdownMenuItem onClick={() => handleEditRoles(user)}>
                                  <Edit className="mr-2 h-4 w-4" />Edit Roles
                                </DropdownMenuItem>
                              )}
                              {canForceLogout && (
                                <DropdownMenuItem onClick={() => handleForceLogout(user)}>
                                  <LogOut className="mr-2 h-4 w-4" />Force Logout
                                </DropdownMenuItem>
                              )}
                              {canImpersonate && (
                                <DropdownMenuItem onClick={() => handleImpersonate(user)}>
                                  <UserCog className="mr-2 h-4 w-4" />Impersonate
                                </DropdownMenuItem>
                              )}
                              {canDeactivateUsers && <DropdownMenuSeparator />}
                              {canDeactivateUsers && (user.disabled ? (
                                <DropdownMenuItem onClick={() => handleActivate(user)}>
                                  <UserCheck className="mr-2 h-4 w-4" />Activate User
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() => handleDeactivate(user)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <UserX className="mr-2 h-4 w-4" />Deactivate User
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>

          {/* Pagination */}
          {!loading && total > 20 && (
            <div className="flex items-center justify-between px-1">
              <p className="text-sm text-muted-foreground">
                {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of <strong>{total}</strong> users
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page * 20 >= total}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Edit Roles Dialog ── */}
      <Dialog open={editRolesDialog} onOpenChange={setEditRolesDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User Roles</DialogTitle>
            <DialogDescription className="truncate">{selectedUser?.email}</DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5 py-2 max-h-72 overflow-y-auto pr-1">
            {allRoles.map((role) => {
              const isLocked = role.name === "superadmin" && !isSuperAdmin;
              const isSelected = selectedRoles.includes(role.name);
              return (
                <label
                  key={role.id}
                  className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors
                    ${isLocked ? "opacity-40 cursor-not-allowed" : "hover:bg-muted/50"}
                    ${isSelected ? "border-border bg-muted/30" : "border-border"}`}
                >
                  <Checkbox
                    id={`role-${role.id}`}
                    checked={isSelected}
                    disabled={isLocked}
                    onCheckedChange={(checked) => toggleUserRole(role.name, checked)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium capitalize">{role.name}</span>
                      {isLocked && <span className="text-xs text-muted-foreground">(superadmin only)</span>}
                    </div>
                    {role.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{role.description}</p>
                    )}
                  </div>
                </label>
              );
            })}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRolesDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveRoles}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
