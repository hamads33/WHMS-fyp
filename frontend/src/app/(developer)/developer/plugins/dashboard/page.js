"use client"

import { useState } from "react"
import Link from "next/link"
import { Plus, Trash2, Power, Eye, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { usePlugins, usePluginStats } from "../../../../../hooks/usePlugins"
import { useToast } from "../../../../../hooks/Usetoast"

export default function PluginDashboard() {
  const { plugins, loading, error, enablePlugin, disablePlugin, uninstallPlugin, refreshPlugins } = usePlugins()
  const { stats, loading: statsLoading } = usePluginStats()
  const { toast } = useToast()
  const [uploadingFile, setUploadingFile] = useState(null)

  const handleTogglePlugin = async (pluginId, currentEnabled) => {
    const toggleFn = currentEnabled ? disablePlugin : enablePlugin
    const result = await toggleFn(pluginId)

    if (result.success) {
      toast({
        title: "Success",
        description: currentEnabled ? "Plugin disabled" : "Plugin enabled",
        variant: "default",
      })
    } else {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      })
    }
  }

  const handleUninstall = async (pluginId, pluginName) => {
    if (!confirm(`Are you sure you want to uninstall "${pluginName}"?`)) return

    const result = await uninstallPlugin(pluginId)
    if (result.success) {
      toast({
        title: "Success",
        description: "Plugin uninstalled successfully",
        variant: "default",
      })
    } else {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      })
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingFile(file.name)
    try {
      const result = await PluginsAPI.installFromZip(file)
      if (result) {
        toast({
          title: "Success",
          description: "Plugin installed successfully",
          variant: "default",
        })
        await refreshPlugins()
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err.message || "Failed to install plugin",
        variant: "destructive",
      })
    } finally {
      setUploadingFile(null)
      e.target.value = "" // Reset file input
    }
  }

  if (error && !plugins.length) {
    return (
      <div className="min-h-screen bg-background">
        <div className="px-6 py-4 border-b border-border sticky top-0 z-40 bg-card">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Plugin Manager</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage your installed plugins</p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto p-6">
          <Card className="border-destructive/50">
            <CardContent className="pt-6">
              <p className="text-destructive mb-4">{error}</p>
              <Button onClick={() => refreshPlugins()}>Retry</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Plugin Manager</h1>
              <p className="text-sm text-muted-foreground mt-1">Manage your installed plugins</p>
            </div>
            <label>
              <Button className="gap-2" asChild>
                <span>
                  <Upload size={16} />
                  {uploadingFile ? "Installing..." : "Install Plugin"}
                </span>
              </Button>
              <input
                type="file"
                accept=".zip"
                onChange={handleFileUpload}
                disabled={uploadingFile !== null}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Plugins</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {statsLoading ? "-" : stats?.total || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Installed on system</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Enabled</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {statsLoading ? "-" : stats?.enabled || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Running plugins</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Disabled</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">
                {statsLoading ? "-" : stats?.disabled || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Inactive plugins</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Trashed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">
                {statsLoading ? "-" : stats?.trashed || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">In trash</p>
            </CardContent>
          </Card>
        </div>

        {/* Info Alert */}
        <Alert>
          <AlertDescription>
            Upload a ZIP file containing your plugin to install it. The plugin should contain a manifest.json file.
          </AlertDescription>
        </Alert>

        {/* Plugins Table */}
        <Card>
          <CardHeader>
            <CardTitle>Installed Plugins</CardTitle>
            <CardDescription>Manage and control your loaded plugins</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading plugins...</p>
              </div>
            ) : plugins.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No plugins installed yet</p>
                <label>
                  <Button className="gap-2">
                    <Upload size={16} />
                    Install Your First Plugin
                  </Button>
                  <input
                    type="file"
                    accept=".zip"
                    onChange={handleFileUpload}
                    disabled={uploadingFile !== null}
                    className="hidden"
                  />
                </label>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Plugin Name</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Version</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Author</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Status</th>
                      <th className="text-right py-3 px-4 font-semibold text-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plugins.map((plugin) => (
                      <tr
                        key={plugin.id}
                        className="border-b border-border hover:bg-muted/50 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-foreground">{plugin.name}</p>
                            <p className="text-xs text-muted-foreground">{plugin.id}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-foreground">v{plugin.version}</td>
                        <td className="py-3 px-4 text-foreground text-sm">{plugin.author}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-xs px-3 py-1 rounded-full inline-flex items-center gap-1 ${
                              plugin.enabled
                                ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                                : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                            }`}
                          >
                            <div
                              className={`w-2 h-2 rounded-full ${
                                plugin.enabled ? "bg-green-600" : "bg-gray-500"
                              }`}
                            />
                            {plugin.enabled ? "Enabled" : "Disabled"}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleTogglePlugin(plugin.id, plugin.enabled)}
                              className="gap-1"
                              title={plugin.enabled ? "Disable plugin" : "Enable plugin"}
                            >
                              <Power
                                size={16}
                                className={plugin.enabled ? "text-green-600" : "text-gray-400"}
                              />
                            </Button>
                            <Link href={`/developer/plugins/${plugin.id}`}>
                              <Button variant="ghost" size="sm" className="gap-1">
                                <Eye size={16} />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUninstall(plugin.id, plugin.name)}
                              className="gap-1 text-destructive hover:text-destructive"
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Plugin Description */}
        {plugins.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>About Plugins</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>
                <strong>Enabled:</strong> The plugin is loaded and active. Its actions and menu items are available.
              </p>
              <p>
                <strong>Disabled:</strong> The plugin is installed but not loaded. Enable it to start using it.
              </p>
              <p>
                <strong>Power Button:</strong> Click to enable or disable a plugin without uninstalling it.
              </p>
              <p>
                <strong>Eye Icon:</strong> View detailed information about the plugin and manage its configuration.
              </p>
              <p>
                <strong>Trash Icon:</strong> Move the plugin to trash. You can restore it later or permanently delete it.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}