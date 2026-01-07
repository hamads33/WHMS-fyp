"use client"

import { useEffect, useState, useCallback } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Plus,
  Search,
  AlertCircle,
  CheckCircle2,
  Edit,
  Trash2,
  Eye,
  Package,
  Check,
  X,
  Download,
  RefreshCw,
  Loader,
  ArrowRight,
  Zap,
  Activity,
  GitBranch,
} from "lucide-react"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"

function getAuthToken() {
  if (typeof window !== "undefined") {
    return localStorage.getItem("authToken") || ""
  }
  return ""
}

// ============================================================================
// API CLIENT
// ============================================================================

const PluginsAPI = {
  listPlugins: async () => {
    try {
      const response = await fetch(`${API_BASE}/plugins`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAuthToken()}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch plugins: ${response.statusText}`)
      }

      const data = await response.json()
      const plugins = data.plugins || data.data || data || []

      if (!Array.isArray(plugins)) {
        throw new Error("Invalid plugins response format")
      }

      return plugins
    } catch (err) {
      console.error("❌ Error fetching plugins:", err)
      throw err
    }
  },

  setPluginConfig: async (pluginId, config) => {
    try {
      const response = await fetch(`${API_BASE}/plugins/${pluginId}/config`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify(config),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            `Failed to update plugin: ${response.statusText}`
        )
      }

      return data
    } catch (err) {
      console.error(`❌ Error updating plugin:`, err)
      throw err
    }
  },

  installFromZip: async (file, pluginId) => {
    try {
      const formData = new FormData()
      formData.append("file", file, file.name)
      formData.append("plugin_id", pluginId)

      const response = await fetch(`${API_BASE}/plugins/install/zip`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: formData,
      })

      const responseData = await response.json()

      if (!response.ok) {
        throw new Error(
          responseData?.error ||
            responseData?.message ||
            `Installation failed: ${response.statusText}`
        )
      }

      return responseData
    } catch (err) {
      console.error("❌ Installation error:", err)
      throw err
    }
  },

  installFromFolder: async (path) => {
    try {
      const response = await fetch(`${API_BASE}/plugins/install/folder`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({ path }),
      })

      if (!response.ok) {
        throw new Error(`Failed to install plugin: ${response.statusText}`)
      }

      return response.json()
    } catch (err) {
      console.error("❌ Error installing from folder:", err)
      throw err
    }
  },

  getPluginDetails: async (pluginId) => {
    try {
      const response = await fetch(`${API_BASE}/plugins/${pluginId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAuthToken()}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch plugin: ${response.statusText}`)
      }

      return response.json()
    } catch (err) {
      console.error(`❌ Error fetching plugin details:`, err)
      throw err
    }
  },
}

// ============================================================================
// MAIN ADMIN PLUGINS PAGE
// ============================================================================

export default function AdminPluginsPage() {
  const [plugins, setPlugins] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedPlugin, setSelectedPlugin] = useState(null)

  // Dialog states
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isInstallOpen, setIsInstallOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  // Install form state
  const [installMethod, setInstallMethod] = useState("zip")
  const [selectedFile, setSelectedFile] = useState(null)
  const [folderPath, setFolderPath] = useState("")
  const [togglingId, setTogglingId] = useState(null)

  // Load plugins on mount
  const loadPlugins = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await PluginsAPI.listPlugins()
      setPlugins(data)
    } catch (err) {
      setError(err.message || "Failed to load plugins")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPlugins()
  }, [loadPlugins])

  // Auto-clear messages
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [success])

  // ========================================================================
  // Handle toggle plugin
  // ========================================================================
  const handleTogglePlugin = async (plugin) => {
    setTogglingId(plugin.id)
    setError(null)

    try {
      const newState = !plugin.enabled
      await PluginsAPI.setPluginConfig(plugin.id, { enabled: newState })
      setSuccess(`Plugin ${newState ? "enabled" : "disabled"} successfully`)
      await loadPlugins()
    } catch (err) {
      setError(err.message || "Failed to update plugin")
    } finally {
      setTogglingId(null)
    }
  }

  // ========================================================================
  // Handle install plugin
  // ========================================================================
  const handleInstallPlugin = async () => {
    if (installMethod === "zip" && !selectedFile) {
      setError("Please select a ZIP file")
      return
    }
    if (installMethod === "folder" && !folderPath) {
      setError("Please enter a folder path")
      return
    }

    if (selectedFile && selectedFile.size === 0) {
      setError("Selected file is empty")
      return
    }

    setLoading(true)
    setError(null)

    try {
      if (installMethod === "zip") {
        const pluginId = selectedFile.name
          .replace(/\.zip$/i, "")
          .toLowerCase()
          .trim()

        if (!pluginId) {
          setError("Could not extract plugin ID from filename")
          setLoading(false)
          return
        }

        await PluginsAPI.installFromZip(selectedFile, pluginId)
      } else {
        await PluginsAPI.installFromFolder(folderPath)
      }

      setSuccess("Plugin installed successfully")
      setIsInstallOpen(false)
      setSelectedFile(null)
      setFolderPath("")
      await loadPlugins()
    } catch (err) {
      setError(err.message || "Failed to install plugin")
    } finally {
      setLoading(false)
    }
  }

  // ========================================================================
  // Handle view details
  // ========================================================================
  const handleViewDetails = async (plugin) => {
    setSelectedPlugin(plugin)
    setIsDetailsOpen(true)
  }

  // ========================================================================
  // Filter plugins
  // ========================================================================
  const filteredPlugins = plugins.filter((plugin) => {
    const search = searchTerm.toLowerCase()
    return (
      plugin.name.toLowerCase().includes(search) ||
      plugin.id.toLowerCase().includes(search)
    )
  })

  // ========================================================================
  // Calculate stats
  // ========================================================================
  const stats = {
    total: plugins.length,
    enabled: plugins.filter((p) => p.enabled).length,
    disabled: plugins.filter((p) => !p.enabled).length,
  }

  // ========================================================================
  // RENDER
  // ========================================================================
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Plugin Manager</h1>
          <p className="text-muted-foreground mt-2">
            Manage system plugins - enable/disable and install new plugins
          </p>
        </div>
        <Button onClick={() => setIsInstallOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Install Plugin
        </Button>
      </div>

      {/* Success Alert */}
      {success && (
        <Alert className="bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <AlertTitle className="text-emerald-800 dark:text-emerald-200">
            Success
          </AlertTitle>
          <AlertDescription className="text-emerald-700 dark:text-emerald-300">
            {success}
          </AlertDescription>
        </Alert>
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Plugins
                </p>
                <p className="text-3xl font-bold mt-2">{stats.total}</p>
              </div>
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Enabled
                </p>
                <p className="text-3xl font-bold mt-2 text-emerald-600">
                  {stats.enabled}
                </p>
              </div>
              <Check className="h-8 w-8 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Disabled
                </p>
                <p className="text-3xl font-bold mt-2 text-slate-600">
                  {stats.disabled}
                </p>
              </div>
              <X className="h-8 w-8 text-slate-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Plugins Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Installed Plugins</CardTitle>
              <CardDescription>
                Configure plugin state and manage installations
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadPlugins}
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {/* Search Bar */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search plugins..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Loading State */}
          {loading && plugins.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Loading plugins...
            </div>
          ) : filteredPlugins.length === 0 ? (
            /* Empty State */
            <div className="py-12 text-center">
              <h3 className="text-lg font-semibold">No plugins found</h3>
              <p className="text-sm text-muted-foreground">
                {searchTerm
                  ? "Try adjusting your search"
                  : "Install your first plugin to get started"}
              </p>
            </div>
          ) : (
            /* Plugin List Table */
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plugin</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPlugins.map((plugin) => (
                    <TableRow key={plugin.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{plugin.name}</p>
                          <p className="text-xs text-muted-foreground">
                            v{plugin.version || "1.0.0"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {plugin.id}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTogglePlugin(plugin)}
                          disabled={togglingId === plugin.id}
                          className="h-auto p-0"
                        >
                          <Badge
                            variant={plugin.enabled ? "default" : "secondary"}
                            className="cursor-pointer"
                          >
                            {togglingId === plugin.id ? (
                              <Loader className="h-3 w-3 animate-spin mr-1" />
                            ) : plugin.enabled ? (
                              <Check className="h-3 w-3 mr-1" />
                            ) : (
                              <X className="h-3 w-3 mr-1" />
                            )}
                            {plugin.enabled ? "Active" : "Inactive"}
                          </Badge>
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            plugin.type === "ui"
                              ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                              : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                          }
                        >
                          {plugin.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(plugin)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {filteredPlugins.length > 0 && (
            <p className="text-xs text-muted-foreground mt-4">
              Showing {filteredPlugins.length} of {plugins.length} plugins
            </p>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedPlugin?.name}</DialogTitle>
            <DialogDescription>
              {selectedPlugin?.id} • v{selectedPlugin?.version || "1.0.0"}
            </DialogDescription>
          </DialogHeader>

          {selectedPlugin && (
            <div className="space-y-4 py-4">
              {/* Status and Type */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    Status
                  </p>
                  <Badge variant={selectedPlugin.enabled ? "default" : "secondary"}>
                    {selectedPlugin.enabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    Type
                  </p>
                  <Badge variant="outline" className="capitalize">
                    {selectedPlugin.type}
                  </Badge>
                </div>
              </div>

              {/* Actions */}
              {selectedPlugin.actions && selectedPlugin.actions.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Actions ({selectedPlugin.actions.length})
                  </h4>
                  <div className="space-y-1">
                    {selectedPlugin.actions.map((action) => (
                      <div
                        key={action}
                        className="flex items-center gap-2 p-2 rounded bg-muted/30 text-sm"
                      >
                        <ArrowRight className="h-3 w-3" />
                        <code className="font-mono text-xs">{action}</code>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Hooks */}
              {selectedPlugin.hooks && Object.keys(selectedPlugin.hooks).length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Hooks ({Object.keys(selectedPlugin.hooks).length})
                  </h4>
                  <div className="space-y-1">
                    {Object.keys(selectedPlugin.hooks).map((hook) => (
                      <div
                        key={hook}
                        className="flex items-center gap-2 p-2 rounded bg-muted/30 text-sm"
                      >
                        <ArrowRight className="h-3 w-3" />
                        <code className="font-mono text-xs">{hook}</code>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDetailsOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Install Dialog */}
      <Dialog open={isInstallOpen} onOpenChange={setIsInstallOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Install Plugin</DialogTitle>
            <DialogDescription>
              Add a new plugin to your system
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="install-method">Installation Method</Label>
              <Select value={installMethod} onValueChange={setInstallMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="zip">ZIP File</SelectItem>
                  <SelectItem value="folder">From Folder</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {installMethod === "zip" ? (
              <div className="grid gap-2">
                <Label htmlFor="plugin-file">Plugin ZIP File</Label>
                <div
                  className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50"
                  onClick={() =>
                    document.getElementById("plugin-file")?.click()
                  }
                >
                  <Download className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">
                    Click to select ZIP file
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedFile ? selectedFile.name : "No file selected"}
                  </p>
                  <input
                    id="plugin-file"
                    type="file"
                    accept=".zip"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </div>
              </div>
            ) : (
              <div className="grid gap-2">
                <Label htmlFor="plugin-folder">Folder Path</Label>
                <Input
                  id="plugin-folder"
                  placeholder="/path/to/plugin"
                  value={folderPath}
                  onChange={(e) => setFolderPath(e.target.value)}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsInstallOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleInstallPlugin}
              disabled={loading || (installMethod === "zip" && !selectedFile) || (installMethod === "folder" && !folderPath)}
            >
              {loading ? "Installing..." : "Install"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}