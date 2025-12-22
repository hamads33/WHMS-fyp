"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Download, RotateCcw, ArrowLeft } from "lucide-react"
import { backupApi } from "@/lib/api/backupClient"

export function BackupDetails() {
  const router = useRouter()
  const params = useParams()
  const backupId = params?.id

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!backupId) return

    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await backupApi(`/backups/${backupId}`)
        setData(res)
      } catch {
        setError("Failed to load backup details")
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [backupId])

  /* ------------------ STATES ------------------ */

  if (loading) {
    return (
      <div className="min-h-screen p-8">
        <p className="text-muted-foreground">Loading backup details…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen p-8">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div className="rounded-md bg-red-50 text-red-700 px-4 py-3">
          {error}
        </div>
      </div>
    )
  }

  /* ------------------ DATA ------------------ */

  const {
    name,
    id,
    type,
    provider,
    sizeBytes,
    status,
    createdAt,
    completedAt,
    timeline = [],
    steps = [],
  } = data

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <Button
          variant="ghost"
          className="mb-6 gap-2"
          onClick={() => router.push("/admin/backups")}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Backups
        </Button>

        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">{name}</h1>
            <p className="text-muted-foreground mt-2">Backup ID: {id}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() =>
                window.open(
                  `${process.env.NEXT_PUBLIC_API_URL}/api/backups/${id}/download`
                )
              }
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Download
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                backupApi(`/backups/${id}/restore`, {
                  method: "POST",
                  body: JSON.stringify({
                    restoreFiles: true,
                    restoreDb: false,
                    destination: "/restore",
                  }),
                })
              }
              className="gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Restore
            </Button>
          </div>
        </div>

        {/* Metadata */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Backup Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <Info label="Type" value={<Badge>{type}</Badge>} />
              <Info label="Provider" value={provider} />
              <Info
                label="Size"
                value={
                  sizeBytes
                    ? `${(sizeBytes / 1024 / 1024).toFixed(2)} MB`
                    : "-"
                }
              />
              <Info label="Created At" value={new Date(createdAt).toLocaleString()} />
              <Info
                label="Completed At"
                value={completedAt ? new Date(completedAt).toLocaleString() : "-"}
              />
              <Info label="Status" value={<Badge>{status}</Badge>} />
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Backup Timeline</CardTitle>
            <CardDescription>Progress of the backup process</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {timeline.map((t, i) => (
              <div key={i}>
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-green-100 text-green-800 flex items-center justify-center">
                    ✓
                  </div>
                  <div>
                    <p className="font-medium">{t.status}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(t.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
                {i < timeline.length - 1 && (
                  <div className="ml-4 w-0.5 h-4 bg-border" />
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Steps */}
        <Card>
          <CardHeader>
            <CardTitle>Backup Steps</CardTitle>
            <CardDescription>Detailed execution logs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {steps.map((s, i) => (
              <div key={i}>
                <div className="flex justify-between">
                  <div>
                    <div className="flex gap-2 items-center">
                      <span className="font-medium">{s.step}</span>
                      <Badge
                        className={
                          s.status === "success"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }
                      >
                        {s.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {s.message}
                    </p>
                  </div>
                  <p className="text-sm font-medium">{s.duration}</p>
                </div>
                {i < steps.length - 1 && <Separator />}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

/* ------------------ SMALL HELPER ------------------ */

function Info({ label, value }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="mt-2 font-medium">{value}</div>
    </div>
  )
}
