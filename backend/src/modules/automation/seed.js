/**
 * Automation Seed Script
 * ============================================================
 * Creates real automation profiles (cron) and event-driven workflows
 * for the WHMS system.
 *
 * Run: node src/modules/automation/seed.js
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const API = "http://localhost:4000/api";

// ============================================================
// HELPERS
// ============================================================

function slug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// ============================================================
// AUTOMATION PROFILES  (cron-based, HTTP task actions)
// ============================================================

const PROFILES = [
  {
    name: "Daily Automated Backup",
    description: "Triggers a full system backup every night at 2am.",
    cron: "0 2 * * *",
    enabled: true,
    tasks: [
      {
        actionType: "http_request",
        order: 1,
        actionMeta: {
          url: `${API}/backups`,
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: { name: "Auto Backup", provider: "local", type: "full" },
          timeout: 30000,
        },
      },
    ],
  },
  {
    name: "Weekly Service Health Check",
    description: "Checks all active services every Monday morning at 8am.",
    cron: "0 8 * * 1",
    enabled: true,
    tasks: [
      {
        actionType: "http_request",
        order: 1,
        actionMeta: {
          url: `${API}/admin/services`,
          method: "GET",
          headers: { "Content-Type": "application/json" },
          timeout: 15000,
        },
      },
    ],
  },
  {
    name: "Monthly Invoice Run",
    description: "Triggers recurring billing cycle on the 1st of every month at 9am.",
    cron: "0 9 1 * *",
    enabled: true,
    tasks: [
      {
        actionType: "http_request",
        order: 1,
        actionMeta: {
          url: `${API}/admin/billing/invoices/generate-recurring`,
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: { type: "recurring" },
          timeout: 60000,
        },
      },
    ],
  },
  {
    name: "Daily Expired Session Cleanup",
    description: "Purges expired sessions and stale tokens every morning at 3am.",
    cron: "0 3 * * *",
    enabled: true,
    tasks: [
      {
        actionType: "http_request",
        order: 1,
        actionMeta: {
          url: `${API}/auth/sessions/cleanup`,
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: { olderThanDays: 30 },
          timeout: 15000,
        },
      },
    ],
  },
];

// ============================================================
// EVENT-DRIVEN WORKFLOWS
// ============================================================

const WORKFLOWS = [
  // ----------------------------------------------------------
  // 1. NEW ORDER → PROVISION SERVICE
  // ----------------------------------------------------------
  {
    name: "Order Provisioning",
    slug: "order-provisioning",
    description: "Automatically provisions the service when a new order is placed and payment is confirmed.",
    trigger: "event",
    type: "sequential",
    eventType: "order.created",
    enabled: true,
    definition: {
      name: "Order Provisioning",
      version: 1,
      tasks: [
        {
          id: "log-order",
          type: "action",
          actionType: "echo",
          input: { message: "New order received — starting provisioning" },
        },
        {
          id: "provision-service",
          type: "action",
          actionType: "http_request",
          input: {
            url: `${API}/admin/orders/{{input.orderId}}/provision`,
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: { triggeredBy: "automation", source: "order.created" },
          },
          timeout: 30000,
          retry: { times: 3, delayMs: 5000 },
          onError: { fallback: "notify-provision-failure" },
        },
        {
          id: "notify-provision-failure",
          type: "action",
          actionType: "echo",
          input: { message: "Provisioning failed for order {{input.orderId}} — manual intervention needed" },
        },
      ],
    },
    triggerEvents: ["order.created"],
  },

  // ----------------------------------------------------------
  // 2. PAYMENT RECEIVED → ACTIVATE / RENEW SERVICE
  // ----------------------------------------------------------
  {
    name: "Payment Activation",
    slug: "payment-activation",
    description: "Activates or renews a service immediately after a payment is successfully received.",
    trigger: "event",
    type: "sequential",
    eventType: "payment.received",
    enabled: true,
    definition: {
      name: "Payment Activation",
      version: 1,
      tasks: [
        {
          id: "check-payment",
          type: "action",
          actionType: "echo",
          input: { message: "Payment received for invoice {{input.invoiceId}}" },
        },
        {
          id: "activate-service",
          type: "action",
          actionType: "http_request",
          input: {
            url: `${API}/admin/billing/invoices/{{input.invoiceId}}/mark-paid`,
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: { automatedActivation: true },
          },
          timeout: 15000,
          retry: { times: 2, delayMs: 3000 },
        },
      ],
    },
    triggerEvents: ["payment.received"],
  },

  // ----------------------------------------------------------
  // 3. SERVICE EXPIRING SOON → WARNING EMAIL SEQUENCE
  // ----------------------------------------------------------
  {
    name: "Service Expiry Warning",
    slug: "service-expiry-warning",
    description: "Sends staged warnings (7-day and 1-day) before a service expires.",
    trigger: "event",
    type: "sequential",
    eventType: "service.expiring",
    enabled: true,
    definition: {
      name: "Service Expiry Warning",
      version: 1,
      tasks: [
        {
          id: "check-days",
          type: "condition",
          condition: "input.daysRemaining <= 7",
          onTrue: "send-7day-warning",
        },
        {
          id: "send-7day-warning",
          type: "action",
          actionType: "echo",
          input: {
            message: "EXPIRY WARNING: Service {{input.serviceName}} for client {{input.clientEmail}} expires in {{input.daysRemaining}} days",
          },
        },
      ],
    },
    triggerEvents: ["service.expiring"],
  },

  // ----------------------------------------------------------
  // 4. FAILED PAYMENT → DUNNING SEQUENCE
  // ----------------------------------------------------------
  {
    name: "Failed Payment Dunning",
    slug: "failed-payment-dunning",
    description: "Initiates the dunning process when a payment fails — suspends after 3 attempts.",
    trigger: "event",
    type: "sequential",
    eventType: "payment.failed",
    enabled: true,
    definition: {
      name: "Failed Payment Dunning",
      version: 1,
      tasks: [
        {
          id: "log-failure",
          type: "action",
          actionType: "echo",
          input: { message: "Payment failed for invoice {{input.invoiceId}} — attempt {{input.attemptNumber}}" },
        },
        {
          id: "check-attempt",
          type: "condition",
          condition: "input.attemptNumber >= 3",
          onTrue: "suspend-service",
          onFalse: "schedule-retry",
        },
        {
          id: "suspend-service",
          type: "action",
          actionType: "http_request",
          input: {
            url: `${API}/admin/services/{{input.serviceId}}/suspend`,
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: { reason: "non_payment", automatedBy: "dunning-workflow" },
          },
          timeout: 15000,
        },
        {
          id: "schedule-retry",
          type: "action",
          actionType: "echo",
          input: { message: "Scheduling payment retry for invoice {{input.invoiceId}}" },
        },
      ],
    },
    triggerEvents: ["payment.failed"],
  },

  // ----------------------------------------------------------
  // 5. NEW CLIENT REGISTRATION → ONBOARDING SEQUENCE
  // ----------------------------------------------------------
  {
    name: "Client Onboarding",
    slug: "client-onboarding",
    description: "Runs onboarding tasks when a new client registers: creates billing profile and sends welcome notification.",
    trigger: "event",
    type: "sequential",
    eventType: "client.registered",
    enabled: true,
    definition: {
      name: "Client Onboarding",
      version: 1,
      tasks: [
        {
          id: "log-signup",
          type: "action",
          actionType: "echo",
          input: { message: "New client registered: {{input.email}}" },
        },
        {
          id: "create-billing-profile",
          type: "action",
          actionType: "http_request",
          input: {
            url: `${API}/admin/billing/profiles`,
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: { userId: "{{input.userId}}", currency: "USD", billingCycle: "monthly" },
          },
          timeout: 10000,
          retry: { times: 2, delayMs: 2000 },
        },
        {
          id: "welcome-log",
          type: "action",
          actionType: "echo",
          input: { message: "Onboarding complete for {{input.email}}" },
        },
      ],
    },
    triggerEvents: ["client.registered"],
  },
];

// ============================================================
// SEED FUNCTIONS
// ============================================================

async function seedProfiles() {
  console.log("\n🔧 Creating Automation Profiles...");

  for (const profileDef of PROFILES) {
    const existing = await prisma.automationProfile.findFirst({
      where: { name: profileDef.name },
    });

    if (existing) {
      console.log(`  ⏭  Skipped (exists): ${profileDef.name}`);
      continue;
    }

    const profile = await prisma.automationProfile.create({
      data: {
        name: profileDef.name,
        description: profileDef.description,
        cron: profileDef.cron,
        enabled: profileDef.enabled,
      },
    });

    for (const task of profileDef.tasks) {
      await prisma.automationTask.create({
        data: {
          profileId: profile.id,
          actionType: task.actionType,
          actionMeta: task.actionMeta,
          order: task.order,
        },
      });
    }

    console.log(`  ✅  Created: ${profileDef.name} (cron: ${profileDef.cron})`);
  }
}

async function seedWorkflows() {
  console.log("\n⚙️  Creating Event-Driven Workflows...");

  for (const wf of WORKFLOWS) {
    const existing = await prisma.automationWorkflow.findFirst({
      where: { slug: wf.slug },
    });

    if (existing) {
      console.log(`  ⏭  Skipped (exists): ${wf.name}`);
      continue;
    }

    const workflow = await prisma.automationWorkflow.create({
      data: {
        name: wf.name,
        slug: wf.slug,
        description: wf.description,
        trigger: wf.trigger,
        type: wf.type,
        eventType: wf.eventType,
        definition: wf.definition,
        enabled: wf.enabled,
        version: 1,
      },
    });

    // Create trigger rules
    for (const eventType of (wf.triggerEvents || [])) {
      await prisma.workflowTriggerRule.upsert({
        where: { workflowId_eventType: { workflowId: workflow.id, eventType } },
        create: {
          workflowId: workflow.id,
          eventType,
          enabled: true,
          passEventAsInput: true,
        },
        update: { enabled: true },
      });
    }

    console.log(`  ✅  Created: ${wf.name} (trigger: ${wf.eventType})`);
  }
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log("🌱 WHMS Automation Seed");
  console.log("=".repeat(50));

  await seedProfiles();
  await seedWorkflows();

  const profileCount = await prisma.automationProfile.count();
  const workflowCount = await prisma.automationWorkflow.count();
  const triggerCount = await prisma.workflowTriggerRule.count();

  console.log("\n📊 Summary:");
  console.log(`   Automation Profiles : ${profileCount}`);
  console.log(`   Workflows           : ${workflowCount}`);
  console.log(`   Trigger Rules       : ${triggerCount}`);
  console.log("\n✅ Done.\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
