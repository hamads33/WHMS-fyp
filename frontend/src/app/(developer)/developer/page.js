// ========================================
// FILE: src/app/(developer)/developer/plugins/upload/page.js
// ========================================
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Upload, ChevronRight, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PluginsAPI } from "@/lib/api/plugins"
import { useToast } from "@/hooks/useToast"

const pluginInfoSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  slug: z.string().min(1, "Slug is required"),
  description: z.string().min(1, "Description is required").max(500),
  fullDescription: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  tags: z.string().optional(),
  language: z.string().min(1, "Language is required"),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, "Must be semantic versioning (e.g., 1.0.0)"),
  license: z.string().min(1, "License is required"),
  supportUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  sourceRepository: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  isFree: z.boolean(),
  price: z.string().optional(),
  licenseType: z.string().min(1, "License type is required"),
})

function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export default function PluginUploadPage() {
  const router = useRouter()
  const [currentTab, setCurrentTab] = useState("info")
  const [uploadedFiles, setUploadedFiles] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const form = useForm({
    resolver: zodResolver(pluginInfoSchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      fullDescription: "",
      category: "",
      tags: "",
      language: "",
      version: "1.0.0",
      license: "mit",
      supportUrl: "",
      sourceRepository: "",
      isFree: true,
      price: "",
      licenseType: "open-source",
    },
  })

  const handleNameChange = (e) => {
    const name = e.target.value
    form.setValue("name", name)
    form.setValue("slug", generateSlug(name))
  }

  const handleFileUpload = (field, files) => {
    if (files && files[0]) {
      setUploadedFiles(prev => ({ ...prev, [field]: files[0] }))
    }
  }

  const onSubmit = async (data) => {
    setIsSubmitting(true)
    try {
      // Create plugin metadata
      const plugin = await PluginsAPI.createPlugin({
        name: data.name,
        slug: data.slug,
        description: data.description,
        fullDescription: data.fullDescription,
        category: data.category,
        tags: data.tags?.split(',').map(t => t.trim()).filter(Boolean),
        language: data.language,
        version: data.version,
        license: data.license,
        supportUrl: data.supportUrl,
        sourceRepository: data.sourceRepository,
        price: data.isFree ? 0 : parseFloat(data.price || '0'),
        licenseType: data.licenseType,
      })

      // Upload files if any
      if (Object.keys(uploadedFiles).length > 0) {
        const formData = new FormData()
        Object.entries(uploadedFiles).forEach(([key, file]) => {
          formData.append(key, file)
        })
        await PluginsAPI.uploadPluginFiles(plugin.id, formData)
      }

      toast({
        title: "Success!",
        description: "Plugin created successfully",
      })

      router.push('/developer/plugins/dashboard')
    } catch (err) {
      toast({
        title: "Error",
        description: err.message || "Failed to create plugin",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card sticky top-0 z-50">
        <div className="px-6 py-4">
          <h1 className="text-2xl font-bold text-foreground">Upload Plugin</h1>
          <p className="text-sm text-muted-foreground mt-1">Submit your plugin to the marketplace</p>
        </div>
      </div>

      <div className="p-6 max-w-4xl mx-auto">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs value={currentTab} onValueChange={setCurrentTab}>
              <TabsList className="grid w-full grid-cols-5 mb-8">
                <TabsTrigger value="info">Plugin Info</TabsTrigger>
                <TabsTrigger value="files">Files</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="pricing">Pricing</TabsTrigger>
                <TabsTrigger value="review">Review</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-6">
                <Card className="bg-card">
                  <CardHeader>
                    <CardTitle>Plugin Information</CardTitle>
                    <CardDescription>Basic details about your plugin</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Plugin Name *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., Advanced Cache Manager"
                              {...field}
                              onChange={(e) => {
                                field.onChange(e)
                                handleNameChange(e)
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
                      name="slug"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Slug</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="auto-generated"
                              {...field}
                              className="bg-muted border-border"
                            />
                          </FormControl>
                          <FormDescription>Auto-generated from plugin name</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Short Description *</FormLabel>
                          <FormControl>
                            <textarea
                              placeholder="Brief description of your plugin (max 500 characters)"
                              {...field}
                              maxLength={500}
                              rows={3}
                              className="flex min-h-20 w-full rounded-md border border-border bg-muted px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                          </FormControl>
                          <FormDescription>{field.value?.length || 0}/500</FormDescription>
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
                            <FormLabel>Category *</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger className="bg-muted border-border">
                                  <SelectValue placeholder="Select a category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="caching">Caching</SelectItem>
                                <SelectItem value="seo">SEO</SelectItem>
                                <SelectItem value="performance">Performance</SelectItem>
                                <SelectItem value="security">Security</SelectItem>
                                <SelectItem value="analytics">Analytics</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="language"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Language *</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger className="bg-muted border-border">
                                  <SelectValue placeholder="Select a language" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="javascript">JavaScript</SelectItem>
                                <SelectItem value="typescript">TypeScript</SelectItem>
                                <SelectItem value="python">Python</SelectItem>
                                <SelectItem value="php">PHP</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="files" className="space-y-6">
                <Card className="bg-card">
                  <CardHeader>
                    <CardTitle>Plugin Files</CardTitle>
                    <CardDescription>Upload your plugin files and media</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Main Plugin File *</label>
                      <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                        <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                        <p className="text-sm font-medium text-foreground">Drag and drop your plugin file</p>
                        <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
                        <input
                          type="file"
                          onChange={(e) => handleFileUpload("mainFile", e.target.files)}
                          className="hidden"
                          accept=".js,.ts,.zip,.tar"
                          id="mainFile"
                        />
                        <label htmlFor="mainFile" className="cursor-pointer absolute inset-0" />
                      </div>
                      {uploadedFiles.mainFile && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Selected: {uploadedFiles.mainFile.name}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Plugin Icon</label>
                      <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer relative">
                        <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                        <p className="text-sm font-medium text-foreground">Upload your plugin icon</p>
                        <p className="text-xs text-muted-foreground mt-1">PNG, JPG, SVG (max 2MB)</p>
                        <input
                          type="file"
                          onChange={(e) => handleFileUpload("icon", e.target.files)}
                          className="hidden"
                          accept="image/*"
                          id="icon"
                        />
                        <label htmlFor="icon" className="cursor-pointer absolute inset-0" />
                      </div>
                      {uploadedFiles.icon && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Selected: {uploadedFiles.icon.name}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="details" className="space-y-6">
                <Card className="bg-card">
                  <CardHeader>
                    <CardTitle>Plugin Details</CardTitle>
                    <CardDescription>Technical information and requirements</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <FormField
                      control={form.control}
                      name="version"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Version *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="1.0.0"
                              {...field}
                              className="bg-muted border-border"
                            />
                          </FormControl>
                          <FormDescription>Semantic versioning (e.g., 1.0.0)</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="license"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>License *</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger className="bg-muted border-border">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="mit">MIT</SelectItem>
                              <SelectItem value="apache">Apache 2.0</SelectItem>
                              <SelectItem value="gpl">GPL 3.0</SelectItem>
                              <SelectItem value="bsd">BSD</SelectItem>
                              <SelectItem value="proprietary">Proprietary</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="supportUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Support URL</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="https://example.com/support"
                                {...field}
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
                            <FormLabel>Source Repository</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="https://github.com/user/repo"
                                {...field}
                                className="bg-muted border-border"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="pricing" className="space-y-6">
                <Card className="bg-card">
                  <CardHeader>
                    <CardTitle>Pricing & License</CardTitle>
                    <CardDescription>Set up pricing and licensing options</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <FormField
                      control={form.control}
                      name="isFree"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between">
                          <div>
                            <FormLabel>Free Plugin</FormLabel>
                            <FormDescription>Is this plugin free?</FormDescription>
                          </div>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={(e) => field.onChange(e.target.checked)}
                            className="w-5 h-5 rounded border-border"
                          />
                        </FormItem>
                      )}
                    />

                    {!form.watch("isFree") && (
                      <FormField
                        control={form.control}
                        name="price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Price (USD) *</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="9.99"
                                {...field}
                                className="bg-muted border-border"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <FormField
                      control={form.control}
                      name="licenseType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>License Type *</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger className="bg-muted border-border">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="open-source">Open Source</SelectItem>
                              <SelectItem value="commercial">Commercial</SelectItem>
                              <SelectItem value="personal">Personal Use</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="review" className="space-y-6">
                <Card className="bg-card">
                  <CardHeader>
                    <CardTitle>Review & Submit</CardTitle>
                    <CardDescription>Review your plugin information before submitting</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Please review all information before submitting. Our team will review your plugin.
                      </AlertDescription>
                    </Alert>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h3 className="text-sm font-semibold mb-2">Plugin Info</h3>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <p><span className="font-medium text-foreground">Name:</span> {form.watch("name")}</p>
                          <p><span className="font-medium text-foreground">Category:</span> {form.watch("category")}</p>
                          <p><span className="font-medium text-foreground">Language:</span> {form.watch("language")}</p>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold mb-2">Pricing</h3>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <p>
                            <span className="font-medium text-foreground">Type:</span>{" "}
                            {form.watch("isFree") ? "Free" : `Paid - $${form.watch("price")}`}
                          </p>
                          <p><span className="font-medium text-foreground">License:</span> {form.watch("licenseType")}</p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 flex gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() => setCurrentTab("info")}
                      >
                        Back
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1 bg-primary"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? "Submitting..." : "Submit for Review"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <div className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const tabs = ["info", "files", "details", "pricing", "review"]
                  const currentIndex = tabs.indexOf(currentTab)
                  if (currentIndex > 0) setCurrentTab(tabs[currentIndex - 1])
                }}
                disabled={currentTab === "info"}
              >
                Previous
              </Button>
              <Button
                type="button"
                onClick={() => {
                  const tabs = ["info", "files", "details", "pricing", "review"]
                  const currentIndex = tabs.indexOf(currentTab)
                  if (currentIndex < tabs.length - 1) setCurrentTab(tabs[currentIndex + 1])
                }}
                disabled={currentTab === "review"}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  )
}

// ========================================
// FILE: src/app/(developer)/developer/plugins/[id]/edit/page.js
// Use Document 3 with async params fix
// ========================================