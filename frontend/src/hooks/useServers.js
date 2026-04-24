import { useState, useEffect, useCallback, useRef } from "react"
import { ServersAPI } from "@/lib/api/servers"
import { toast } from "sonner"

// Custom hook for fetching list of servers
export function useServers(filters = {}) {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  // Use a ref so the callback is stable even when filters object reference changes
  const filtersRef = useRef(filters)
  filtersRef.current = filters

  const refetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await ServersAPI.listServers(filtersRef.current)
      setData(result)
    } catch (err) {
      setError(err)
    } finally {
      setIsLoading(false)
    }
  }, []) // stable — no object in deps

  useEffect(() => {
    refetch()
  }, [refetch])

  return { data, isLoading, error, refetch }
}

// Custom hook for fetching single server
export function useServer(id) {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const refetch = useCallback(async () => {
    if (!id) return
    setIsLoading(true)
    setError(null)
    try {
      const result = await ServersAPI.getServer(id)
      setData(result)
    } catch (err) {
      setError(err)
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { data, isLoading, error, refetch }
}

// Custom hook for creating server
export function useCreateServer() {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState(null)

  const mutate = useCallback(async (data, onSuccess, onError) => {
    setIsPending(true)
    setError(null)
    try {
      const result = await ServersAPI.createServer(data)
      toast.success("Server created successfully")
      onSuccess?.(result)
      return result
    } catch (err) {
      setError(err)
      toast.error(err.message || "Failed to create server")
      onError?.(err)
      throw err
    } finally {
      setIsPending(false)
    }
  }, [])

  return { mutate, isPending, error }
}

// Custom hook for updating server
export function useUpdateServer() {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState(null)

  const mutate = useCallback(async ({ id, data }, onSuccess, onError) => {
    setIsPending(true)
    setError(null)
    try {
      const result = await ServersAPI.updateServer(id, data)
      toast.success("Server updated successfully")
      onSuccess?.(result)
      return result
    } catch (err) {
      setError(err)
      toast.error(err.message || "Failed to update server")
      onError?.(err)
      throw err
    } finally {
      setIsPending(false)
    }
  }, [])

  return { mutate, isPending, error }
}

// Custom hook for deleting server
export function useDeleteServer() {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState(null)

  const mutate = useCallback(async (id, onSuccess, onError) => {
    setIsPending(true)
    setError(null)
    try {
      await ServersAPI.deleteServer(id)
      toast.success("Server deleted successfully")
      onSuccess?.()
    } catch (err) {
      setError(err)
      toast.error(err.message || "Failed to delete server")
      onError?.(err)
      throw err
    } finally {
      setIsPending(false)
    }
  }, [])

  return { mutate, isPending, error }
}

// Custom hook for testing connection
export function useTestConnection() {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState(null)

  const mutate = useCallback(async (serverId) => {
    setIsPending(true)
    setError(null)
    try {
      const result = await ServersAPI.testConnection(serverId)
      toast.success(`Connection: ${result.status} (${result.latency}ms)`)
      return result
    } catch (err) {
      setError(err)
      toast.error(err.message || "Connection test failed")
      throw err
    } finally {
      setIsPending(false)
    }
  }, [])

  return { mutate, isPending, error }
}

// Custom hook for setting maintenance mode
export function useSetMaintenance() {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState(null)

  const mutate = useCallback(async ({ id, enabled }, onSuccess, onError) => {
    setIsPending(true)
    setError(null)
    try {
      const result = await ServersAPI.setMaintenance(id, enabled)
      toast.success("Server status updated")
      onSuccess?.(result)
      return result
    } catch (err) {
      setError(err)
      toast.error(err.message || "Failed to update status")
      onError?.(err)
      throw err
    } finally {
      setIsPending(false)
    }
  }, [])

  return { mutate, isPending, error }
}
