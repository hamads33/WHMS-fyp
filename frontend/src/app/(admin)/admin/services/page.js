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
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
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
  MoreHorizontal,
  Plus,
  RefreshCcw,
  Search,
  AlertCircle,
  Edit2,
  Trash2,
  DollarSign,
  Package,
  Archive,
  Copy,
  Power,
  TrendingUp,
  Calendar,
  CheckCircle2,
  XCircle,
} from "lucide-react"

/**
 * API Client for Services - Complete Implementation
 * Matches: Services Module API Documentation
 */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api"

const ServicesAPI = {
  // ========== SERVICES ==========

  listServices: async () => {
    const response = await fetch(`${API_BASE}/admin/services`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getAuthToken()}`,
      },
    })
    if (!response.ok) throw new Error("Failed to list services")
    return response.json()
  },

  getService: async (id) => {
    const response = await fetch(`${API_BASE}/admin/services/${id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getAuthToken()}`,
      },
    })
    if (!response.ok) throw new Error("Failed to fetch service")
    return response.json()
  },

  createService: async (data) => {
    const response = await fetch(`${API_BASE}/admin/services`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Failed to create service")
    }
    return response.json()
  },

  updateService: async (id, data) => {
    const response = await fetch(`${API_BASE}/admin/services/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error("Failed to update service")
    return response.json()
  },

  deactivateService: async (id) => {
    const response = await fetch(`${API_BASE}/admin/services/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getAuthToken()}`,
      },
    })
    if (!response.ok) throw new Error("Failed to deactivate service")
    return response.json()
  },

  // ========== PLANS ==========

  createPlan: async (serviceId, data) => {
    const response = await fetch(`${API_BASE}/admin/services/${serviceId}/plans`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Failed to create plan")
    }
    return response.json()
  },

  updatePlan: async (planId, data) => {
    const response = await fetch(`${API_BASE}/admin/plans/${planId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error("Failed to update plan")
    return response.json()
  },

  togglePlanStatus: async (planId) => {
    const response = await fetch(`${API_BASE}/admin/plans/${planId}/toggle-status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getAuthToken()}`,
      },
    })
    if (!response.ok) throw new Error("Failed to toggle plan status")
    return response.json()
  },

  activatePlan: async (planId) => {
    const response = await fetch(`${API_BASE}/admin/plans/${planId}/activate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getAuthToken()}`,
      },
    })
    if (!response.ok) throw new Error("Failed to activate plan")
    return response.json()
  },

  deactivatePlan: async (planId) => {
    const response = await fetch(`${API_BASE}/admin/plans/${planId}/deactivate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getAuthToken()}`,
      },
    })
    if (!response.ok) throw new Error("Failed to deactivate plan")
    return response.json()
  },

  // ========== PRICING ==========

  createPricing: async (planId, data) => {
    const response = await fetch(`${API_BASE}/admin/plans/${planId}/pricing`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Failed to create pricing")
    }
    return response.json()
  },

  updatePricing: async (pricingId, data) => {
    const response = await fetch(`${API_BASE}/admin/pricing/${pricingId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error("Failed to update pricing")
    return response.json()
  },

  deletePricing: async (pricingId) => {
    const response = await fetch(`${API_BASE}/admin/pricing/${pricingId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getAuthToken()}`,
      },
    })
    if (!response.ok) throw new Error("Failed to delete pricing")
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
// ADMIN SERVICES PAGE - MAIN COMPONENT
// ============================================================================

export default function AdminServicesPage() {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [expandedServiceId, setExpandedServiceId] = useState(null)

  // Dialogs
  const [showServiceDialog, setShowServiceDialog] = useState(false)
  const [showPlanDialog, setShowPlanDialog] = useState(false)
  const [showPricingDialog, setShowPricingDialog] = useState(false)

  // Editing state
  const [selectedService, setSelectedService] = useState(null)
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [selectedPricing, setSelectedPricing] = useState(null)
  const [formData, setFormData] = useState({})
  const [actionLoading, setActionLoading] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)

  // Load services
  const loadServices = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await ServicesAPI.listServices()
      setServices(Array.isArray(res) ? res : res.data || [])
    } catch (err) {
      setError(err.message || "Failed to load services")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadServices()
  }, [loadServices])

  // Filter services
  const filteredServices = services.filter((service) => {
    return (
      service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (service.description || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    )
  })

  // ========== SERVICE OPERATIONS ==========

  const handleCreateService = async () => {
    if (!formData.code || !formData.name || !formData.description) {
      setError("All fields are required")
      return
    }

    setActionLoading("service")
    try {
      await ServicesAPI.createService(formData)
      setSuccessMessage("Service created successfully")
      await loadServices()
      setShowServiceDialog(false)
      setFormData({})
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError(err.message || "Failed to create service")
    } finally {
      setActionLoading(null)
    }
  }

  const handleUpdateService = async () => {
    if (!selectedService) return

    setActionLoading("service-update")
    try {
      await ServicesAPI.updateService(selectedService.id, formData)
      setSuccessMessage("Service updated successfully")
      await loadServices()
      setShowServiceDialog(false)
      setFormData({})
      setSelectedService(null)
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError(err.message || "Failed to update service")
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeactivateService = async (serviceId) => {
    if (!confirm("Are you sure? This will deactivate the service.")) return

    setActionLoading(`deactivate-${serviceId}`)
    try {
      await ServicesAPI.deactivateService(serviceId)
      setSuccessMessage("Service deactivated successfully")
      await loadServices()
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError(err.message || "Failed to deactivate service")
    } finally {
      setActionLoading(null)
    }
  }

  // ========== PLAN OPERATIONS ==========

  const handleCreatePlan = async () => {
    if (!selectedService || !formData.name) {
      setError("Plan name is required")
      return
    }

    setActionLoading("plan")
    try {
      await ServicesAPI.createPlan(selectedService.id, formData)
      setSuccessMessage("Plan created successfully")
      await loadServices()
      setShowPlanDialog(false)
      setFormData({})
      setSelectedPlan(null)
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError(err.message || "Failed to create plan")
    } finally {
      setActionLoading(null)
    }
  }

  const handleUpdatePlan = async () => {
    if (!selectedPlan) return

    setActionLoading("plan-update")
    try {
      await ServicesAPI.updatePlan(selectedPlan.id, formData)
      setSuccessMessage("Plan updated successfully")
      await loadServices()
      setShowPlanDialog(false)
      setFormData({})
      setSelectedPlan(null)
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError(err.message || "Failed to update plan")
    } finally {
      setActionLoading(null)
    }
  }

  const handleTogglePlanStatus = async (planId) => {
    setActionLoading(`toggle-${planId}`)
    try {
      await ServicesAPI.togglePlanStatus(planId)
      setSuccessMessage("Plan status updated successfully")
      await loadServices()
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError(err.message || "Failed to toggle plan status")
    } finally {
      setActionLoading(null)
    }
  }

  // ========== PRICING OPERATIONS ==========

  const handleCreatePricing = async () => {
    if (!selectedPlan || !formData.cycle || !formData.price) {
      setError("Billing cycle and price are required")
      return
    }

    setActionLoading("pricing")
    try {
      await ServicesAPI.createPricing(selectedPlan.id, {
        cycle: formData.cycle,
        price: parseFloat(formData.price),
        currency: formData.currency || "USD",
      })
      setSuccessMessage("Pricing created successfully")
      await loadServices()
      setShowPricingDialog(false)
      setFormData({})
      setSelectedPricing(null)
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError(err.message || "Failed to create pricing")
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeletePricing = async (pricingId) => {
    if (!confirm("Delete this pricing?")) return

    setActionLoading(`delete-pricing-${pricingId}`)
    try {
      await ServicesAPI.deletePricing(pricingId)
      setSuccessMessage("Pricing deleted successfully")
      await loadServices()
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError(err.message || "Failed to delete pricing")
    } finally {
      setActionLoading(null)
    }
  }

  // ========== DIALOG HANDLERS ==========

  const openServiceDialog = (service = null) => {
    if (service) {
      setSelectedService(service)
      setFormData({
        code: service.code,
        name: service.name,
        description: service.description,
        active: service.active,
      })
    } else {
      setSelectedService(null)
      setFormData({
        code: "",
        name: "",
        description: "",
        active: true,
      })
    }
    setShowServiceDialog(true)
  }

  const openPlanDialog = (service, plan = null) => {
    setSelectedService(service)
    if (plan) {
      setSelectedPlan(plan)
      setFormData({
        name: plan.name,
        description: plan.description,
        position: plan.position || 0,
      })
    } else {
      setSelectedPlan(null)
      setFormData({
        name: "",
        description: "",
        position: 0,
      })
    }
    setShowPlanDialog(true)
  }

  const openPricingDialog = (service, plan) => {
    setSelectedService(service)
    setSelectedPlan(plan)
    setFormData({
      cycle: "monthly",
      price: "",
      currency: "USD",
    })
    setShowPricingDialog(true)
  }

  // ========== JSX ==========

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Services</h1>
          <p className="text-muted-foreground mt-1">
            Manage hosting services, plans, and pricing
          </p>
        </div>
        <Button onClick={() => openServiceDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          New Service
        </Button>
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

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, code, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Services List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredServices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No services found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredServices.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              isExpanded={expandedServiceId === service.id}
              onToggleExpand={(id) =>
                setExpandedServiceId(
                  expandedServiceId === id ? null : id
                )
              }
              onEdit={openServiceDialog}
              onDeactivate={handleDeactivateService}
              onAddPlan={openPlanDialog}
              onEditPlan={openPlanDialog}
              onAddPricing={openPricingDialog}
              onTogglePlanStatus={handleTogglePlanStatus}
              onDeletePricing={handleDeletePricing}
              actionLoading={actionLoading}
            />
          ))}
        </div>
      )}

      {/* Service Dialog */}
      <ServiceDialog
        isOpen={showServiceDialog}
        service={selectedService}
        formData={formData}
        onFormChange={setFormData}
        onSave={selectedService ? handleUpdateService : handleCreateService}
        onClose={() => {
          setShowServiceDialog(false)
          setSelectedService(null)
          setFormData({})
        }}
        isLoading={actionLoading?.startsWith("service")}
      />

      {/* Plan Dialog */}
      <PlanDialog
        isOpen={showPlanDialog}
        plan={selectedPlan}
        service={selectedService}
        formData={formData}
        onFormChange={setFormData}
        onSave={selectedPlan ? handleUpdatePlan : handleCreatePlan}
        onClose={() => {
          setShowPlanDialog(false)
          setSelectedPlan(null)
          setFormData({})
        }}
        isLoading={actionLoading?.startsWith("plan")}
      />

      {/* Pricing Dialog */}
      <PricingDialog
        isOpen={showPricingDialog}
        plan={selectedPlan}
        formData={formData}
        onFormChange={setFormData}
        onSave={handleCreatePricing}
        onClose={() => {
          setShowPricingDialog(false)
          setSelectedPlan(null)
          setFormData({})
        }}
        isLoading={actionLoading === "pricing"}
      />
    </div>
  )
}

// ============================================================================
// SERVICE CARD COMPONENT
// ============================================================================

function ServiceCard({
  service,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDeactivate,
  onAddPlan,
  onEditPlan,
  onAddPricing,
  onTogglePlanStatus,
  onDeletePricing,
  actionLoading,
}) {
  const totalPlans = service.plans?.length || 0
  const activePlans = service.plans?.filter((p) => p.active).length || 0

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 cursor-pointer" onClick={() => onToggleExpand(service.id)}>
            <div className="flex items-center gap-3 mb-2">
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                {service.name}
              </CardTitle>
              <Badge
                variant="outline"
                className={
                  service.active
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800"
                }
              >
                {service.active ? "Active" : "Inactive"}
              </Badge>
            </div>
            <CardDescription>{service.description}</CardDescription>
            <p className="text-xs text-muted-foreground mt-2">
              Code: <span className="font-mono font-semibold">{service.code}</span>
            </p>
          </div>

          <ServiceMenu
            service={service}
            onEdit={() => onEdit(service)}
            onDeactivate={() => onDeactivate(service.id)}
            isLoading={actionLoading?.startsWith(service.id)}
          />
        </div>
      </CardHeader>

      {/* Expanded Content */}
      {isExpanded && (
        <>
          <Separator />
          <CardContent className="pt-6 space-y-6">
            {/* Plans Section */}
            <PlansSection
              service={service}
              onAddPlan={() => onAddPlan(service)}
              onEditPlan={(plan) => onEditPlan(service, plan)}
              onAddPricing={(plan) => onAddPricing(service, plan)}
              onTogglePlanStatus={onTogglePlanStatus}
              onDeletePricing={onDeletePricing}
              actionLoading={actionLoading}
            />

            {/* Service Stats */}
            <div className="border-t pt-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Total Plans</p>
                  <p className="text-2xl font-bold">{totalPlans}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Active Plans</p>
                  <p className="text-2xl font-bold text-green-600">{activePlans}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="text-xs font-mono">
                    {new Date(service.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </>
      )}
    </Card>
  )
}

// ============================================================================
// SERVICE MENU (Dropdown)
// ============================================================================

function ServiceMenu({ service, onEdit, onDeactivate, isLoading }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" disabled={isLoading}>
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit} className="gap-2">
          <Edit2 className="w-4 h-4" />
          Edit Service
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={onDeactivate}
          className="text-destructive gap-2"
        >
          <Archive className="w-4 h-4" />
          Deactivate
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ============================================================================
// PLANS SECTION
// ============================================================================

function PlansSection({
  service,
  onAddPlan,
  onEditPlan,
  onAddPricing,
  onTogglePlanStatus,
  onDeletePricing,
  actionLoading,
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">
          Plans ({service.plans?.length || 0})
        </h3>
        <Button size="sm" variant="outline" onClick={onAddPlan}>
          <Plus className="w-4 h-4 mr-1" />
          Add Plan
        </Button>
      </div>

      {!service.plans || service.plans.length === 0 ? (
        <div className="text-center py-6 bg-muted/30 rounded-lg">
          <p className="text-sm text-muted-foreground">No plans yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {service.plans.map((plan) => (
            <PlanRow
              key={plan.id}
              plan={plan}
              onEdit={() => onEditPlan(plan)}
              onAddPricing={() => onAddPricing(plan)}
              onToggleStatus={() => onTogglePlanStatus(plan.id)}
              onDeletePricing={onDeletePricing}
              isLoading={actionLoading?.startsWith(plan.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// PLAN ROW COMPONENT
// ============================================================================

function PlanRow({
  plan,
  onEdit,
  onAddPricing,
  onToggleStatus,
  onDeletePricing,
  isLoading,
}) {
  return (
    <div className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-medium text-sm">{plan.name}</p>
            <Badge
              variant="outline"
              size="sm"
              className={
                plan.active
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-800"
              }
            >
              {plan.active ? "Active" : "Inactive"}
            </Badge>
          </div>
          {plan.description && (
            <p className="text-xs text-muted-foreground">{plan.description}</p>
          )}
        </div>
        <PlanMenu
          plan={plan}
          onEdit={onEdit}
          onToggleStatus={onToggleStatus}
          isLoading={isLoading}
        />
      </div>

      {/* Pricing Section */}
      <div className="space-y-2 mt-4">
        {plan.pricing && plan.pricing.length > 0 ? (
          <div className="space-y-1">
            {plan.pricing.map((price) => (
              <PricingRow
                key={price.id}
                pricing={price}
                onDelete={() => onDeletePricing(price.id)}
                isLoading={actionLoading?.startsWith(`delete-pricing-${price.id}`)}
              />
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">No pricing set</p>
        )}
      </div>

      <Button
        size="sm"
        variant="outline"
        className="w-full mt-3"
        onClick={onAddPricing}
      >
        <Plus className="w-3 h-3 mr-1" />
        Add Pricing
      </Button>
    </div>
  )
}

// ============================================================================
// PLAN MENU (Dropdown)
// ============================================================================

function PlanMenu({ plan, onEdit, onToggleStatus, isLoading }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" disabled={isLoading}>
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit} className="gap-2">
          <Edit2 className="w-4 h-4" />
          Edit Plan
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onToggleStatus} className="gap-2">
          <Power className="w-4 h-4" />
          {plan.active ? "Deactivate" : "Activate"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ============================================================================
// PRICING ROW
// ============================================================================

function PricingRow({ pricing, onDelete, isLoading }) {
  const formatPrice = (amount) => {
    if (!amount) return "$0.00"
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: pricing.currency || "USD",
    }).format(amount)
  }

  const getCycleName = (cycle) => {
    const cycles = {
      monthly: "Monthly",
      quarterly: "Quarterly",
      semi_annually: "Semi-Annual",
      annually: "Annual",
    }
    return cycles[cycle] || cycle
  }

  return (
    <div className="flex items-center justify-between text-xs bg-muted px-3 py-2 rounded">
      <div className="flex items-center gap-2">
        <Calendar className="w-3 h-3 text-muted-foreground" />
        <span className="text-muted-foreground">{getCycleName(pricing.cycle)}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-semibold flex items-center gap-1">
          <DollarSign className="w-3 h-3" />
          {formatPrice(pricing.price)}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          disabled={isLoading}
          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  )
}

// ============================================================================
// DIALOGS
// ============================================================================

function ServiceDialog({
  isOpen,
  service,
  formData,
  onFormChange,
  onSave,
  onClose,
  isLoading,
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{service ? "Edit Service" : "Create Service"}</DialogTitle>
          <DialogDescription>
            {service
              ? "Update service details"
              : "Add a new service to your catalog"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="code">Service Code</Label>
            <Input
              id="code"
              placeholder="e.g., shared_hosting"
              value={formData.code || ""}
              onChange={(e) => onFormChange({ ...formData, code: e.target.value })}
              disabled={isLoading || !!service}
              maxLength={50}
            />
            <p className="text-xs text-muted-foreground">
              3-50 characters, alphanumeric with _ and -
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Service Name</Label>
            <Input
              id="name"
              placeholder="e.g., Shared Hosting"
              value={formData.name || ""}
              onChange={(e) => onFormChange({ ...formData, name: e.target.value })}
              disabled={isLoading}
              maxLength={255}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe the service..."
              rows={3}
              value={formData.description || ""}
              onChange={(e) =>
                onFormChange({ ...formData, description: e.target.value })
              }
              disabled={isLoading}
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground">
              {(formData.description || "").length}/1000
            </p>
          </div>

          {service && (
            <div className="space-y-2">
              <Label htmlFor="active">Status</Label>
              <Select
                value={formData.active ? "active" : "inactive"}
                onValueChange={(value) =>
                  onFormChange({ ...formData, active: value === "active" })
                }
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Service"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PlanDialog({
  isOpen,
  plan,
  service,
  formData,
  onFormChange,
  onSave,
  onClose,
  isLoading,
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{plan ? "Edit Plan" : "Create Plan"}</DialogTitle>
          <DialogDescription>
            {service && `for ${service.name}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="plan-name">Plan Name</Label>
            <Input
              id="plan-name"
              placeholder="e.g., Basic, Professional, Enterprise"
              value={formData.name || ""}
              onChange={(e) => onFormChange({ ...formData, name: e.target.value })}
              disabled={isLoading}
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground">
              2-100 characters, unique per service
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan-description">Description</Label>
            <Textarea
              id="plan-description"
              placeholder="Who is this plan for?"
              rows={2}
              value={formData.description || ""}
              onChange={(e) =>
                onFormChange({ ...formData, description: e.target.value })
              }
              disabled={isLoading}
              maxLength={500}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="position">Display Position</Label>
            <Input
              id="position"
              type="number"
              min="0"
              value={formData.position || 0}
              onChange={(e) =>
                onFormChange({ ...formData, position: parseInt(e.target.value) })
              }
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Lower numbers appear first
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Plan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PricingDialog({
  isOpen,
  plan,
  formData,
  onFormChange,
  onSave,
  onClose,
  isLoading,
}) {
  const billingCycles = [
    { value: "monthly", label: "Monthly" },
    { value: "quarterly", label: "Quarterly" },
    { value: "semi_annually", label: "Semi-Annual" },
    { value: "annually", label: "Annual" },
  ]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Pricing</DialogTitle>
          <DialogDescription>
            {plan && `for ${plan.name} plan`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="billing-cycle">Billing Cycle</Label>
            <Select
              value={formData.cycle || "monthly"}
              onValueChange={(value) =>
                onFormChange({ ...formData, cycle: value })
              }
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {billingCycles.map((cycle) => (
                  <SelectItem key={cycle.value} value={cycle.value}>
                    {cycle.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Price</Label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">$</span>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                placeholder="9.99"
                value={formData.price || ""}
                onChange={(e) =>
                  onFormChange({ ...formData, price: e.target.value })
                }
                disabled={isLoading}
                className="flex-1"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Minimum 2 decimal places (e.g., 9.99)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Select
              value={formData.currency || "USD"}
              onValueChange={(value) =>
                onFormChange({ ...formData, currency: value })
              }
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="GBP">GBP</SelectItem>
                <SelectItem value="CAD">CAD</SelectItem>
                <SelectItem value="AUD">AUD</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={isLoading}>
            {isLoading ? "Creating..." : "Add Pricing"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}