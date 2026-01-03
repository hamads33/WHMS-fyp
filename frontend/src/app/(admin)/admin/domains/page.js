// src/app/(admin)/admin/domains/page.js
'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  MoreHorizontal,
  Eye,
  Trash2,
  Loader2,
  RefreshCw,
  Plus,
  AlertCircle,
} from 'lucide-react'

import {
  adminGetDomains,
  adminDeleteDomain,
  getDomainStats,
  formatDate,
  getStatusColor,
  getStatusLabel,
  daysUntilExpiry,
} from '@/lib/api/domain'
import { getErrorMessage } from '@/lib/api/client'

export default function DomainsPage() {
  const [domains, setDomains] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [registrarFilter, setRegistrarFilter] = useState('all')
  const [pageSize, setPageSize] = useState(10)

  const [selectedDomains, setSelectedDomains] = useState(new Set())
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  /* ============================================
     Fetch Data
  ============================================ */
  useEffect(() => {
    fetchDomains()
    fetchStats()
  }, [statusFilter, registrarFilter])

  const fetchDomains = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const res = await adminGetDomains({
        status: statusFilter === 'all' ? undefined : statusFilter,
        registrar: registrarFilter === 'all' ? undefined : registrarFilter,
        limit: 1000,
      })

      const list = Array.isArray(res?.data) ? res.data : []
      setDomains(list)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [statusFilter, registrarFilter])

  const fetchStats = useCallback(async () => {
    try {
      const res = await getDomainStats()
      setStats(res?.data || null)
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    }
  }, [])

  /* ============================================
     Computed Data
  ============================================ */
  const registrars = useMemo(() => {
    const unique = new Set(domains.map(d => d.registrar).filter(Boolean))
    return Array.from(unique).sort()
  }, [domains])

  const filteredDomains = useMemo(() => {
    return domains.filter(domain => {
      const matchesSearch =
        domain.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        domain.ownerId?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus =
        statusFilter === 'all' || domain.status === statusFilter

      const matchesRegistrar =
        registrarFilter === 'all' || domain.registrar === registrarFilter

      return matchesSearch && matchesStatus && matchesRegistrar
    })
  }, [domains, searchTerm, statusFilter, registrarFilter])

  const paginatedDomains = useMemo(() => {
    return filteredDomains.slice(0, pageSize)
  }, [filteredDomains, pageSize])

  /* ============================================
     Actions
  ============================================ */
  const handleSelectDomain = (domainId) => {
    const newSelected = new Set(selectedDomains)
    if (newSelected.has(domainId)) {
      newSelected.delete(domainId)
    } else {
      newSelected.add(domainId)
    }
    setSelectedDomains(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedDomains.size === paginatedDomains.length) {
      setSelectedDomains(new Set())
    } else {
      setSelectedDomains(new Set(paginatedDomains.map(d => d.id)))
    }
  }

  const handleDelete = async () => {
    try {
      await adminDeleteDomain(deleteConfirm.id)
      setDomains(prev => prev.filter(d => d.id !== deleteConfirm.id))
      setDeleteConfirm(null)
    } catch (err) {
      alert(getErrorMessage(err))
    }
  }

  /* ============================================
     Loading & Error States
  ============================================ */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  /* ============================================
     UI
  ============================================ */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Domains</h1>
          <p className="text-muted-foreground">
            Manage all domains in the system
          </p>
        </div>
        <Link href="/admin/domains/register">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Register Domain
          </Button>
        </Link>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Domains
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.active || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Expiring Soon
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {stats.expiringSoon || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Expired
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats.expired || 0}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Error */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6 flex gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-900">Error Loading Domains</p>
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters & Search</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            placeholder="Search domain or owner..."
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
              <SelectItem value="transfer_pending">Transfer Pending</SelectItem>
            </SelectContent>
          </Select>

          <Select value={registrarFilter} onValueChange={setRegistrarFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Registrars</SelectItem>
              {registrars.map(r => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={pageSize.toString()} onValueChange={e => setPageSize(Number(e))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 per page</SelectItem>
              <SelectItem value="25">25 per page</SelectItem>
              <SelectItem value="50">50 per page</SelectItem>
              <SelectItem value="100">100 per page</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <div>
            <CardTitle className="text-base">
              {filteredDomains.length} Domain{filteredDomains.length !== 1 ? 's' : ''}
            </CardTitle>
            <CardDescription>
              Showing {paginatedDomains.length} of {filteredDomains.length}
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={fetchDomains}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={
                      paginatedDomains.length > 0 &&
                      selectedDomains.size === paginatedDomains.length
                    }
                    onChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Registrar</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Days Left</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedDomains.length > 0 ? (
                paginatedDomains.map(domain => (
                  <TableRow key={domain.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedDomains.has(domain.id)}
                        onChange={() => handleSelectDomain(domain.id)}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-primary font-semibold">
                      {domain.name}
                    </TableCell>
                    <TableCell className="text-sm">
                      {domain.ownerId || 'System'}
                    </TableCell>
                    <TableCell className="text-sm">
                      <Badge variant="outline">{domain.registrar || 'N/A'}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(domain.status)}>
                        {getStatusLabel(domain.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(domain.expiryDate)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {daysUntilExpiry(domain.expiryDate) !== null ? (
                        <span className={
                          daysUntilExpiry(domain.expiryDate) < 0
                            ? 'text-red-600 font-semibold'
                            : daysUntilExpiry(domain.expiryDate) <= 30
                            ? 'text-yellow-600 font-semibold'
                            : 'text-gray-600'
                        }>
                          {daysUntilExpiry(domain.expiryDate)} days
                        </span>
                      ) : (
                        'N/A'
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/domains/${domain.id}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => setDeleteConfirm(domain)}
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
                    colSpan={8}
                    className="text-center text-muted-foreground py-8"
                  >
                    No domains found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {filteredDomains.length > pageSize && (
            <div className="mt-4 flex justify-center">
              <Button
                variant="outline"
                onClick={() => setPageSize(pageSize + 10)}
              >
                Load More ({pageSize} of {filteredDomains.length})
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <AlertDialog
        open={!!deleteConfirm}
        onOpenChange={() => setDeleteConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Domain</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <strong>{deleteConfirm?.name}</strong>? This action cannot be undone.
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