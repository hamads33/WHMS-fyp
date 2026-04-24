import { useState, useEffect, useCallback } from "react"
import { ServersAPI } from "@/lib/api/servers"
import { toast } from "sonner"

export function useServerGroups() {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const refetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await ServersAPI.listGroups()
      setData(result)
    } catch (err) {
      setError(err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { data, isLoading, error, refetch }
}

export function useCreateServerGroup() {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState(null)

  const mutate = useCallback(async (data, onSuccess, onError) => {
    setIsPending(true)
    setError(null)
    try {
      const result = await ServersAPI.createGroup(data)
      toast.success("Server group created successfully")
      onSuccess?.(result)
      return result
    } catch (err) {
      setError(err)
      toast.error(err.message || "Failed to create group")
      onError?.(err)
      throw err
    } finally {
      setIsPending(false)
    }
  }, [])

  return { mutate, isPending, error }
}

export function useUpdateServerGroup() {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState(null)

  const mutate = useCallback(async ({ id, data }, onSuccess, onError) => {
    setIsPending(true)
    setError(null)
    try {
      const result = await ServersAPI.updateGroup(id, data)
      toast.success("Server group updated successfully")
      onSuccess?.(result)
      return result
    } catch (err) {
      setError(err)
      toast.error(err.message || "Failed to update group")
      onError?.(err)
      throw err
    } finally {
      setIsPending(false)
    }
  }, [])

  return { mutate, isPending, error }
}

export function useDeleteServerGroup() {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState(null)

  const mutate = useCallback(async (id, onSuccess, onError) => {
    setIsPending(true)
    setError(null)
    try {
      await ServersAPI.deleteGroup(id)
      toast.success("Server group deleted successfully")
      onSuccess?.()
    } catch (err) {
      setError(err)
      toast.error(err.message || "Failed to delete group")
      onError?.(err)
      throw err
    } finally {
      setIsPending(false)
    }
  }, [])

  return { mutate, isPending, error }
}
