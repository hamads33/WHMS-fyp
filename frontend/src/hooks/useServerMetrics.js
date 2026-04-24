import { useState, useEffect, useRef } from "react"
import { ServersAPI } from "@/lib/api/servers"

export function useServerMetricsHistory(serverId, range = "24h") {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!serverId) return
    const fetch = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const result = await ServersAPI.getMetricsHistory(serverId, range)
        setData(result)
      } catch (err) {
        setError(err)
      } finally {
        setIsLoading(false)
      }
    }
    fetch()
  }, [serverId, range])

  return { data, isLoading, error }
}

export function useServerMetrics(serverId) {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!serverId) return

    const fetchMetrics = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const result = await ServersAPI.getMetrics(serverId)
        setData(result)
      } catch (err) {
        setError(err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchMetrics()
  }, [serverId])

  return { data, isLoading, error }
}

export function useServerLogs(serverId, options = {}) {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  // Use a ref so effect doesn't re-run when options object reference changes
  const optionsRef = useRef(options)
  optionsRef.current = options

  useEffect(() => {
    if (!serverId) return

    const fetchLogs = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const result = await ServersAPI.getServerLogs(serverId, optionsRef.current)
        setData(result)
      } catch (err) {
        setError(err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchLogs()
  }, [serverId]) // stable — options accessed via ref

  return { data, isLoading, error }
}

export function useServerAccounts(serverId) {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!serverId) return

    const fetchAccounts = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const result = await ServersAPI.listAccounts(serverId)
        setData(result)
      } catch (err) {
        setError(err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAccounts()
  }, [serverId])

  return { data, isLoading, error }
}
