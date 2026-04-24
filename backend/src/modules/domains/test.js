/**
 * DOMAIN MODULE — FINAL DEMO LIFECYCLE TEST
 * SCHEMA-ALIGNED | API-FIRST | SELF-CLEANING
 *
 * Preconditions:
 * - Seeded users exist
 *   - client.test@example.com / ClientPass123!
 *   - superadmin@example.com / SuperAdmin123!
 *
 * Run:
 *   node src/modules/domains/tests/domain.lifecycle.demo.test.js
 */

const axios = require("axios");

// ─────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────
const BASE_URL = process.env.API_BASE_URL || "http://localhost:4000/api";

const CLIENT = {
  email: "client.test@example.com",
  password: "ClientPass123!",
};

const ADMIN = {
  email: "superadmin@example.com",
  password: "SuperAdmin123!",
};

// ─────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────
let CLIENT_TOKEN;
let ADMIN_TOKEN;
let CLIENT_USER_ID;

let DOMAIN_ID;
let DNS_RECORD_IDS = [];

// ─────────────────────────────────────────────
// LOGGING
// ─────────────────────────────────────────────
const log = (m) => console.log(`\n🔹 ${m}`);
const ok = (m) => console.log(`✅ ${m}`);
const warn = (m) => console.log(`⚠️ ${m}`);
const die = (m, e) => {
  console.error(`❌ ${m}`);
  if (e) console.error(e?.response?.data || e.message || e);
  process.exit(1);
};

async function must(promise, label = "request") {
  try {
    return await promise;
  } catch (e) {
    die(`${label} failed`, e);
  }
}

// ─────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────
async function loginClient() {
  const res = await must(
    axios.post(`${BASE_URL}/auth/login`, CLIENT),
    "client login"
  );
  CLIENT_TOKEN = res.data.accessToken;
  CLIENT_USER_ID = res.data.user.id;
  ok(`Client logged in (id=${CLIENT_USER_ID})`);
}

async function loginAdmin() {
  const res = await must(
    axios.post(`${BASE_URL}/auth/login`, ADMIN),
    "admin login"
  );
  ADMIN_TOKEN = res.data.accessToken;
  ok("Admin logged in");
}

// ─────────────────────────────────────────────
// CLEANUP (SAFE)
// ─────────────────────────────────────────────
async function cleanup() {
  log("Cleaning up created records");

  try {
    axios.defaults.headers.common["Authorization"] = `Bearer ${ADMIN_TOKEN}`;

    if (DOMAIN_ID) {
      await axios.delete(`${BASE_URL}/admin/domains/${DOMAIN_ID}`);
      ok("Domain cleaned (status=cancelled)");
    }
  } catch (e) {
    warn("Cleanup encountered a non-fatal issue");
  }
}

// ─────────────────────────────────────────────
// MAIN FLOW
// ─────────────────────────────────────────────
(async function run() {
  console.log("\n======================================");
  console.log(" DOMAIN LIFECYCLE — FINAL DEMO TEST ");
  console.log("======================================\n");

  try {
    // 0) AUTH
    log("Authenticating users");
    await loginClient();
    await loginAdmin();

    axios.defaults.headers.common["Authorization"] = `Bearer ${CLIENT_TOKEN}`;

    // 1) AVAILABILITY
    log("Checking domain availability");
    const avail = await must(
      axios.post(`${BASE_URL}/domains/check`, {
        domain: "demo-domain-final.com",
        registrar: "mock",
      }),
      "availability"
    );
    if (avail.data.available !== true) die("Domain should be available");
    ok("Availability OK");

    // 2) REGISTER DOMAIN
    log("Registering domain");
    const reg = await must(
      axios.post(`${BASE_URL}/domains/register`, {
        domain: "demo-domain-final.com",
        ownerId: CLIENT_USER_ID,
        registrar: "mock",
        years: 1,
        currency: "USD",
        contacts: [
          {
            type: "registrant",
            name: "Client User",
            email: CLIENT.email,
            phone: "+1-555-0000",
            country: "US",
          },
          {
            type: "admin",
            name: "Admin Contact",
            email: "admin@test.com",
            phone: "+1-555-1111",
            country: "US",
          },
        ],
      }),
      "register"
    );
    DOMAIN_ID = reg.data.id;
    ok(`Domain registered (id=${DOMAIN_ID})`);

    // 3) DNS CREATE
    log("Creating DNS records");
    const dns1 = await must(
      axios.post(`${BASE_URL}/domains/${DOMAIN_ID}/dns`, {
        type: "A",
        name: "@",
        value: "1.1.1.1",
        ttl: 300,
      }),
      "dns create A"
    );
    DNS_RECORD_IDS.push(dns1.data.data.id);

    const dns2 = await must(
      axios.post(`${BASE_URL}/domains/${DOMAIN_ID}/dns`, {
        type: "CNAME",
        name: "www",
        value: "example.com",
        ttl: 3600,
      }),
      "dns create CNAME"
    );
    DNS_RECORD_IDS.push(dns2.data.data.id);

    ok("DNS records created");

    // 4) DNS UPDATE
    log("Updating DNS record");
    await must(
      axios.put(
        `${BASE_URL}/domains/${DOMAIN_ID}/dns/${DNS_RECORD_IDS[0]}`,
        { value: "2.2.2.2", ttl: 600 }
      ),
      "dns update"
    );
    ok("DNS updated");

    // 5) DNS DELETE (CLIENT SIDE CLEAN)
    log("Deleting DNS records");
    for (const rid of DNS_RECORD_IDS) {
      await must(
        axios.delete(`${BASE_URL}/domains/${DOMAIN_ID}/dns/${rid}`),
        "dns delete"
      );
    }
    ok("DNS cleaned");

   

    // ───────────────── ADMIN FLOW ─────────────────
    axios.defaults.headers.common["Authorization"] = `Bearer ${ADMIN_TOKEN}`;

    // 7) ADMIN STATS
    log("Admin: fetching stats");
    const stats = await must(
      axios.get(`${BASE_URL}/admin/domains/stats`),
      "admin stats"
    );
    if (typeof stats.data.data.total !== "number")
      die("Stats invalid");
    ok("Admin stats OK");

    // 8) ADMIN RENEW
    log("Admin: renewing domain");
    const renew = await must(
      axios.post(`${BASE_URL}/admin/domains/${DOMAIN_ID}/renew`, {
        years: 1,
        currency: "USD",
      }),
      "admin renew"
    );
    if (renew.data.data.status !== "active")
      die("Renew failed");
    ok("Domain renewed");

    // 9) ADMIN OVERRIDE
    log("Admin: overriding domain");
    const override = await must(
      axios.patch(`${BASE_URL}/admin/domains/${DOMAIN_ID}/override`, {
        changes: { autoRenew: false },
      }),
      "admin override"
    );
    if (override.data.data.autoRenew !== false)
      die("Override failed");
    ok("Override applied");

    // 10) ADMIN SYNC
    log("Admin: syncing domain");
    const sync = await must(
      axios.post(`${BASE_URL}/admin/domains/${DOMAIN_ID}/sync`),
      "admin sync"
    );
    if (!sync.data.data.metadata?.lastSyncedAt)
      die("Sync failed");
    ok("Domain synced");

  } finally {
    // 11) CLEANUP (ALWAYS RUNS)
    await cleanup();
  }

  console.log("\n======================================");
  console.log(" 🎉 DOMAIN LIFECYCLE — DEMO COMPLETE ");
  console.log("======================================\n");

  process.exit(0);
})();
