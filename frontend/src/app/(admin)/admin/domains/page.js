"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
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
  MoreHorizontal,
  Eye,
  Trash2,
  Download,
  Loader2,
} from "lucide-react"

import { getDomains, deleteDomain } from "@/lib/api/domain"
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

export default function DomainsPage() {
  const [domains, setDomains] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [providerFilter, setProviderFilter] = useState("all")
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  /* ----------------------------------------------------
     Fetch domains on mount
  ---------------------------------------------------- */
  useEffect(() => {
    fetchDomains()
  }, [])

  const fetchDomains = async () => {
    try {
      setLoading(true)
      setError(null)

      const res = await getDomains()

      // API returns: { success: true, data: [] }
      const list = Array.isArray(res?.data) ? res.data : []
      setDomains(list)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  /* ----------------------------------------------------
     Derived data
  ---------------------------------------------------- */

  // Unique providers
  const providers = useMemo(() => {
    if (!Array.isArray(domains)) return []
    return [...new Set(domains.map(d => d?.provider).filter(Boolean))]
  }, [domains])

  // Filtered domains
  const filteredDomains = useMemo(() => {
    if (!Array.isArray(domains)) return []

    return domains.filter(domain => {
      const matchesSearch =
        domain.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        domain.metadata?.client?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus =
        statusFilter === "all" || domain.status === statusFilter

      const matchesProvider =
        providerFilter === "all" || domain.provider === providerFilter

      const notDeleted = !domain.deleted

      return (
        matchesSearch &&
        matchesStatus &&
        matchesProvider &&
        notDeleted
      )
    })
  }, [domains, searchTerm, statusFilter, providerFilter])

  /* ----------------------------------------------------
     Actions
  ---------------------------------------------------- */
  const handleSoftDelete = async (domainId) => {
    try {
      await deleteDomain(domainId)
      setDomains(prev => prev.filter(d => d.id !== domainId))
      setDeleteConfirm(null)
    } catch (err) {
      alert(getErrorMessage(err))
    }
  }

  const formatDate = (value) => {
    if (!value) return "N/A"
    return new Date(value).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  /* ----------------------------------------------------
     Loading & Error states
  ---------------------------------------------------- */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-red-600">
          <p className="font-semibold">Error loading domains</p>
          <p className="text-sm mt-2">{error}</p>
          <Button onClick={fetchDomains} className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  /* ----------------------------------------------------
     UI
  ---------------------------------------------------- */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Domains</h1>
        <p className="text-muted-foreground">
          Manage all domains in the system
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Input
            placeholder="Domain name or client..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="expiring_soon">Expiring Soon</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>

          <Select value={providerFilter} onValueChange={setProviderFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Providers</SelectItem>
              {providers.map(p => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="flex flex-row justify-between">
          <CardTitle className="text-base">
            {filteredDomains.length} Domain
            {filteredDomains.length !== 1 && "s"}
          </CardTitle>
          <Button size="sm" variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Domain</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Created</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDomains.length > 0 ? (
                filteredDomains.map(domain => (
                  <TableRow key={domain.id}>
                    <TableCell className="font-mono text-primary">
                      {domain.name}
                    </TableCell>
                    <TableCell>
                      {domain.metadata?.client || "N/A"}
                    </TableCell>
                    <TableCell>
                      {domain.provider || "N/A"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          statusConfig[domain.status]?.color
                        }
                      >
                        {statusConfig[domain.status]?.label ||
                          domain.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {formatDate(domain.expiryDate)}
                    </TableCell>
                    <TableCell>
                      {formatDate(domain.createdAt)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost">
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link
                              href={`/admin/domains/${domain.id}`}
                              className="flex gap-2"
                            >
                              <Eye className="h-4 w-4" />
                              View
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() =>
                              setDeleteConfirm(domain)
                            }
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-muted-foreground"
                  >
                    No domains found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <AlertDialog
        open={!!deleteConfirm}
        onOpenChange={() => setDeleteConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Soft Delete Domain
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>{deleteConfirm?.name}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-red-600"
            onClick={() =>
              handleSoftDelete(deleteConfirm.id)
            }
          >
            Delete
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
