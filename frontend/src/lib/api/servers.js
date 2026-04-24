import { apiFetch } from "./client"

const BASE = "/admin/server-management"

export const ServersAPI = {
  // ── Servers ──────────────────────────────────────────────────
  listServers(params = {}) {
    const q = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v))
    ).toString()
    return apiFetch(`${BASE}/servers${q ? `?${q}` : ""}`)
  },

  getServer(id) {
    return apiFetch(`${BASE}/servers/${id}`)
  },

  createServer(data) {
    return apiFetch(`${BASE}/servers`, {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  updateServer(id, data) {
    return apiFetch(`${BASE}/servers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    })
  },

  deleteServer(id) {
    return apiFetch(`${BASE}/servers/${id}`, { method: "DELETE" })
  },

  testConnection(id) {
    return apiFetch(`${BASE}/servers/${id}/test`, { method: "POST" })
  },

  getMetrics(id) {
    return apiFetch(`${BASE}/servers/${id}/metrics`)
  },

  setMaintenance(id, enabled) {
    return apiFetch(`${BASE}/servers/${id}/maintenance`, {
      method: "PATCH",
      body: JSON.stringify({ enabled }),
    })
  },

  // ── Provisioning Accounts ────────────────────────────────────
  listAccounts(serverId) {
    return apiFetch(`${BASE}/servers/${serverId}/accounts`)
  },

  createAccount(serverId, data) {
    return apiFetch(`${BASE}/servers/${serverId}/accounts`, {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  suspendAccount(accountId) {
    return apiFetch(`${BASE}/servers/accounts/${accountId}/suspend`, {
      method: "PATCH",
    })
  },

  terminateAccount(accountId) {
    return apiFetch(`${BASE}/servers/accounts/${accountId}/terminate`, {
      method: "PATCH",
    })
  },

  // ── Logs ─────────────────────────────────────────────────────
  getServerLogs(serverId, params = {}) {
    const q = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v))
    ).toString()
    return apiFetch(`${BASE}/servers/${serverId}/logs${q ? `?${q}` : ""}`)
  },

  getAllLogs(params = {}) {
    const q = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v))
    ).toString()
    return apiFetch(`${BASE}/server-logs${q ? `?${q}` : ""}`)
  },

  // ── Dashboard (servers with metrics) ─────────────────────────
  getDashboard() {
    return apiFetch(`${BASE}/servers/dashboard`)
  },

  // ── All accounts (global) ─────────────────────────────────────
  getAllAccounts(params = {}) {
    const q = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v))
    ).toString()
    return apiFetch(`${BASE}/servers/accounts${q ? `?${q}` : ""}`)
  },

  // ── Provisioning jobs ─────────────────────────────────────────
  listProvisioningJobs(params = {}) {
    const q = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v))
    ).toString()
    return apiFetch(`${BASE}/provisioning-jobs${q ? `?${q}` : ""}`)
  },

  retryProvisioningJob(id) {
    return apiFetch(`${BASE}/provisioning-jobs/${id}/retry`, { method: "POST" })
  },

  // ── Groups ───────────────────────────────────────────────────
  listGroups() {
    return apiFetch(`${BASE}/server-groups`)
  },

  createGroup(data) {
    return apiFetch(`${BASE}/server-groups`, {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  updateGroup(id, data) {
    return apiFetch(`${BASE}/server-groups/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    })
  },

  deleteGroup(id) {
    return apiFetch(`${BASE}/server-groups/${id}`, { method: "DELETE" })
  },

  assignServer(groupId, serverId) {
    return apiFetch(`${BASE}/server-groups/${groupId}/assign`, {
      method: "POST",
      body: JSON.stringify({ serverId }),
    })
  },

  setDefaultServer(groupId, serverId) {
    return apiFetch(`${BASE}/server-groups/${groupId}/default`, {
      method: "POST",
      body: JSON.stringify({ serverId }),
    })
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// React Query Hooks
// ─────────────────────────────────────────────────────────────────────────────

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/hooks/useToast"

const KEYS = {
  all:     ["servers"],
  list:    () => ["servers", "list"],
  detail:  (id) => ["servers", "detail", id],
  metrics: (id) => ["servers", "metrics", id],
  accounts:(id) => ["servers", "accounts", id],
  logs:    (id) => ["servers", "logs", id],
  allLogs: ()   => ["servers", "all-logs"],
  groups:  ()   => ["servers", "groups"],
}

// ──── Queries ────────────────────────────────────────────────────────────────

export function useServers(params = {}, options = {}) {
  return useQuery({
    queryKey: KEYS.list(),
    queryFn: async () => {
      const data = await ServersAPI.listServers(params)
      return Array.isArray(data) ? data : (data?.data ?? [])
    },
    staleTime: 30000,
    ...options,
  })
}

export function useServer(id, options = {}) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: async () => {
      const data = await ServersAPI.getServer(id)
      return data?.data ?? data
    },
    enabled: !!id,
    staleTime: 20000,
    ...options,
  })
}

export function useServerMetrics(serverId, options = {}) {
  return useQuery({
    queryKey: KEYS.metrics(serverId),
    queryFn: async () => {
      const data = await ServersAPI.getMetrics(serverId)
      return data?.data ?? data
    },
    enabled: !!serverId,
    refetchInterval: 5000,
    staleTime: 0,
    ...options,
  })
}

export function useServerAccounts(serverId, options = {}) {
  return useQuery({
    queryKey: KEYS.accounts(serverId),
    queryFn: async () => {
      const data = await ServersAPI.listAccounts(serverId)
      return Array.isArray(data) ? data : (data?.data ?? [])
    },
    enabled: !!serverId,
    staleTime: 30000,
    ...options,
  })
}

export function useServerLogs(serverId, params = {}, options = {}) {
  return useQuery({
    queryKey: KEYS.logs(serverId),
    queryFn: async () => {
      const data = await ServersAPI.getServerLogs(serverId, params)
      return Array.isArray(data) ? data : (data?.data ?? [])
    },
    enabled: !!serverId,
    staleTime: 20000,
    ...options,
  })
}

export function useAllServerLogs(params = {}, options = {}) {
  return useQuery({
    queryKey: KEYS.allLogs(),
    queryFn: async () => {
      const data = await ServersAPI.getAllLogs(params)
      return Array.isArray(data) ? data : (data?.data ?? [])
    },
    staleTime: 20000,
    ...options,
  })
}

export function useServerGroups(options = {}) {
  return useQuery({
    queryKey: KEYS.groups(),
    queryFn: async () => {
      const data = await ServersAPI.listGroups()
      return Array.isArray(data) ? data : (data?.data ?? [])
    },
    staleTime: 60000,
    ...options,
  })
}

// ──── Mutations ──────────────────────────────────────────────────────────────

export function useCreateServer(options = {}) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: (data) => ServersAPI.createServer(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.list() })
      toast({ description: "Server created successfully" })
    },
    onError: (e) => toast({ variant: "destructive", description: e.message || "Failed to create server" }),
    ...options,
  })
}

export function useUpdateServer(id, options = {}) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: (data) => ServersAPI.updateServer(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.detail(id) })
      queryClient.invalidateQueries({ queryKey: KEYS.list() })
      toast({ description: "Server updated" })
    },
    onError: (e) => toast({ variant: "destructive", description: e.message || "Failed to update server" }),
    ...options,
  })
}

export function useDeleteServer(options = {}) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: (id) => ServersAPI.deleteServer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.list() })
      toast({ description: "Server deleted" })
    },
    onError: (e) => toast({ variant: "destructive", description: e.message || "Failed to delete server" }),
    ...options,
  })
}

export function useTestServerConnection(options = {}) {
  const { toast } = useToast()
  return useMutation({
    mutationFn: (id) => ServersAPI.testConnection(id),
    onSuccess: (data) => {
      const msg = data?.message ?? "Connection test passed"
      const latency = data?.latency ? ` (${data.latency}ms)` : ""
      toast({ description: `${msg}${latency}` })
    },
    onError: (e) => toast({ variant: "destructive", description: e.message || "Connection test failed" }),
    ...options,
  })
}

export function useToggleServerMaintenance(id, options = {}) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: (enabled) => ServersAPI.setMaintenance(id, enabled),
    onSuccess: (_, enabled) => {
      queryClient.invalidateQueries({ queryKey: KEYS.detail(id) })
      queryClient.invalidateQueries({ queryKey: KEYS.list() })
      toast({ description: enabled ? "Maintenance mode enabled" : "Maintenance mode disabled" })
    },
    onError: (e) => toast({ variant: "destructive", description: e.message || "Failed to update maintenance" }),
    ...options,
  })
}

export function useCreateAccount(serverId, options = {}) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: (data) => ServersAPI.createAccount(serverId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.accounts(serverId) })
      queryClient.invalidateQueries({ queryKey: KEYS.list() })
      toast({ description: "Account creation queued" })
    },
    onError: (e) => toast({ variant: "destructive", description: e.message || "Failed to create account" }),
    ...options,
  })
}

export function useSuspendAccount(serverId, options = {}) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: (accountId) => ServersAPI.suspendAccount(accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.accounts(serverId) })
      toast({ description: "Account suspension queued" })
    },
    onError: (e) => toast({ variant: "destructive", description: e.message || "Failed to suspend account" }),
    ...options,
  })
}

export function useTerminateAccount(serverId, options = {}) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: (accountId) => ServersAPI.terminateAccount(accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.accounts(serverId) })
      toast({ description: "Account termination queued" })
    },
    onError: (e) => toast({ variant: "destructive", description: e.message || "Failed to terminate account" }),
    ...options,
  })
}

export function useCreateGroup(options = {}) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: (data) => ServersAPI.createGroup(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.groups() })
      toast({ description: "Group created" })
    },
    onError: (e) => toast({ variant: "destructive", description: e.message || "Failed to create group" }),
    ...options,
  })
}

export function useUpdateGroup(id, options = {}) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: (data) => ServersAPI.updateGroup(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.groups() })
      toast({ description: "Group updated" })
    },
    onError: (e) => toast({ variant: "destructive", description: e.message || "Failed to update group" }),
    ...options,
  })
}

export function useDeleteGroup(options = {}) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: (id) => ServersAPI.deleteGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.groups() })
      toast({ description: "Group deleted" })
    },
    onError: (e) => toast({ variant: "destructive", description: e.message || "Failed to delete group" }),
    ...options,
  })
}

export function useAssignServerToGroup(options = {}) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: ({ groupId, serverId }) => ServersAPI.assignServer(groupId, serverId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.list() })
      queryClient.invalidateQueries({ queryKey: KEYS.groups() })
      toast({ description: "Server assigned to group" })
    },
    onError: (e) => toast({ variant: "destructive", description: e.message || "Failed to assign server" }),
    ...options,
  })
}

export function useSetDefaultServer(options = {}) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: ({ groupId, serverId }) => ServersAPI.setDefaultServer(groupId, serverId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.list() })
      toast({ description: "Default server updated" })
    },
    onError: (e) => toast({ variant: "destructive", description: e.message || "Failed to set default" }),
    ...options,
  })
}

// ──── Composite helpers ──────────────────────────────────────────────────────

export function useServerActions(serverId) {
  const queryClient = useQueryClient()
  const { mutate: testConnection, isPending: testPending } = useTestServerConnection()
  const { mutate: toggleMaintenance, isPending: maintPending } = useToggleServerMaintenance(serverId)

  return {
    testConnection: () => testConnection(serverId),
    toggleMaintenance: (enabled) => toggleMaintenance(enabled),
    refreshMetrics: () => queryClient.invalidateQueries({ queryKey: KEYS.metrics(serverId) }),
    testPending,
    maintPending,
  }
}

export function useServerAccountsActions(serverId) {
  const { mutate: suspend, isPending: suspendPending } = useSuspendAccount(serverId)
  const { mutate: terminate, isPending: terminatePending } = useTerminateAccount(serverId)
  return { suspend, terminate, suspendPending, terminatePending }
}

export function useServerDashboard(options = {}) {
  return useQuery({
    queryKey: ["servers", "dashboard"],
    queryFn: async () => {
      const res = await ServersAPI.getDashboard()
      return res
    },
    staleTime: 5000,
    refetchInterval: 15000,
    ...options,
  })
}

export function useAllAccounts(params = {}, options = {}) {
  return useQuery({
    queryKey: ["servers", "all-accounts", params],
    queryFn: async () => {
      const data = await ServersAPI.getAllAccounts(params)
      return Array.isArray(data) ? data : (data?.data ?? [])
    },
    staleTime: 30000,
    ...options,
  })
}

export function useProvisioningJobs(params = {}, options = {}) {
  return useQuery({
    queryKey: ["servers", "provisioning-jobs", params],
    queryFn: async () => {
      const data = await ServersAPI.listProvisioningJobs(params)
      return Array.isArray(data) ? data : (data?.data ?? [])
    },
    staleTime: 10000,
    refetchInterval: 15000,
    ...options,
  })
}

export function useRetryProvisioningJob(options = {}) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: (id) => ServersAPI.retryProvisioningJob(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["servers", "provisioning-jobs"] })
      toast({ description: "Job queued for retry" })
    },
    onError: (e) => toast({ variant: "destructive", description: e.message || "Failed to retry job" }),
    ...options,
  })
}
