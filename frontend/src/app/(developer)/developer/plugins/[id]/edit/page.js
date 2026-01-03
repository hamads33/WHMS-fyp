"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Copy, Download, Edit2, Eye, MoreHorizontal, Trash2, Upload, AlertCircle, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

const editSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  category: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  supportUrl: z.string().url().optional().or(z.literal("")),
  sourceRepository: z.string().url().optional().or(z.literal("")),
})

// Mock data for existing plugin
const mockPlugin = {
  id: "advanced-cache",
  name: "Advanced Cache Manager",
  description: "A powerful caching solution for performance optimization",
  category: "caching",
  status: "published",
  currentVersion: "2.1.0",
  downloads: 5420,
  rating: 4.9,
  supportUrl: "https://example.com/support",
  sourceRepository: "https://github.com/user/cache-manager",
  createdAt: "2024-01-15",
  updatedAt: "2024-01-28",
  versions: [
    { version: "2.1.0", date: "2024-01-28", downloads: 420, changelog: "Bug fixes and performance improvements" },
    { version: "2.0.0", date: "2024-01-15", downloads: 1200, changelog: "Major update with new features" },
    { version: "1.5.0", date: "2023-12-20", downloads: 980, changelog: "Initial stable release" },
  ],
  licenses: [
    { id: 1, key: "LIC-XXX-YYY-ZZZ", issued: "2024-01-20", used: true },
    { id: 2, key: "LIC-AAA-BBB-CCC", issued: "2024-01-25", used: false },
  ],
}

const approvalHistory = [
  { date: "2024-01-28", status: "approved", reviewer: "Jane Smith", comment: "Looks great! Published." },
  { date: "2024-01-15", status: "approved", reviewer: "John Doe", comment: "Initial review passed." },
]

export default function PluginEditPage({ params }) {
  const { id } = params
  const [currentTab, setCurrentTab] = useState("basic")
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showUnpublishDialog, setShowUnpublishDialog] = useState(false)
  const [autoSaveStatus, setAutoSaveStatus] = useState("saved")
  const [hasChanges, setHasChanges] = useState(false)

  const form = useForm({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name: mockPlugin.name,
      description: mockPlugin.description,
      category: mockPlugin.category,
      version: mockPlugin.currentVersion,
      supportUrl: mockPlugin.supportUrl,
      sourceRepository: mockPlugin.sourceRepository,
    },
  })

  const onSubmit = async (data) => {
    setAutoSaveStatus("saving")
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500))
    setAutoSaveStatus("saved")
    setHasChanges(false)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card sticky top-0 z-50">
        <div className="px-6 py-4">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{mockPlugin.name}</h1>
              <div className="flex items-center gap-3 mt-2">
                <Badge
                  className={
                    mockPlugin.status === "published"
                      ? "bg-chart-1/20 text-chart-1 border-chart-1/30"
                      : "bg-muted text-muted-foreground border-border"
                  }
                  variant="outline"
                >
                  {mockPlugin.status.charAt(0).toUpperCase() + mockPlugin.status.slice(1)}
                </Badge>
                <span className="text-sm text-muted-foreground">v{mockPlugin.currentVersion}</span>
                {hasChanges && <span className="text-xs text-destructive">* Unsaved changes</span>}
                {autoSaveStatus === "saved" && (
                  <span className="text-xs text-chart-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Auto-saved
                  </span>
                )}
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 hover:bg-muted rounded transition-colors">
                  <MoreHorizontal className="w-5 h-5 text-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  View Public Page
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Download Files
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowUnpublishDialog(true)} className="text-destructive">
                  Unpublish Plugin
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Tabs value={currentTab} onValueChange={setCurrentTab}>
                  <TabsList className="grid w-full grid-cols-6">
                    <TabsTrigger value="basic">Basic Info</TabsTrigger>
                    <TabsTrigger value="versions">Versions</TabsTrigger>
                    <TabsTrigger value="publishing">Publishing</TabsTrigger>
                    <TabsTrigger value="pricing">Pricing</TabsTrigger>
                    <TabsTrigger value="team">Team</TabsTrigger>
                    <TabsTrigger value="danger">Danger</TabsTrigger>
                  </TabsList>

                  {/* Tab 1: Basic Info */}
                  <TabsContent value="basic" className="space-y-6 mt-6">
                    <Card className="bg-card">
                      <CardHeader>
                        <CardTitle>Basic Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Plugin Name</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  onChange={(e) => {
                                    field.onChange(e)
                                    setHasChanges(true)
                                  }}
                                  className="bg-muted border-border"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <textarea
                                  {...field}
                                  onChange={(e) => {
                                    field.onChange(e)
                                    setHasChanges(true)
                                  }}
                                  rows={4}
                                  className="flex min-h-24 w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="category"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Category</FormLabel>
                                <Select value={field.value} onValueChange={field.onChange}>
                                  <FormControl>
                                    <SelectTrigger className="bg-muted border-border">
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="caching">Caching</SelectItem>
                                    <SelectItem value="seo">SEO</SelectItem>
                                    <SelectItem value="performance">Performance</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="version"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Current Version</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    onChange={(e) => {
                                      field.onChange(e)
                                      setHasChanges(true)
                                    }}
                                    placeholder="1.0.0"
                                    className="bg-muted border-border"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="supportUrl"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Support URL</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    onChange={(e) => {
                                      field.onChange(e)
                                      setHasChanges(true)
                                    }}
                                    className="bg-muted border-border"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="sourceRepository"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Repository</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    onChange={(e) => {
                                      field.onChange(e)
                                      setHasChanges(true)
                                    }}
                                    className="bg-muted border-border"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">
                          Save Changes
                        </Button>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Tab 2: Versions */}
                  <TabsContent value="versions" className="space-y-6 mt-6">
                    <Card className="bg-card">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle>Version History</CardTitle>
                            <CardDescription>View and manage plugin versions</CardDescription>
                          </div>
                          <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                            <Upload className="w-4 h-4 mr-2" />
                            Upload New Version
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {mockPlugin.versions.map((v) => (
                            <div key={v.version} className="border border-border rounded-lg p-4">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h3 className="font-semibold text-foreground">v{v.version}</h3>
                                  <p className="text-sm text-muted-foreground mt-1">{v.changelog}</p>
                                  <div className="flex items-center gap-4 mt-3">
                                    <span className="text-xs text-muted-foreground">{v.date}</span>
                                    <span className="text-xs text-muted-foreground">{v.downloads} downloads</span>
                                  </div>
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button className="p-1 hover:bg-muted rounded transition-colors">
                                      <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem className="flex items-center gap-2">
                                      <Download className="w-4 h-4" />
                                      Download
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="flex items-center gap-2">
                                      <Edit2 className="w-4 h-4" />
                                      Edit Changelog
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Tab 3: Publishing */}
                  <TabsContent value="publishing" className="space-y-6 mt-6">
                    <Card className="bg-card">
                      <CardHeader>
                        <CardTitle>Publishing Status</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <Alert>
                          <CheckCircle2 className="h-4 w-4 text-chart-1" />
                          <AlertDescription>
                            Your plugin is published and visible to all users. You can unpublish it anytime from the
                            actions menu.
                          </AlertDescription>
                        </Alert>

                        <div>
                          <h3 className="font-semibold text-foreground mb-4">Approval History</h3>
                          <div className="space-y-3">
                            {approvalHistory.map((approval, idx) => (
                              <div key={idx} className="border border-border rounded-lg p-3">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <Badge
                                      className="bg-chart-1/20 text-chart-1 border-chart-1/30 mb-2"
                                      variant="outline"
                                    >
                                      {approval.status.charAt(0).toUpperCase() + approval.status.slice(1)}
                                    </Badge>
                                    <p className="text-sm text-muted-foreground">
                                      {approval.reviewer} on {approval.date}
                                    </p>
                                    <p className="text-sm text-foreground mt-1">{approval.comment}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Tab 4: Pricing */}
                  <TabsContent value="pricing" className="space-y-6 mt-6">
                    <Card className="bg-card">
                      <CardHeader>
                        <CardTitle>Pricing & Licenses</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div>
                          <h3 className="font-semibold text-foreground mb-4">Issued Licenses</h3>
                          <div className="rounded-lg border border-border overflow-hidden">
                            <Table>
                              <TableHeader className="bg-muted/50">
                                <TableRow className="border-border hover:bg-transparent">
                                  <TableHead className="text-foreground font-semibold">License Key</TableHead>
                                  <TableHead className="text-foreground font-semibold">Issued</TableHead>
                                  <TableHead className="text-foreground font-semibold">Status</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {mockPlugin.licenses.map((lic) => (
                                  <TableRow key={lic.id} className="border-border hover:bg-muted/30 transition-colors">
                                    <TableCell className="font-mono text-sm text-foreground flex items-center gap-2">
                                      {lic.key}
                                      <button className="p-1 hover:bg-muted rounded transition-colors">
                                        <Copy className="w-3 h-3 text-muted-foreground" />
                                      </button>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm">{lic.issued}</TableCell>
                                    <TableCell>
                                      <Badge
                                        variant="outline"
                                        className={
                                          lic.used
                                            ? "bg-chart-1/20 text-chart-1 border-chart-1/30"
                                            : "bg-muted text-muted-foreground border-border"
                                        }
                                      >
                                        {lic.used ? "In Use" : "Available"}
                                      </Badge>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>

                          <Button size="sm" variant="outline" className="mt-4 bg-transparent">
                            Generate New License
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Tab 5: Team */}
                  <TabsContent value="team" className="space-y-6 mt-6">
                    <Card className="bg-card">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle>Team Management</CardTitle>
                            <CardDescription>Manage who can edit this plugin</CardDescription>
                          </div>
                          <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                            Add Member
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                            <div>
                              <p className="font-medium text-foreground">You</p>
                              <p className="text-xs text-muted-foreground">owner@example.com</p>
                            </div>
                            <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30">
                              Owner
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Tab 6: Danger Zone */}
                  <TabsContent value="danger" className="space-y-6 mt-6">
                    <Card className="bg-card border-destructive/30">
                      <CardHeader>
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-5 h-5 text-destructive" />
                          <CardTitle className="text-destructive">Danger Zone</CardTitle>
                        </div>
                        <CardDescription>Irreversible and destructive actions</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="border border-destructive/30 rounded-lg p-4 bg-destructive/5">
                          <h3 className="font-semibold text-foreground mb-2">Delete Plugin</h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            Permanently delete this plugin and all associated data. This action cannot be undone.
                          </p>
                          <Button
                            variant="destructive"
                            onClick={() => setShowDeleteDialog(true)}
                            className="flex items-center gap-2"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete Plugin
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </form>
            </Form>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="bg-card sticky top-24">
              <CardHeader>
                <CardTitle className="text-base">Plugin Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Status</p>
                  <Badge
                    className={
                      mockPlugin.status === "published"
                        ? "bg-chart-1/20 text-chart-1 border-chart-1/30"
                        : "bg-muted text-muted-foreground border-border"
                    }
                    variant="outline"
                  >
                    {mockPlugin.status.charAt(0).toUpperCase() + mockPlugin.status.slice(1)}
                  </Badge>
                </div>

                <div className="pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Statistics</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Downloads</span>
                      <span className="font-semibold text-foreground">{mockPlugin.downloads}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Rating</span>
                      <span className="font-semibold text-foreground">{mockPlugin.rating}★</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Dates</p>
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <p>Created: {mockPlugin.createdAt}</p>
                    <p>Updated: {mockPlugin.updatedAt}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Plugin?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. Your plugin will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive">Delete Plugin</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Unpublish Dialog */}
      <Dialog open={showUnpublishDialog} onOpenChange={setShowUnpublishDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Unpublish Plugin?</DialogTitle>
            <DialogDescription>
              Your plugin will no longer be visible to users, but all data will be preserved.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setShowUnpublishDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive">Unpublish</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}