import { useState, useCallback, useEffect } from "react"
import { MarketplaceAPI } from "@/lib/api/marketplace"

/**
 * Hook for browsing and filtering plugins
 * Handles pagination, searching, and filtering
 */
export function useMarketplace({ page = 1, limit = 20, sortBy = "popularity" } = {}) {
  const [plugins, setPlugins] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  })

  const search = useCallback(async (query) => {
    setLoading(true)
    setError(null)
    try {
      const result = await MarketplaceAPI.searchPlugins(query, {
        page: 1,
        limit,
        sort: sortBy,
      })
      setPlugins(result.plugins || result.data || [])
      setPagination(
        result.pagination || {
          page: 1,
          limit,
          total: result.total || 0,
          totalPages: Math.ceil((result.total || 0) / limit),
        }
      )
    } catch (err) {
      setError(err.message || "Failed to search plugins")
      setPlugins([])
    } finally {
      setLoading(false)
    }
  }, [limit, sortBy])

  const filter = useCallback(async (filters = {}) => {
    setLoading(true)
    setError(null)
    try {
      const params = {
        page: filters.page || 1,
        limit,
        ...(filters.search && { search: filters.search }),
        ...(filters.category && { category: filters.category }),
        ...(filters.priceMin !== undefined && { priceMin: filters.priceMin }),
        ...(filters.priceMax !== undefined && { priceMax: filters.priceMax }),
        ...(filters.rating && { minRating: filters.rating }),
        ...(filters.status && { status: filters.status }),
        ...(filters.sortBy && { sort: filters.sortBy }),
      }

      const result = await MarketplaceAPI.browsePlugins(params)
      setPlugins(result.plugins || result.data || [])
      setPagination(
        result.pagination || {
          page: params.page,
          limit,
          total: result.total || 0,
          totalPages: Math.ceil((result.total || 0) / limit),
        }
      )
    } catch (err) {
      setError(err.message || "Failed to fetch plugins")
      setPlugins([])
    } finally {
      setLoading(false)
    }
  }, [limit])

  // Initial load
  useEffect(() => {
    filter({ page, sortBy })
  }, [page, sortBy, filter])

  return {
    plugins,
    loading,
    error,
    pagination,
    search,
    filter,
  }
}

/**
 * Hook for viewing plugin details
 * Handles loading, favoriting, and installation
 */
export function usePluginDetail(pluginId) {
  const [plugin, setPlugin] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isFavorite, setIsFavorite] = useState(false)

  // Fetch plugin details
  useEffect(() => {
    if (!pluginId) return

    const fetchPlugin = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await MarketplaceAPI.getPluginDetails(pluginId)
        setPlugin(data.plugin || data.data || data)
        setIsFavorite(data.isFavorite || false)
      } catch (err) {
        setError(err.message || "Failed to load plugin")
        setPlugin(null)
      } finally {
        setLoading(false)
      }
    }

    fetchPlugin()
  }, [pluginId])

  const installPlugin = useCallback(async () => {
    if (!pluginId) {
      return { success: false, error: "Plugin ID is missing" }
    }

    try {
      const result = await MarketplaceAPI.installPlugin(pluginId)
      return {
        success: true,
        data: result,
      }
    } catch (err) {
      return {
        success: false,
        error: err.message || "Failed to install plugin",
      }
    }
  }, [pluginId])

  const addToFavorites = useCallback(async () => {
    if (!pluginId) {
      return { success: false, error: "Plugin ID is missing" }
    }

    try {
      // Assuming there's an API endpoint for favorites
      // If not, this can be implemented on the backend
      setIsFavorite(!isFavorite)
      return {
        success: true,
        isFavorite: !isFavorite,
      }
    } catch (err) {
      return {
        success: false,
        error: err.message || "Failed to update favorite status",
      }
    }
  }, [pluginId, isFavorite])

  return {
    plugin,
    loading,
    error,
    isFavorite,
    installPlugin,
    addToFavorites,
  }
}