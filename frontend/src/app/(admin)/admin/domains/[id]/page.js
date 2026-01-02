"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import {
  ArrowLeft,
  Trash2,
  Copy,
  CheckCircle2,
  Loader2,
} from "lucide-react"

import { getDomainById, deleteDomain } from "@/lib/api/domain"
import { getErrorMessage } from "@/lib/api/client"

/* ----------------------------------------------------
   Status UI configuration
---------------------------------------------------- */
const statusConfig = {
  active: {
    label: "Active",
    color: "bg-green-500/10 text-green-700 dark:text-green-400",
  },
  expiring_soon: {
    label: "Expiring Soon",
    color: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  },
  expired: {
    label: "Expired",
    color: "bg-red-500/10 text-red-700 dark:text-red-400",
  },
}

export default function DomainDetailPage() {
  const { id } = useParams()
  const router = useRouter()

  const [domain, setDomain] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  /* ----------------------------------------------------
     Fetch domain
  ---------------------------------------------------- */
  useEffect(() => {
    if (id) fetchDomain()
  }, [id])

  const fetchDomain = async () => {
    try {
      setLoading(true)
      setError(null)

      const res = await getDomainById(id)

      // API returns: { success, data }
      const domainData = res?.data || null
      setDomain(domainData)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  /* ----------------------------------------------------
     Helpers
  ---------------------------------------------------- */
  const handleCopy = (value, key) => {
    navigator.clipboard.writeText(value)
    setCopied(key)
    setTimeout(() => setCopied(null), 1500)
  }

  const formatDate = (value) => {
    if (!value) return "N/A"
    return new Date(value).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const handleDelete = async () => {
    try {
      await deleteDomain(id)
      router.push("/admin/domains")
    } catch (err) {
      alert(getErrorMessage(err))
    }
  }

  /* ----------------------------------------------------
     Loading / Error
  ---------------------------------------------------- */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !domain) {
    return (
      <div className="space-y-6">
        <Link href="/admin/domains">
          <Button variant="ghost">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Domains
          </Button>
        </Link>
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            {error || "Domain not found"}
          </CardContent>
        </Card>
      </div>
    )
  }

  /* ----------------------------------------------------
     Safe derived data
  ---------------------------------------------------- */
  const metadata = domain.metadata || {}
  const dnsRecords = metadata.dnsRecords || []
  const logs = metadata.logs || []
  const whoisData = metadata.whoisData || {}

  /* ----------------------------------------------------
     UI
  ---------------------------------------------------- */
  return (
    <div className="space-y-6">
      {/* Back */}
      <Link href="/admin/domains">
        <Button variant="ghost">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Domains
        </Button>
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{domain.name}</h1>
          <p className="text-muted-foreground">Domain ID: {domain.id}</p>
        </div>
        <Button variant="destructive" onClick={() => setDeleteConfirm(true)}>
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Domain
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-xs text-muted-foreground">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={statusConfig[domain.status]?.color}>
              {statusConfig[domain.status]?.label || domain.status}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xs text-muted-foreground">Registrar</CardTitle>
          </CardHeader>
          <CardContent className="font-semibold">
            {domain.provider || "N/A"}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xs text-muted-foreground">Expires</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-semibold">
              {formatDate(domain.expiryDate)}
            </div>
            <div className="text-xs text-muted-foreground">
              Auto-renew: {metadata.autoRenew ? "Enabled" : "Disabled"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xs text-muted-foreground">Created</CardTitle>
          </CardHeader>
          <CardContent className="font-semibold">
            {formatDate(domain.createdAt)}
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="metadata">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="metadata">Metadata</TabsTrigger>
          <TabsTrigger value="dns">DNS Records</TabsTrigger>
          <TabsTrigger value="whois">WHOIS</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        {/* Metadata */}
        <TabsContent value="metadata">
          <Card>
            <CardHeader>
              <CardTitle>Nameservers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {domain.nameservers?.length ? (
                domain.nameservers.map((ns, i) => (
                  <div key={i} className="flex justify-between bg-muted p-3 rounded">
                    <code>{ns}</code>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleCopy(ns, `ns-${i}`)}
                    >
                      {copied === `ns-${i}` ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground">No nameservers</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* DNS */}
        <TabsContent value="dns">
          <Card>
            <CardHeader>
              <CardTitle>DNS Records</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>TTL</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dnsRecords.length ? (
                    dnsRecords.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell>{r.type}</TableCell>
                        <TableCell>{r.name}</TableCell>
                        <TableCell>{r.value}</TableCell>
                        <TableCell>{r.ttl}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center">
                        No DNS records
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* WHOIS */}
        <TabsContent value="whois">
          <Card>
            <CardContent className="whitespace-pre-wrap font-mono text-sm">
              {whoisData.rawData || "No WHOIS data"}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs */}
        <TabsContent value="logs">
          <Card>
            <CardContent className="text-muted-foreground text-center py-6">
              {logs.length ? "Logs available" : "No logs available"}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete dialog */}
      <AlertDialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Soft Delete Domain</AlertDialogTitle>
            <AlertDialogDescription>
              Delete <strong>{domain.name}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-red-600"
            onClick={handleDelete}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
