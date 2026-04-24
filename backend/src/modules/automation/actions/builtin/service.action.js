/**
 * Service Actions
 * ------------------------------------------------------------------
 * Automation actions for the Services module.
 */

module.exports = [
  // ----------------------------------------------------------------
  // service.suspend
  // ----------------------------------------------------------------
  {
    name: "Suspend Service",
    type: "builtin",
    actionType: "service.suspend",
    module: "services",
    description: "Suspend an active client service",
    schema: {
      type: "object",
      required: ["serviceId"],
      properties: {
        serviceId: { type: ["number", "string"], title: "Service ID" },
        reason: { type: "string", title: "Reason", description: "Why the service is being suspended" },
      },
    },
    async execute(meta, context) {
      const { prisma, logger } = context;
      const params = meta.input ?? meta;
      const { serviceId, reason } = params;

      if (!serviceId) throw new Error("serviceId is required");

      const id = Number(serviceId);
      const svc = await prisma.clientService?.findUnique?.({ where: { id } })
        || await prisma.service?.findUnique?.({ where: { id } });
      if (!svc) throw new Error(`Service ${id} not found`);

      const model = prisma.clientService || prisma.service;
      await model.update({
        where: { id },
        data: { status: "suspended", suspendedAt: new Date(), suspendReason: reason || "Suspended via automation" },
      });

      logger.info({ msg: "[service.suspend] Done", serviceId: id });
      return { success: true, serviceId: id, previousStatus: svc.status };
    },
  },

  // ----------------------------------------------------------------
  // service.activate
  // ----------------------------------------------------------------
  {
    name: "Activate Service",
    type: "builtin",
    actionType: "service.activate",
    module: "services",
    description: "Activate or reactivate a service",
    schema: {
      type: "object",
      required: ["serviceId"],
      properties: {
        serviceId: { type: ["number", "string"], title: "Service ID" },
      },
    },
    async execute(meta, context) {
      const { prisma, logger } = context;
      const params = meta.input ?? meta;
      const { serviceId } = params;

      if (!serviceId) throw new Error("serviceId is required");

      const id = Number(serviceId);
      const model = prisma.clientService || prisma.service;
      const svc = await model.findUnique({ where: { id } });
      if (!svc) throw new Error(`Service ${id} not found`);

      await model.update({
        where: { id },
        data: { status: "active", suspendedAt: null, suspendReason: null },
      });

      logger.info({ msg: "[service.activate] Done", serviceId: id });
      return { success: true, serviceId: id, previousStatus: svc.status };
    },
  },

  // ----------------------------------------------------------------
  // service.cancel
  // ----------------------------------------------------------------
  {
    name: "Cancel Service",
    type: "builtin",
    actionType: "service.cancel",
    module: "services",
    description: "Cancel a client service",
    schema: {
      type: "object",
      required: ["serviceId"],
      properties: {
        serviceId: { type: ["number", "string"], title: "Service ID" },
        reason: { type: "string", title: "Cancellation Reason" },
        terminateImmediately: {
          type: "boolean",
          title: "Terminate Immediately",
          description: "If false, cancels at end of billing period",
          default: false,
        },
      },
    },
    async execute(meta, context) {
      const { prisma, logger } = context;
      const params = meta.input ?? meta;
      const { serviceId, reason, terminateImmediately = false } = params;

      if (!serviceId) throw new Error("serviceId is required");

      const id = Number(serviceId);
      const model = prisma.clientService || prisma.service;
      const svc = await model.findUnique({ where: { id } });
      if (!svc) throw new Error(`Service ${id} not found`);

      const data = terminateImmediately
        ? { status: "cancelled", cancelledAt: new Date(), cancelReason: reason || "Cancelled via automation" }
        : { status: "pending_cancellation", cancelReason: reason || "Cancellation requested via automation" };

      await model.update({ where: { id }, data });

      logger.info({ msg: "[service.cancel] Done", serviceId: id, terminateImmediately });
      return { success: true, serviceId: id };
    },
  },

  // ----------------------------------------------------------------
  // service.change_plan
  // ----------------------------------------------------------------
  {
    name: "Change Service Plan",
    type: "builtin",
    actionType: "service.change_plan",
    module: "services",
    description: "Upgrade or downgrade a service to a different plan",
    schema: {
      type: "object",
      required: ["serviceId", "planId"],
      properties: {
        serviceId: { type: ["number", "string"], title: "Service ID" },
        planId: { type: ["number", "string"], title: "New Plan ID" },
      },
    },
    async execute(meta, context) {
      const { prisma, logger } = context;
      const params = meta.input ?? meta;
      const { serviceId, planId } = params;

      if (!serviceId) throw new Error("serviceId is required");
      if (!planId) throw new Error("planId is required");

      const id = Number(serviceId);
      const newPlanId = Number(planId);

      const model = prisma.clientService || prisma.service;
      const svc = await model.findUnique({ where: { id } });
      if (!svc) throw new Error(`Service ${id} not found`);

      const plan = await prisma.servicePlan?.findUnique?.({ where: { id: newPlanId } });
      if (!plan) throw new Error(`Plan ${newPlanId} not found`);

      await model.update({ where: { id }, data: { planId: newPlanId } });

      logger.info({ msg: "[service.change_plan] Done", serviceId: id, newPlanId });
      return { success: true, serviceId: id, previousPlanId: svc.planId, newPlanId };
    },
  },

  // ----------------------------------------------------------------
  // service.renew
  // ----------------------------------------------------------------
  {
    name: "Renew Service",
    type: "builtin",
    actionType: "service.renew",
    module: "services",
    description: "Extend a service's expiry/renewal date by a given number of days",
    schema: {
      type: "object",
      required: ["serviceId"],
      properties: {
        serviceId:   { type: ["number", "string"], title: "Service ID" },
        days:        { type: "number", title: "Extend by (days)", default: 30 },
        renewalDate: { type: "string", title: "Set Exact Renewal Date", description: "ISO date — overrides 'days' if provided" },
      },
    },
    async execute(meta, context) {
      const { prisma, logger } = context;
      const params = meta.input ?? meta;
      const { serviceId, days = 30, renewalDate } = params;
      if (!serviceId) throw new Error("serviceId is required");
      const id = Number(serviceId);
      const model = prisma.clientService || prisma.service;
      const svc = await model.findUnique({ where: { id } });
      if (!svc) throw new Error(`Service ${id} not found`);

      const base = svc.renewsAt || svc.expiresAt || new Date();
      const newDate = renewalDate
        ? new Date(renewalDate)
        : new Date(base.getTime() + Number(days) * 24 * 60 * 60 * 1000);

      await model.update({ where: { id }, data: { renewsAt: newDate, expiresAt: newDate, status: "active" } });

      logger.info({ msg: "[service.renew] Done", serviceId: id, newDate });
      return { success: true, serviceId: id, renewedUntil: newDate.toISOString() };
    },
  },

  // ----------------------------------------------------------------
  // service.set_note
  // ----------------------------------------------------------------
  {
    name: "Set Service Note",
    type: "builtin",
    actionType: "service.set_note",
    module: "services",
    description: "Add or update an internal note on a service",
    schema: {
      type: "object",
      required: ["serviceId", "note"],
      properties: {
        serviceId: { type: ["number", "string"], title: "Service ID" },
        note:      { type: "string", title: "Note Text" },
      },
    },
    async execute(meta, context) {
      const { prisma, logger } = context;
      const params = meta.input ?? meta;
      const { serviceId, note } = params;
      if (!serviceId) throw new Error("serviceId is required");
      if (!note)      throw new Error("note is required");
      const id = Number(serviceId);
      const model = prisma.clientService || prisma.service;
      await model.update({ where: { id }, data: { notes: note } });
      logger.info({ msg: "[service.set_note] Done", serviceId: id });
      return { success: true, serviceId: id };
    },
  },
];
