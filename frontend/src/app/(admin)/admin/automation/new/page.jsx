"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

import { ArrowLeft } from "lucide-react"
import { AutomationAPI } from "@/lib/api/automation"

/* Route: app/(admin)/admin/automation/new/page.jsx */

export default function CreateProfilePage() {
  const router = useRouter()

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    schedule: "",
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (!formData.name || !formData.schedule) {
      setError("Name and cron schedule are required")
      return
    }

    setLoading(true)
    try {
      await AutomationAPI.createProfile({
        name: formData.name,
        description: formData.description || null,
        cron: formData.schedule,
      })

      router.push("/admin/automation")
    } catch (err) {
      setError(err?.message || "Failed to create profile")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <Link
            href="/admin/automation"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Profiles
          </Link>
          <h1 className="text-3xl font-bold text-foreground">
            Create New Profile
          </h1>
        </div>
      </div>

      {/* Form */}
      <div className="container mx-auto px-4 py-8 max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>New Automation Profile</CardTitle>
            <CardDescription>
              Set up a new automation workflow
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <Label htmlFor="name" className="font-semibold">
                  Profile Name
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g., Daily Backup"
                  required
                  className="mt-2"
                />
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description" className="font-semibold">
                  Description
                </Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Optional description for this automation"
                  className="mt-2 resize-none"
                  rows={3}
                />
              </div>

              {/* Cron */}
              <div>
                <Label htmlFor="schedule" className="font-semibold">
                  Cron Schedule
                </Label>
                <Input
                  id="schedule"
                  name="schedule"
                  value={formData.schedule}
                  onChange={handleChange}
                  placeholder="e.g., 0 2 * * *"
                  required
                  className="mt-2 font-mono"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Enter a cron expression
                </p>
              </div>

              {/* Error */}
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4">
                <Link href="/admin/automation" className="flex-1">
                  <Button variant="outline" className="w-full bg-transparent">
                    Cancel
                  </Button>
                </Link>

                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? "Creating..." : "Create Profile"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}