/**
 * Server Management Seed Script
 * ============================================================
 * Seeds realistic mock data for servers, groups, accounts,
 * logs, and metric history.
 *
 * Run: node src/modules/server-management/seed.js
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// ── Helpers ──────────────────────────────────────────────────

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min, max, decimals = 1) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function hoursAgo(h) {
  return new Date(Date.now() - h * 60 * 60 * 1000);
}

function minutesAgo(m) {
  return new Date(Date.now() - m * 60 * 1000);
}

// ── Groups ───────────────────────────────────────────────────

const GROUPS = [
  { name: "Production",  description: "Live customer-facing infrastructure" },
  { name: "Staging",     description: "Pre-production validation environment" },
  { name: "Development", description: "Internal dev and QA servers" },
];

// ── Servers ──────────────────────────────────────────────────

const SERVERS_TEMPLATE = [
  {
    name: "cPanel Primary",
    hostname: "cpanel1.whms.io",
    ipAddress: "203.0.113.10",
    type: "mock-cpanel",
    status: "active",
    tags: ["primary", "production"],
    groupKey: "Production",
    capabilities: { ssl: true, backups: true, docker: false, nodejs: false, python: false, email: true },
  },
  {
    name: "cPanel Secondary",
    hostname: "cpanel2.whms.io",
    ipAddress: "203.0.113.11",
    type: "mock-cpanel",
    status: "active",
    tags: ["secondary", "production"],
    groupKey: "Production",
    capabilities: { ssl: true, backups: true, docker: false, nodejs: false, python: false, email: true },
  },
  {
    name: "VPS Node Alpha",
    hostname: "vps-alpha.whms.io",
    ipAddress: "198.51.100.20",
    type: "mock-vps",
    status: "active",
    tags: ["vps", "nodejs"],
    groupKey: "Production",
    capabilities: { ssl: true, backups: false, docker: true, nodejs: true, python: true, email: false },
  },
  {
    name: "Cloud Instance A",
    hostname: "cloud-a.whms.io",
    ipAddress: "192.0.2.30",
    type: "mock-cloud",
    status: "maintenance",
    tags: ["cloud", "staging"],
    groupKey: "Staging",
    capabilities: { ssl: true, backups: true, docker: true, nodejs: true, python: true, email: false },
  },
  {
    name: "Cloud Instance B",
    hostname: "cloud-b.whms.io",
    ipAddress: "192.0.2.31",
    type: "mock-cloud",
    status: "active",
    tags: ["cloud", "staging"],
    groupKey: "Staging",
    capabilities: { ssl: true, backups: true, docker: true, nodejs: true, python: false, email: false },
  },
  {
    name: "Dev VPS",
    hostname: "dev-vps.whms.io",
    ipAddress: "10.0.0.50",
    type: "mock-vps",
    status: "offline",
    tags: ["dev", "internal"],
    groupKey: "Development",
    capabilities: { ssl: false, backups: false, docker: true, nodejs: true, python: true, email: false },
  },
];

// ── Log templates ────────────────────────────────────────────

const LOG_ACTIONS = [
  { action: "SERVER_CREATED",      message: "Server registered and online." },
  { action: "CONNECTION_TESTED",   message: "Connection test passed — latency 12ms." },
  { action: "CONNECTION_TESTED",   message: "Connection test passed — latency 8ms." },
  { action: "SERVER_UPDATED",      message: "Capabilities updated by admin." },
  { action: "ACCOUNT_PROVISIONED", message: "New hosting account created: example.com" },
  { action: "ACCOUNT_SUSPENDED",   message: "Account suspended: overdue payment." },
  { action: "CONNECTION_TESTED",   message: "Connection test passed — latency 15ms." },
  { action: "SERVER_UPDATED",      message: "Server moved to maintenance window." },
];

// ── Main seed ────────────────────────────────────────────────

async function main() {
  console.log("🌱  Seeding server management data...\n");

  // 1. Groups
  console.log("  Creating server groups...");
  const groupMap = {};
  for (const g of GROUPS) {
    const group = await prisma.serverGroup.upsert({
      where:  { name: g.name },
      update: {},
      create: { name: g.name, description: g.description },
    });
    groupMap[g.name] = group.id;
    console.log(`    ✔ Group: ${g.name}`);
  }

  // 2. Servers
  console.log("\n  Creating servers...");
  const createdServers = [];
  for (const s of SERVERS_TEMPLATE) {
    const existing = await prisma.server.findFirst({ where: { hostname: s.hostname } });
    let server;
    if (existing) {
      server = await prisma.server.update({
        where: { id: existing.id },
        data: {
          name:         s.name,
          ipAddress:    s.ipAddress,
          type:         s.type,
          status:       s.status,
          tags:         s.tags,
          capabilities: s.capabilities,
          groupId:      groupMap[s.groupKey] ?? null,
        },
      });
      console.log(`    ↺ Updated: ${s.name}`);
    } else {
      server = await prisma.server.create({
        data: {
          name:         s.name,
          hostname:     s.hostname,
          ipAddress:    s.ipAddress,
          type:         s.type,
          status:       s.status,
          tags:         s.tags,
          capabilities: s.capabilities,
          groupId:      groupMap[s.groupKey] ?? null,
        },
      });
      console.log(`    ✔ Created: ${s.name}`);
    }
    createdServers.push(server);
  }

  // 3. Logs per server
  console.log("\n  Creating activity logs...");
  for (const server of createdServers) {
    // Delete old seeded logs to keep it clean on re-run
    await prisma.serverLog.deleteMany({ where: { serverId: server.id } });

    const count = rand(3, 6);
    for (let i = 0; i < count; i++) {
      const tmpl = LOG_ACTIONS[rand(0, LOG_ACTIONS.length - 1)];
      await prisma.serverLog.create({
        data: {
          serverId:  server.id,
          action:    tmpl.action,
          message:   tmpl.message,
          createdAt: hoursAgo(rand(1, 48)),
        },
      });
    }
    console.log(`    ✔ Logs for: ${server.name}`);
  }

  // 4. Metric history — 24 data points (one per hour for the last 24h)
  console.log("\n  Creating metric history (24h x 6 servers)...");
  for (const server of createdServers) {
    // Remove old metrics to avoid duplicates on re-run
    await prisma.serverMetric.deleteMany({ where: { serverId: server.id } });

    // Base values differ per server type to look realistic
    const baseCpu  = server.type === "mock-cloud" ? rand(15, 35) : rand(25, 55);
    const baseRam  = rand(30, 65);
    const baseDisk = server.type === "mock-cpanel" ? rand(40, 75) : rand(20, 50);

    const points = 24;
    for (let i = points; i >= 0; i--) {
      const spike = i === 6 || i === 14; // simulate two spikes during the day
      await prisma.serverMetric.create({
        data: {
          serverId:   server.id,
          cpuUsage:   Math.min(99, randFloat(baseCpu + (spike ? 25 : -5), baseCpu + (spike ? 40 : 10))),
          ramUsage:   Math.min(99, randFloat(baseRam - 5, baseRam + 10)),
          diskUsage:  Math.min(99, randFloat(baseDisk, baseDisk + 3)),
          latency:    rand(4, 30),
          uptime:     rand(99900, 100000), // seconds (~1–2 days)
          recordedAt: hoursAgo(i),
        },
      });
    }
    console.log(`    ✔ Metrics for: ${server.name}`);
  }

  // 5. Find a client user to attach accounts to
  console.log("\n  Creating hosted accounts...");
  const clientUser = await prisma.user.findFirst({
    where: { roles: { some: { role: { name: "client" } } } },
  });

  if (!clientUser) {
    console.log("    ⚠  No client user found — skipping account seeding.");
    console.log("       Create a client user first, then re-run this seed.");
  } else {
    const DOMAINS = [
      "acme.com", "globex.io", "initech.net", "umbrella.co", "hooli.tech",
      "piedpiper.dev", "bluth.com", "dunder.biz", "vehement.capital", "grayson.io",
    ];
    const activeServers = createdServers.filter(s => s.status === "active");
    let domainIdx = 0;

    for (const server of activeServers) {
      const accountCount = rand(2, 4);
      for (let j = 0; j < accountCount; j++) {
        const domain = DOMAINS[domainIdx % DOMAINS.length];
        domainIdx++;

        const existing = await prisma.serverManagedAccount.findFirst({
          where: { serverId: server.id, domain },
        });
        if (!existing) {
          await prisma.serverManagedAccount.create({
            data: {
              serverId:        server.id,
              userId:          clientUser.id,
              domain,
              status:          j === 0 ? "active" : (j === 1 ? "active" : "suspended"),
              diskLimitMB:     rand(5120, 20480),
              bandwidthLimitMB: rand(51200, 204800),
              databaseLimit:   rand(5, 20),
              emailLimit:      rand(10, 50),
              diskUsedMB:      rand(512, 4096),
              bandwidthUsedMB: rand(1024, 30720),
              databaseUsed:    rand(1, 8),
              emailUsed:       rand(2, 15),
            },
          });
          console.log(`    ✔ Account ${domain} → ${server.name}`);
        }
      }
    }
  }

  // 6. Provisioning jobs
  console.log("\n  Creating provisioning jobs...");
  await prisma.provisioningJob.deleteMany({
    where: { serverId: { in: createdServers.map(s => s.id) } },
  });

  const JOB_SCENARIOS = [
    // completed jobs
    { type: "create_account",    status: "completed", attempts: 1, lastError: null,                       minsAgo: 180 },
    { type: "create_account",    status: "completed", attempts: 1, lastError: null,                       minsAgo: 95  },
    { type: "suspend_account",   status: "completed", attempts: 1, lastError: null,                       minsAgo: 60  },
    { type: "create_account",    status: "completed", attempts: 2, lastError: null,                       minsAgo: 45  },
    // failed jobs
    { type: "create_account",    status: "failed",    attempts: 3, lastError: "Connection timeout after 30s",    minsAgo: 30  },
    { type: "terminate_account", status: "failed",    attempts: 2, lastError: "SSH auth failed: invalid key",    minsAgo: 20  },
    { type: "suspend_account",   status: "failed",    attempts: 1, lastError: "cPanel API returned HTTP 503",    minsAgo: 15  },
    // active jobs
    { type: "create_account",    status: "running",   attempts: 1, lastError: null,                       minsAgo: 2   },
    { type: "create_account",    status: "pending",   attempts: 0, lastError: null,                       minsAgo: 1   },
  ];

  const serverPool = createdServers;
  for (let i = 0; i < JOB_SCENARIOS.length; i++) {
    const sc     = JOB_SCENARIOS[i];
    const server = serverPool[i % serverPool.length];
    const ts     = minutesAgo(sc.minsAgo);
    await prisma.provisioningJob.create({
      data: {
        serverId:    server.id,
        type:        sc.type,
        payload:     { domain: `job-domain-${i + 1}.io`, userId: clientUser?.id ?? "unknown" },
        status:      sc.status,
        attempts:    sc.attempts,
        lastError:   sc.lastError,
        completedAt: sc.status === "completed" ? ts : null,
        createdAt:   ts,
        updatedAt:   ts,
      },
    });
    console.log(`    ✔ Job [${sc.status}] ${sc.type} → ${server.name}`);
  }

  console.log("\n✅  Server management seed complete!\n");
  console.log("  Summary:");
  console.log(`    ${GROUPS.length} server groups`);
  console.log(`    ${SERVERS_TEMPLATE.length} servers`);
  console.log(`    ${SERVERS_TEMPLATE.length * 25} metric data points`);
  console.log(`    ${JOB_SCENARIOS.length} provisioning jobs`);
  console.log("    Activity logs per server");
}

main()
  .catch((e) => { console.error("❌  Seed failed:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
