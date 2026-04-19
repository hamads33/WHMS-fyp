"use client"

import { useEffect, useState, useCallback } from "react"
import { usePermissions } from "@/hooks/usePermissions"
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
  Radio,
  ShoppingCart,
} from "lucide-react"
import { AdminOrdersAPI } from "@/lib/api/orders"

// ============================================================================
// ORDER STATUS HELPERS
// ============================================================================

const ORDER_STATUS_CONFIG = {
  pending: {
    label: "Pending",
    color: "bg-muted text-muted-foreground",
    icon: "⏳",
    actions: ["activate", "view"],
  },
  active: {
    label: "Active",
    color: "bg-accent text-accent-foreground",
    icon: "✓",
    actions: ["renew", "suspend", "terminate", "view"],
  },
  suspended: {
    label: "Suspended",
    color: "bg-muted text-muted-foreground",
    icon: "⏸",
    actions: ["resume", "terminate", "view"],
  },
  terminated: {
    label: "Terminated",
    color: "text-destructive",
    icon: "✕",
    actions: ["view"],
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-muted text-muted-foreground",
    icon: "◯",
    actions: ["view"],
  },
}

// ============================================================================
// ENHANCED ADMIN ORDERS PAGE - MAIN COMPONENT
// ============================================================================

export default function AdminOrdersPage() {
  const { canManageOrders } = usePermissions()
  const [orders, setOrders] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [actionLoading, setActionLoading] = useState(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
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
        AdminOrdersAPI.listOrders(filters),
        AdminOrdersAPI.getOrderStats(),
      ])

      setOrders(ordersRes.orders || [])
      setStats(statsRes.stats)
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
      order.snapshot?.service?.name?.toLowerCase().includes(searchLower)
    )
  })

  // Calculate metrics
  const metrics = {
    totalOrders: orders.length,
    activeRevenue: orders
      .filter((o) => o.status === "active")
      .reduce((sum, o) => sum + parseFloat(o.snapshot?.pricing?.price || 0), 0),
    pendingCount: stats?.pending || 0,
    activeCount: stats?.active || 0,
    suspendedCount: stats?.suspended || 0,
  }

  // Derived safe values
  const suspendedPct = metrics.totalOrders > 0
    ? ((metrics.suspendedCount / metrics.totalOrders) * 100).toFixed(1)
    : "0.0"

  // ========== ORDER ACTIONS ==========

  const performAction = async (orderId, action) => {
    setActionLoading(`${orderId}-${action}`)
    try {
      let result
      switch (action) {
        case "activate":
          result = await AdminOrdersAPI.activateOrder(orderId)
          break
        case "renew":
          result = await AdminOrdersAPI.renewOrder(orderId)
          break
        case "suspend":
          result = await AdminOrdersAPI.suspendOrder(orderId)
          break
        case "resume":
          result = await AdminOrdersAPI.resumeOrder(orderId)
          break
        case "terminate":
          if (!confirm("Are you sure? This action cannot be reversed.")) {
            setActionLoading(null)
            return
          }
          result = await AdminOrdersAPI.terminateOrder(orderId)
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
    setDetailsLoading(true)
    setError(null)
    try {
      const fullOrder = await AdminOrdersAPI.getOrder(order.id)
      setSelectedOrder(fullOrder)
      setShowDetailsDialog(true)
    } catch (err) {
      setError(err.message || "Failed to load order details")
    } finally {
      setDetailsLoading(false)
    }
  }

  // Export to CSV
  const exportToCSV = () => {
    const headers = ["Order ID", "Client Email", "Service", "Plan", "Status", "Created", "Price"]
    const rows = filteredOrders.map((o) => [
      o.id.substring(0, 8),
      o.client?.email || "Unknown",
      o.snapshot?.service?.name || "Unknown",
      o.snapshot?.planData?.name || "Unknown",
      o.status,
      new Date(o.createdAt).toLocaleDateString(),
      `$${o.snapshot?.pricing?.price || "0.00"}`,
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl border border-border bg-primary flex items-center justify-center shadow-sm shrink-0">
            <ShoppingCart className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 mb-0.5">
              <h1 className="text-2xl font-bold text-foreground tracking-tight">Orders</h1>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border border-border bg-secondary text-foreground">
                <Radio className="h-2.5 w-2.5" /> {metrics.activeCount} active
              </span>
            </div>
            <p className="text-sm text-muted-foreground">Client subscriptions &amp; service order management</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 p-1.5 rounded-xl border border-border bg-card shadow-sm shrink-0">
          <Button onClick={exportToCSV} variant="ghost" size="sm" className="gap-1.5 h-8 text-xs">
            <Download className="w-3.5 h-3.5" /> Export
          </Button>
          <div className="h-5 w-px bg-border" />
          <Button onClick={loadData} variant="ghost" size="sm" className="gap-1.5 h-8 text-xs">
            <RefreshCcw className="w-3.5 h-3.5" /> Refresh
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
        <Alert className="bg-secondary border-border">
          <CheckCircle2 className="w-4 h-4 text-foreground" />
          <AlertDescription className="text-foreground">{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* Key Metrics */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Total Orders"     value={metrics.totalOrders}                    subtext={`${metrics.activeCount} active`}             icon={Package}    />
        <MetricCard label="Active Orders"    value={metrics.activeCount}                    subtext={`${metrics.pendingCount} pending activation`} icon={Zap}        />
        <MetricCard label="Revenue (Active)" value={`$${metrics.activeRevenue.toFixed(2)}`} subtext={`${metrics.activeCount} subscriptions`}      icon={TrendingUp} />
        <MetricCard label="Suspended"        value={metrics.suspendedCount}                 subtext={`${suspendedPct}% of total`}                  icon={TrendingDown} destructive={metrics.suspendedCount > 0} />
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
            detailsLoading={detailsLoading}
            canManageOrders={canManageOrders}
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
            detailsLoading={detailsLoading}
            canManageOrders={canManageOrders}
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
            detailsLoading={detailsLoading}
            canManageOrders={canManageOrders}
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
            detailsLoading={detailsLoading}
            canManageOrders={canManageOrders}
          />
        </TabsContent>

        <TabsContent value="other" className="space-y-4">
          <OrdersTable
            orders={orders.filter((o) => o.status === "terminated" || o.status === "cancelled")}
            loading={loading}
            onView={openOrderDetails}
            onAction={performAction}
            actionLoading={actionLoading}
            detailsLoading={detailsLoading}
            canManageOrders={canManageOrders}
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

function MetricCard({ label, value, subtext, icon: Icon, destructive }) {
  return (
    <div className="flex flex-col gap-2 px-4 py-3.5 rounded-2xl border border-border bg-card shadow-sm transition-all hover:shadow-md hover:-translate-y-px">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{label}</p>
        <div className="p-1.5 rounded-lg bg-secondary border border-border">
          <Icon className="w-3.5 h-3.5 text-foreground" />
        </div>
      </div>
      <p className={`text-3xl font-bold tracking-tight leading-none ${destructive ? "text-destructive" : "text-foreground"}`}>{value}</p>
      {subtext && <p className="text-[11px] text-muted-foreground">{subtext}</p>}
    </div>
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

function OrdersTable({ orders, loading, onView, onAction, actionLoading, detailsLoading, canManageOrders }) {
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
                  detailsLoading={detailsLoading}
                  canManageOrders={canManageOrders}
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

function OrderRow({ order, onView, onAction, isLoading, detailsLoading, canManageOrders }) {
  const statusConfig = ORDER_STATUS_CONFIG[order.status]
  const serviceName = order.snapshot?.service?.name || "Unknown"
  const planName = order.snapshot?.planData?.name || "Unknown"
  const price = order.snapshot?.pricing?.price || "0.00"
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
          isLoading={isLoading || detailsLoading}
          canManageOrders={canManageOrders}
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
  canManageOrders,
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" disabled={isLoading}>
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onView} className="gap-2">
          <Eye className="w-4 h-4" />
          View Details
        </DropdownMenuItem>

        {canManageOrders && (
          <>
            <DropdownMenuSeparator />
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
          </>
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

  const snapshot = order.snapshot || {}
  const service = snapshot.service || {}
  const plan = snapshot.planData || {}
  const pricing = snapshot.pricing || {}

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Order Details</DialogTitle>
          <DialogDescription asChild>
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