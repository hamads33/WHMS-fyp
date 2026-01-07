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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  MoreHorizontal,
  RefreshCcw,
  Search,
  AlertCircle,
  CheckCircle2,
  Clock,
  Pause,
  Play,
  Trash2,
  Eye,
  Calendar,
  DollarSign,
  User,
  Package,
  TrendingUp,
  Filter,
  Download,
  Zap,
  TrendingDown,
  Users,
} from "lucide-react"

/**
 * API Client for Orders - Complete Implementation
 * Matches: Orders Module API Documentation
 */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"

const OrdersAPI = {
  // ========== ADMIN ORDERS ==========

  listOrders: async (filters = {}) => {
    const params = new URLSearchParams()
    if (filters.status) params.append("status", filters.status)
    if (filters.clientId) params.append("clientId", filters.clientId)
    if (filters.limit) params.append("limit", filters.limit)
    if (filters.offset) params.append("offset", filters.offset)

    const response = await fetch(`${API_BASE}/admin/orders?${params}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getAuthToken()}`,
      },
    })
    if (!response.ok) throw new Error("Failed to list orders")
    return response.json()
  },

  getOrder: async (id) => {
    const response = await fetch(`${API_BASE}/admin/orders/${id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getAuthToken()}`,
      },
    })
    if (!response.ok) throw new Error("Failed to fetch order")
    return response.json()
  },

  getStats: async () => {
    const response = await fetch(`${API_BASE}/admin/orders/stats`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getAuthToken()}`,
      },
    })
    if (!response.ok) throw new Error("Failed to fetch stats")
    return response.json()
  },

  // ========== ORDER ACTIONS ==========

  activateOrder: async (id) => {
    const response = await fetch(`${API_BASE}/admin/orders/${id}/activate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getAuthToken()}`,
      },
    })
    if (!response.ok) throw new Error("Failed to activate order")
    return response.json()
  },

  renewOrder: async (id) => {
    const response = await fetch(`${API_BASE}/admin/orders/${id}/renew`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getAuthToken()}`,
      },
    })
    if (!response.ok) throw new Error("Failed to renew order")
    return response.json()
  },

  suspendOrder: async (id) => {
    const response = await fetch(`${API_BASE}/admin/orders/${id}/suspend`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getAuthToken()}`,
      },
    })
    if (!response.ok) throw new Error("Failed to suspend order")
    return response.json()
  },

  resumeOrder: async (id) => {
    const response = await fetch(`${API_BASE}/admin/orders/${id}/resume`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getAuthToken()}`,
      },
    })
    if (!response.ok) throw new Error("Failed to resume order")
    return response.json()
  },

  terminateOrder: async (id) => {
    const response = await fetch(`${API_BASE}/admin/orders/${id}/terminate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getAuthToken()}`,
      },
    })
    if (!response.ok) throw new Error("Failed to terminate order")
    return response.json()
  },
}

function getAuthToken() {
  if (typeof window !== "undefined") {
    return localStorage.getItem("authToken") || ""
  }
  return ""
}

// ============================================================================
// ORDER STATUS HELPERS
// ============================================================================

const ORDER_STATUS_CONFIG = {
  pending: {
    label: "Pending",
    color: "bg-yellow-100 text-yellow-800",
    icon: "⏳",
    actions: ["activate", "view"],
  },
  active: {
    label: "Active",
    color: "bg-green-100 text-green-800",
    icon: "✓",
    actions: ["renew", "suspend", "terminate", "view"],
  },
  suspended: {
    label: "Suspended",
    color: "bg-orange-100 text-orange-800",
    icon: "⏸",
    actions: ["resume", "terminate", "view"],
  },
  terminated: {
    label: "Terminated",
    color: "bg-red-100 text-red-800",
    icon: "✕",
    actions: ["view"],
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-gray-100 text-gray-800",
    icon: "◯",
    actions: ["view"],
  },
}

// ============================================================================
// ENHANCED ADMIN ORDERS PAGE - MAIN COMPONENT
// ============================================================================

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [actionLoading, setActionLoading] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)
  const [activeTab, setActiveTab] = useState("all")

  // Load orders and stats
  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const filters = {}
      if (statusFilter !== "all") filters.status = statusFilter

      const [ordersRes, statsRes] = await Promise.all([
        OrdersAPI.listOrders(filters),
        OrdersAPI.getStats(),
      ])

      setOrders(Array.isArray(ordersRes) ? ordersRes : ordersRes.data || [])
      setStats(statsRes)
    } catch (err) {
      setError(err.message || "Failed to load orders")
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Filter orders based on search
  const filteredOrders = orders.filter((order) => {
    const searchLower = searchTerm.toLowerCase()
    return (
      order.id.toLowerCase().includes(searchLower) ||
      order.clientId.toLowerCase().includes(searchLower) ||
      order.client?.email?.toLowerCase().includes(searchLower) ||
      order.snapshot?.snapshot?.service?.name?.toLowerCase().includes(searchLower)
    )
  })

  // Calculate metrics
  const metrics = {
    totalOrders: orders.length,
    activeRevenue: orders
      .filter((o) => o.status === "active")
      .reduce((sum, o) => sum + parseFloat(o.snapshot?.snapshot?.pricing?.price || 0), 0),
    pendingCount: stats?.pending || 0,
    activeCount: stats?.active || 0,
    suspendedCount: stats?.suspended || 0,
  }

  // ========== ORDER ACTIONS ==========

  const performAction = async (orderId, action) => {
    setActionLoading(`${orderId}-${action}`)
    try {
      let result
      switch (action) {
        case "activate":
          result = await OrdersAPI.activateOrder(orderId)
          break
        case "renew":
          result = await OrdersAPI.renewOrder(orderId)
          break
        case "suspend":
          result = await OrdersAPI.suspendOrder(orderId)
          break
        case "resume":
          result = await OrdersAPI.resumeOrder(orderId)
          break
        case "terminate":
          if (!confirm("Are you sure? This action cannot be reversed.")) {
            setActionLoading(null)
            return
          }
          result = await OrdersAPI.terminateOrder(orderId)
          break
        default:
          return
      }

      setSuccessMessage(`Order ${action}d successfully`)
      await loadData()
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError(err.message || "Action failed")
    } finally {
      setActionLoading(null)
    }
  }

  const openOrderDetails = async (order) => {
    try {
      const fullOrder = await OrdersAPI.getOrder(order.id)
      setSelectedOrder(fullOrder)
      setShowDetailsDialog(true)
    } catch (err) {
      setError(err.message || "Failed to load order details")
    }
  }

  // Export to CSV
  const exportToCSV = () => {
    const headers = ["Order ID", "Client Email", "Service", "Plan", "Status", "Created", "Price"]
    const rows = filteredOrders.map((o) => [
      o.id.substring(0, 8),
      o.client?.email || "Unknown",
      o.snapshot?.snapshot?.service?.name || "Unknown",
      o.snapshot?.snapshot?.plan?.name || "Unknown",
      o.status,
      new Date(o.createdAt).toLocaleDateString(),
      `$${o.snapshot?.snapshot?.pricing?.price || "0.00"}`,
    ])

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `orders-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  // ========== JSX ==========

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
          <p className="text-muted-foreground mt-1">
            Manage client orders and subscriptions ({orders.length} total)
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportToCSV} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={loadData} variant="outline">
            <RefreshCcw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert className="bg-green-100 border-green-200">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          <AlertDescription className="text-green-800">
            {successMessage}
          </AlertDescription>
        </Alert>
      )}

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Total Orders"
          value={metrics.totalOrders}
          subtext={`${metrics.activeCount} active`}
          icon={Package}
          color="bg-blue-100 text-blue-800"
        />
        <MetricCard
          label="Active Orders"
          value={metrics.activeCount}
          subtext={`${metrics.pendingCount} pending activation`}
          icon={Zap}
          color="bg-green-100 text-green-800"
        />
        <MetricCard
          label="Revenue (Active)"
          value={`$${metrics.activeRevenue.toFixed(2)}`}
          subtext={`${metrics.activeCount} subscriptions`}
          icon={TrendingUp}
          color="bg-emerald-100 text-emerald-800"
        />
        <MetricCard
          label="Suspended"
          value={metrics.suspendedCount}
          subtext={`${((metrics.suspendedCount / metrics.totalOrders) * 100).toFixed(1)}% of total`}
          icon={TrendingDown}
          color="bg-orange-100 text-orange-800"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">All Orders ({orders.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({stats?.pending || 0})</TabsTrigger>
          <TabsTrigger value="active">Active ({stats?.active || 0})</TabsTrigger>
          <TabsTrigger value="suspended">Suspended ({stats?.suspended || 0})</TabsTrigger>
          <TabsTrigger value="other">Other ({(stats?.terminated || 0) + (stats?.cancelled || 0)})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <SearchAndFilter
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
          />
          <OrdersTable
            orders={filteredOrders}
            loading={loading}
            onView={openOrderDetails}
            onAction={performAction}
            actionLoading={actionLoading}
          />
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <SearchAndFilter
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            statusFilter="pending"
            setStatusFilter={() => {}}
          />
          <OrdersTable
            orders={orders.filter((o) => o.status === "pending")}
            loading={loading}
            onView={openOrderDetails}
            onAction={performAction}
            actionLoading={actionLoading}
          />
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          <SearchAndFilter
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            statusFilter="active"
            setStatusFilter={() => {}}
          />
          <OrdersTable
            orders={orders.filter((o) => o.status === "active")}
            loading={loading}
            onView={openOrderDetails}
            onAction={performAction}
            actionLoading={actionLoading}
          />
        </TabsContent>

        <TabsContent value="suspended" className="space-y-4">
          <SearchAndFilter
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            statusFilter="suspended"
            setStatusFilter={() => {}}
          />
          <OrdersTable
            orders={orders.filter((o) => o.status === "suspended")}
            loading={loading}
            onView={openOrderDetails}
            onAction={performAction}
            actionLoading={actionLoading}
          />
        </TabsContent>

        <TabsContent value="other" className="space-y-4">
          <OrdersTable
            orders={orders.filter((o) => o.status === "terminated" || o.status === "cancelled")}
            loading={loading}
            onView={openOrderDetails}
            onAction={performAction}
            actionLoading={actionLoading}
          />
        </TabsContent>
      </Tabs>

      {/* Order Details Dialog */}
      <OrderDetailsDialog
        isOpen={showDetailsDialog}
        order={selectedOrder}
        onClose={() => {
          setShowDetailsDialog(false)
          setSelectedOrder(null)
        }}
        onAction={(action) => {
          performAction(selectedOrder.id, action)
          setShowDetailsDialog(false)
        }}
        isLoading={actionLoading?.startsWith(selectedOrder?.id)}
      />
    </div>
  )
}

// ============================================================================
// METRIC CARD COMPONENT
// ============================================================================

function MetricCard({ label, value, subtext, icon: Icon, color }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-3xl font-bold mt-2">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{subtext}</p>
          </div>
          <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg ${color}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// SEARCH AND FILTER COMPONENT
// ============================================================================

function SearchAndFilter({ searchTerm, setSearchTerm, statusFilter, setStatusFilter }) {
  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by order ID, client email, or service..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter || "all"} onValueChange={(value) => setStatusFilter(value === "all" ? "" : value)}>
            <SelectTrigger className="w-40">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="terminated">Terminated</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// ORDERS TABLE COMPONENT
// ============================================================================

function OrdersTable({ orders, loading, onView, onAction, actionLoading }) {
  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </CardContent>
      </Card>
    )
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Package className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No orders found</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="pt-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Renewal</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <OrderRow
                  key={order.id}
                  order={order}
                  onView={() => onView(order)}
                  onAction={(action) => onAction(order.id, action)}
                  isLoading={actionLoading?.startsWith(order.id)}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// ORDER ROW COMPONENT
// ============================================================================

function OrderRow({ order, onView, onAction, isLoading }) {
  const statusConfig = ORDER_STATUS_CONFIG[order.status]
  const serviceName = order.snapshot?.snapshot?.service?.name || "Unknown"
  const planName = order.snapshot?.snapshot?.plan?.name || "Unknown"
  const price = order.snapshot?.snapshot?.pricing?.price || "0.00"
  const clientEmail = order.client?.email || "Unknown"

  const formatDate = (date) => {
    if (!date) return "—"
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const availableActions = statusConfig?.actions || []

  return (
    <TableRow>
      <TableCell className="font-mono text-sm">
        {order.id.substring(0, 8)}...
      </TableCell>
      <TableCell className="max-w-xs">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <div className="overflow-hidden">
            <p className="font-medium truncate text-sm">{clientEmail}</p>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-sm">{serviceName}</TableCell>
      <TableCell className="text-sm">{planName}</TableCell>
      <TableCell className="font-semibold">${price}</TableCell>
      <TableCell>
        <Badge className={statusConfig?.color}>
          {statusConfig?.icon} {statusConfig?.label}
        </Badge>
      </TableCell>
      <TableCell className="text-sm">
        {formatDate(order.createdAt)}
      </TableCell>
      <TableCell className="text-sm">
        {order.status === "active" && order.nextRenewalAt ? (
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3 text-muted-foreground" />
            {formatDate(order.nextRenewalAt)}
          </div>
        ) : (
          "—"
        )}
      </TableCell>
      <TableCell>
        <OrderActionsMenu
          orderId={order.id}
          status={order.status}
          availableActions={availableActions}
          onAction={onAction}
          onView={onView}
          isLoading={isLoading}
        />
      </TableCell>
    </TableRow>
  )
}

// ============================================================================
// ORDER ACTIONS MENU
// ============================================================================

function OrderActionsMenu({
  orderId,
  status,
  availableActions,
  onAction,
  onView,
  isLoading,
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" disabled={isLoading}>
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {availableActions.includes("view") && (
          <>
            <DropdownMenuItem onClick={onView} className="gap-2">
              <Eye className="w-4 h-4" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        {availableActions.includes("activate") && (
          <DropdownMenuItem onClick={() => onAction("activate")} className="gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Activate
          </DropdownMenuItem>
        )}

        {availableActions.includes("renew") && (
          <DropdownMenuItem onClick={() => onAction("renew")} className="gap-2">
            <Calendar className="w-4 h-4" />
            Renew
          </DropdownMenuItem>
        )}

        {availableActions.includes("suspend") && (
          <DropdownMenuItem onClick={() => onAction("suspend")} className="gap-2">
            <Pause className="w-4 h-4" />
            Suspend
          </DropdownMenuItem>
        )}

        {availableActions.includes("resume") && (
          <DropdownMenuItem onClick={() => onAction("resume")} className="gap-2">
            <Play className="w-4 h-4" />
            Resume
          </DropdownMenuItem>
        )}

        {availableActions.includes("terminate") && (
          <DropdownMenuItem
            onClick={() => onAction("terminate")}
            className="text-destructive gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Terminate
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ============================================================================
// ORDER DETAILS DIALOG
// ============================================================================

function OrderDetailsDialog({ isOpen, order, onClose, onAction, isLoading }) {
  if (!order) return null

  const statusConfig = ORDER_STATUS_CONFIG[order.status]
  const availableActions = statusConfig?.actions || []

  const formatDate = (date) => {
    if (!date) return "—"
    return new Date(date).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const snapshot = order.snapshot?.snapshot || {}
  const service = snapshot.service || {}
  const plan = snapshot.plan || {}
  const pricing = snapshot.pricing || {}

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Order Details</DialogTitle>
          <DialogDescription>
            <div className="flex items-center gap-2 mt-2">
              Order ID: <span className="font-mono">{order.id}</span>
              <Badge className={statusConfig?.color}>
                {statusConfig?.label}
              </Badge>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Client Information */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <User className="w-4 h-4" />
              Client Information
            </h3>
            <div className="grid grid-cols-2 gap-4 bg-muted p-4 rounded-lg">
              <div>
                <p className="text-xs text-muted-foreground">Client ID</p>
                <p className="font-mono text-sm">{order.clientId}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm">{order.client?.email || "—"}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Service Information */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Package className="w-4 h-4" />
              Service & Plan
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-xs text-muted-foreground">Service</p>
                <p className="font-medium">{service.name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Code: {service.code}
                </p>
              </div>
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-xs text-muted-foreground">Plan</p>
                <p className="font-medium">{plan.name}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Pricing Information */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Pricing
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-xs text-muted-foreground">Amount</p>
                <p className="text-2xl font-bold">${pricing.price}</p>
              </div>
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-xs text-muted-foreground">Billing Cycle</p>
                <p className="font-medium capitalize">
                  {pricing.cycle?.replace("_", " ") || "—"}
                </p>
              </div>
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-xs text-muted-foreground">Currency</p>
                <p className="font-medium">{pricing.currency}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Timeline */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Timeline
            </h3>
            <div className="space-y-2">
              <TimelineItem label="Created" date={order.createdAt} />
              {order.startedAt && (
                <TimelineItem label="Started" date={order.startedAt} />
              )}
              {order.nextRenewalAt && (
                <TimelineItem label="Next Renewal" date={order.nextRenewalAt} />
              )}
              {order.suspendedAt && (
                <TimelineItem label="Suspended" date={order.suspendedAt} />
              )}
              {order.terminatedAt && (
                <TimelineItem label="Terminated" date={order.terminatedAt} />
              )}
              {order.cancelledAt && (
                <TimelineItem label="Cancelled" date={order.cancelledAt} />
              )}
            </div>
          </div>

          <Separator />

          {/* Actions */}
          {availableActions.length > 1 && (
            <div className="space-y-3">
              <h3 className="font-semibold">Actions</h3>
              <div className="flex flex-wrap gap-2">
                {availableActions.map((action) => {
                  if (action === "view") return null
                  return (
                    <Button
                      key={action}
                      size="sm"
                      variant={action === "terminate" ? "destructive" : "default"}
                      onClick={() => onAction(action)}
                      disabled={isLoading}
                    >
                      {getActionLabel(action)}
                    </Button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// TIMELINE ITEM COMPONENT
// ============================================================================

function TimelineItem({ label, date }) {
  if (!date) return null

  const formatDate = (d) => {
    return new Date(d).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
      <Clock className="w-4 h-4 text-muted-foreground" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{formatDate(date)}</p>
      </div>
    </div>
  )
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getActionLabel(action) {
  const labels = {
    activate: "Activate Order",
    renew: "Renew Order",
    suspend: "Suspend Order",
    resume: "Resume Order",
    terminate: "Terminate Order",
  }
  return labels[action] || action
}