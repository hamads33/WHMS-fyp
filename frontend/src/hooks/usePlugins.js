import { useState, useCallback, useEffect } from "react"
import { PluginsAPI } from "@/lib/api/plugins"

/**
 * Hook for managing installed runtime plugins
 * Works with the filesystem-based plugin engine API
 */
export function usePlugins() {
  const [plugins, setPlugins] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchPlugins = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const pluginList = await PluginsAPI.listPlugins()
      // Format plugins for display
      const formatted = pluginList.map(p => PluginsAPI.formatPluginForDisplay(p))
      setPlugins(formatted)
    } catch (err) {
      setError(err.message || "Failed to fetch plugins")
      setPlugins([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchPlugins()
  }, [fetchPlugins])

  const uninstallPlugin = useCallback(
    async (pluginId) => {
      try {
        await PluginsAPI.uninstallPlugin(pluginId)
        // Remove from local state
        setPlugins(prev => prev.filter(p => p.id !== pluginId))
        return { success: true }
      } catch (err) {
        return {
          success: false,
          error: err.message || "Failed to uninstall plugin",
        }
      }
    },
    []
  )

  const enablePlugin = useCallback(
    async (pluginId) => {
      try {
        await PluginsAPI.enablePlugin(pluginId)
        // Update local state
        setPlugins(prev =>
          prev.map(p => (p.id === pluginId ? { ...p, enabled: true } : p))
        )
        return { success: true }
      } catch (err) {
        return {
          success: false,
          error: err.message || "Failed to enable plugin",
        }
      }
    },
    []
  )

  const disablePlugin = useCallback(
    async (pluginId) => {
      try {
        await PluginsAPI.disablePlugin(pluginId)
        // Update local state
        setPlugins(prev =>
          prev.map(p => (p.id === pluginId ? { ...p, enabled: false } : p))
        )
        return { success: true }
      } catch (err) {
        return {
          success: false,
          error: err.message || "Failed to disable plugin",
        }
      }
    },
    []
  )

  const uploadPlugin = useCallback(
    async (file) => {
      try {
        const result = await PluginsAPI.installFromZip(file)
        // Refresh plugin list
        await fetchPlugins()
        return { success: true, data: result }
      } catch (err) {
        return {
          success: false,
          error: err.message || "Failed to upload plugin",
        }
      }
    },
    [fetchPlugins]
  )

  return {
    plugins,
    loading,
    error,
    refreshPlugins: fetchPlugins,
    uninstallPlugin,
    enablePlugin,
    disablePlugin,
    uploadPlugin,
  }
}

/**
 * Hook for plugin details and actions
 */
export function usePluginDetail(pluginId) {
  const [plugin, setPlugin] = useState(null)
  const [actions, setActions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!pluginId) return

    const fetchDetails = async () => {
      setLoading(true)
      setError(null)
      try {
        const details = await PluginsAPI.getPluginDetails(pluginId)
        const formatted = PluginsAPI.formatPluginForDisplay(details)
        setPlugin(formatted)

        // Fetch available actions
        const pluginActions = await PluginsAPI.getActions(pluginId)
        setActions(pluginActions)
      } catch (err) {
        setError(err.message || "Failed to load plugin")
        setPlugin(null)
        setActions([])
      } finally {
        setLoading(false)
      }
    }

    fetchDetails()
  }, [pluginId])

  const executeAction = useCallback(
    async (actionName, meta = {}) => {
      if (!pluginId) return { success: false, error: "No plugin selected" }

      try {
        const result = await PluginsAPI.executeAction(
          pluginId,
          actionName,
          meta
        )
        return { success: true, data: result }
      } catch (err) {
        return {
          success: false,
          error: err.message || "Action execution failed",
        }
      }
    },
    [pluginId]
  )

  return {
    plugin,
    actions,
    loading,
    error,
    executeAction,
  }
}

/**
 * Hook for plugin statistics and health
 */
export function usePluginStats() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true)
      setError(null)
      try {
        const summary = await PluginsAPI.getPluginsSummary()
        setStats(summary)
      } catch (err) {
        setError(err.message || "Failed to fetch statistics")
        setStats(null)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  return {
    stats,
    loading,
    error,
  }
}

/**
 * Hook for plugin configuration
 */
export function usePluginConfig(pluginId) {
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchConfig = useCallback(async () => {
    if (!pluginId) return

    setLoading(true)
    setError(null)
    try {
      const pluginConfig = await PluginsAPI.getConfig(pluginId)
      setConfig(pluginConfig)
    } catch (err) {
      setError(err.message || "Failed to load config")
      setConfig(null)
    } finally {
      setLoading(false)
    }
  }, [pluginId])

  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  const saveConfig = useCallback(
    async (newConfig) => {
      if (!pluginId) return { success: false, error: "No plugin selected" }

      try {
        const saved = await PluginsAPI.saveConfig(pluginId, newConfig)
        setConfig(saved)
        return { success: true, data: saved }
      } catch (err) {
        return {
          success: false,
          error: err.message || "Failed to save config",
        }
      }
    },
    [pluginId]
  )

  const setConfigValue = useCallback(
    async (key, value) => {
      return saveConfig({ [key]: value })
    },
    [saveConfig]
  )

  return {
    config,
    loading,
    error,
    saveConfig,
    setConfigValue,
    refresh: fetchConfig,
  }
}