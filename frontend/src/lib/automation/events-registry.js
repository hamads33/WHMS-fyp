/**
 * Frontend mirror of backend/src/modules/automation/registry/events.registry.js
 * Used as the primary source in the workflow builder — no API call required.
 */

export const EVENTS_REGISTRY = {
  auth: {
    label: "Authentication",
    icon: "Shield",
    color: "blue",
    events: [
      { type: "auth.register",           label: "User Registered",      description: "A new user completed registration",           payload: { userId: "number", email: "string", name: "string", role: "string" } },
      { type: "auth.login.success",      label: "Login Succeeded",      description: "A user logged in successfully",                payload: { userId: "number", email: "string", ip: "string", userAgent: "string" } },
      { type: "auth.login.failure",      label: "Login Failed",         description: "A login attempt was rejected",                 payload: { email: "string", ip: "string", reason: "string" } },
      { type: "auth.logout",             label: "User Logged Out",      description: "A user ended their session",                   payload: { userId: "number", sessionId: "string" } },
      { type: "auth.email.verified",     label: "Email Verified",       description: "A user verified their email address",          payload: { userId: "number", email: "string" } },
      { type: "auth.password.reset",     label: "Password Reset",       description: "A user reset their password",                  payload: { userId: "number", email: "string", ip: "string" } },
      { type: "auth.impersonation.start","label": "Impersonation Started","description": "Admin began impersonating a user",         payload: { adminId: "number", targetUserId: "number", targetEmail: "string" } },
      { type: "auth.impersonation.stop", label: "Impersonation Ended",  description: "Admin stopped impersonating a user",           payload: { adminId: "number", targetUserId: "number" } },
      { type: "security.new_device",     label: "New Device Login",     description: "Login from an unrecognized device",            payload: { userId: "number", email: "string", ip: "string", userAgent: "string" } },
    ],
  },

  orders: {
    label: "Orders",
    icon: "ShoppingCart",
    color: "orange",
    events: [
      { type: "order.created",        label: "Order Created",        description: "A new order was placed",                      payload: { orderId: "number", clientId: "number", total: "number", status: "string", items: "array" } },
      { type: "order.status_changed", label: "Order Status Changed", description: "An order's status was updated",               payload: { orderId: "number", clientId: "number", previousStatus: "string", newStatus: "string" } },
      { type: "order.paid",           label: "Order Paid",           description: "Payment received for an order",               payload: { orderId: "number", clientId: "number", amount: "number", paymentMethod: "string" } },
      { type: "order.cancelled",      label: "Order Cancelled",      description: "An order was cancelled",                      payload: { orderId: "number", clientId: "number", reason: "string" } },
      { type: "order.refunded",       label: "Order Refunded",       description: "A refund was issued",                         payload: { orderId: "number", clientId: "number", amount: "number", reason: "string" } },
      { type: "order.completed",      label: "Order Completed",      description: "An order was fulfilled and completed",        payload: { orderId: "number", clientId: "number" } },
    ],
  },

  billing: {
    label: "Billing",
    icon: "CreditCard",
    color: "green",
    events: [
      { type: "invoice.created",       label: "Invoice Created",       description: "A new invoice was generated",                payload: { invoiceId: "string", clientId: "number", amount: "number", dueDate: "string" } },
      { type: "invoice.sent",          label: "Invoice Sent",          description: "Invoice was emailed to the client",          payload: { invoiceId: "string", clientId: "number", email: "string" } },
      { type: "invoice.paid",          label: "Invoice Paid",          description: "A payment was received against an invoice",  payload: { invoiceId: "string", clientId: "number", amount: "number", paidAt: "string" } },
      { type: "invoice.overdue",       label: "Invoice Overdue",       description: "Invoice passed its due date unpaid",         payload: { invoiceId: "string", clientId: "number", amount: "number", daysPastDue: "number" } },
      { type: "invoice.voided",        label: "Invoice Voided",        description: "An invoice was voided",                      payload: { invoiceId: "string", clientId: "number" } },
      { type: "payment.received",      label: "Payment Received",      description: "A payment was processed successfully",       payload: { paymentId: "string", clientId: "number", amount: "number", method: "string" } },
      { type: "payment.failed",        label: "Payment Failed",        description: "A payment attempt failed",                   payload: { clientId: "number", amount: "number", error: "string", method: "string" } },
      { type: "subscription.renewed",  label: "Subscription Renewed",  description: "A recurring subscription was renewed",       payload: { subscriptionId: "string", clientId: "number", amount: "number" } },
      { type: "subscription.cancelled","label": "Subscription Cancelled","description": "A subscription was cancelled",           payload: { subscriptionId: "string", clientId: "number", reason: "string" } },
    ],
  },

  services: {
    label: "Services",
    icon: "Server",
    color: "purple",
    events: [
      { type: "service.created",       label: "Service Created",      description: "A new service was added to the catalog",      payload: { serviceId: "number", name: "string", planId: "number" } },
      { type: "service.activated",     label: "Service Activated",    description: "A client's service was activated",            payload: { serviceId: "number", clientId: "number", serviceName: "string" } },
      { type: "service.suspended",     label: "Service Suspended",    description: "A client's service was suspended",            payload: { serviceId: "number", clientId: "number", reason: "string" } },
      { type: "service.cancelled",     label: "Service Cancelled",    description: "A client's service was cancelled",            payload: { serviceId: "number", clientId: "number" } },
      { type: "service.plan_changed",  label: "Plan Changed",         description: "Client changed their service plan",           payload: { serviceId: "number", clientId: "number", oldPlanId: "number", newPlanId: "number" } },
      { type: "service.renewal_due",   label: "Renewal Due",          description: "A service is approaching renewal date",       payload: { serviceId: "number", clientId: "number", daysUntilRenewal: "number", renewalDate: "string" } },
      { type: "service.expiry_warning","label": "Service Expiry Warning","description": "Service will expire soon",               payload: { serviceId: "number", clientId: "number", expiresAt: "string", daysRemaining: "number" } },
    ],
  },

  provisioning: {
    label: "Provisioning",
    icon: "Cpu",
    color: "cyan",
    events: [
      { type: "provisioning.started",   label: "Provisioning Started",   description: "Service provisioning job began",           payload: { jobId: "string", serviceId: "number", clientId: "number", provider: "string" } },
      { type: "provisioning.completed", label: "Provisioning Completed", description: "Service was successfully provisioned",     payload: { jobId: "string", serviceId: "number", clientId: "number", credentials: "object" } },
      { type: "provisioning.failed",    label: "Provisioning Failed",    description: "Service provisioning encountered an error",payload: { jobId: "string", serviceId: "number", clientId: "number", error: "string" } },
    ],
  },

  support: {
    label: "Support",
    icon: "MessageSquare",
    color: "yellow",
    events: [
      { type: "ticket.created",         label: "Ticket Created",         description: "A new support ticket was submitted",       payload: { ticketId: "number", clientId: "number", subject: "string", priority: "string", department: "string" } },
      { type: "ticket.reply_added",     label: "Reply Added",            description: "A reply was posted to a ticket",           payload: { ticketId: "number", clientId: "number", authorId: "number", authorRole: "string" } },
      { type: "ticket.status_changed",  label: "Ticket Status Changed",  description: "A ticket's status was updated",            payload: { ticketId: "number", previousStatus: "string", newStatus: "string" } },
      { type: "ticket.priority_changed","label": "Priority Changed",     "description": "A ticket's priority was updated",        payload: { ticketId: "number", previousPriority: "string", newPriority: "string" } },
      { type: "ticket.assigned",        label: "Ticket Assigned",        description: "A ticket was assigned to an agent",        payload: { ticketId: "number", agentId: "number", agentName: "string" } },
      { type: "ticket.closed",          label: "Ticket Closed",          description: "A support ticket was closed",              payload: { ticketId: "number", clientId: "number", resolutionTime: "number" } },
      { type: "ticket.sla_breached",    label: "SLA Breached",           description: "A ticket exceeded its SLA response time",  payload: { ticketId: "number", priority: "string", hoursOverdue: "number" } },
      { type: "chat.started",           label: "Live Chat Started",      description: "A client initiated a live chat session",   payload: { chatId: "string", clientId: "number", department: "string" } },
      { type: "chat.missed",            label: "Chat Missed",            description: "A live chat went unanswered",              payload: { chatId: "string", clientId: "number", waitTime: "number" } },
    ],
  },

  backup: {
    label: "Backups",
    icon: "HardDrive",
    color: "gray",
    events: [
      { type: "backup.queued",          label: "Backup Queued",          description: "A backup job was queued",                  payload: { backupId: "string", name: "string", provider: "string" } },
      { type: "backup.started",         label: "Backup Started",         description: "A backup job began executing",             payload: { backupId: "string", name: "string", provider: "string" } },
      { type: "backup.success",         label: "Backup Succeeded",       description: "A backup completed successfully",          payload: { backupId: "string", name: "string", sizeMb: "number", duration: "number" } },
      { type: "backup.failed",          label: "Backup Failed",          description: "A backup job encountered an error",        payload: { backupId: "string", name: "string", error: "string" } },
      { type: "backup.restore.success", label: "Restore Succeeded",      description: "A backup was successfully restored",       payload: { backupId: "string", name: "string" } },
      { type: "backup.restore.failed",  label: "Restore Failed",         description: "A backup restore encountered an error",    payload: { backupId: "string", error: "string" } },
    ],
  },

  domains: {
    label: "Domains",
    icon: "Globe",
    color: "indigo",
    events: [
      { type: "domain.synced",          label: "Domain Synced",          description: "Registrar data was synced into WHMS",                 payload: { domainId: "number", domain: "string", registrar: "string", changes: "object" } },
      { type: "domain.expiry_changed",  label: "Domain Expiry Changed",  description: "A domain expiry date changed during sync",            payload: { domainId: "number", domain: "string", previousExpiryDate: "string", newExpiryDate: "string" } },
      { type: "domain.status_changed",  label: "Domain Status Changed",  description: "A domain status changed during sync",                 payload: { domainId: "number", domain: "string", previousStatus: "string", newStatus: "string" } },
      { type: "domain.sync_failed",     label: "Domain Sync Failed",     description: "Registrar sync failed for a domain",                  payload: { domainId: "number", domain: "string", registrar: "string", error: "string" } },
    ],
  },

  websites: {
    label: "Websites",
    icon: "LayoutTemplate",
    color: "pink",
    events: [
      { type: "website.created",              label: "Website Requested",            description: "A website provisioning request was created",  payload: { websiteId: "number", domain: "string", status: "string", userId: "string" } },
      { type: "website.provisioned",          label: "Website Provisioned",          description: "Website provisioning succeeded",               payload: { websiteId: "number", domain: "string", status: "string", userId: "string" } },
      { type: "website.provisioning_failed",  label: "Website Provisioning Failed",  description: "Website provisioning failed",                  payload: { websiteId: "number", domain: "string", status: "string", userId: "string", error: "string" } },
    ],
  },

  infrastructure: {
    label: "Infrastructure",
    icon: "ServerCog",
    color: "slate",
    events: [
      { type: "server.created",         label: "Server Created",         description: "A new infrastructure node was added",            payload: { serverId: "number", name: "string", type: "string", status: "string" } },
      { type: "server.status_changed",  label: "Server Status Changed",  description: "Server state changed",                           payload: { serverId: "number", name: "string", previousStatus: "string", newStatus: "string", error: "string" } },
      { type: "server.recovered",       label: "Server Recovered",       description: "An offline server recovered",                    payload: { serverId: "number", name: "string", previousStatus: "string", newStatus: "string" } },
      { type: "server.high_cpu",        label: "Server High CPU",        description: "A monitored server crossed the CPU threshold",  payload: { serverId: "number", name: "string", cpuUsage: "number", threshold: "number" } },
    ],
  },

  clients: {
    label: "Clients",
    icon: "Users",
    color: "indigo",
    events: [
      { type: "client.created",     label: "Client Created",     description: "A new client profile was created",           payload: { clientId: "number", email: "string", name: "string", company: "string" } },
      { type: "client.updated",     label: "Client Updated",     description: "Client profile details were changed",         payload: { clientId: "number", changedFields: "array" } },
      { type: "client.suspended",   label: "Client Suspended",   description: "A client account was suspended",              payload: { clientId: "number", reason: "string" } },
      { type: "client.reactivated", label: "Client Reactivated", description: "A suspended client was reactivated",          payload: { clientId: "number" } },
    ],
  },
}

export function getAllEvents() {
  return Object.entries(EVENTS_REGISTRY).flatMap(([module, group]) =>
    group.events.map((e) => ({ ...e, module, moduleLabel: group.label }))
  )
}

export function findEventDef(eventType) {
  if (!eventType) return null
  for (const [, group] of Object.entries(EVENTS_REGISTRY)) {
    const found = group.events.find((e) => e.type === eventType)
    if (found) return found
  }
  return null
}
