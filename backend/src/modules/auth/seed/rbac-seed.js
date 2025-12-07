// src/modules/auth/rbac/rbac-seed.js
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const prisma = require("../../../../prisma/index");

/**
 * Load JSON safely (fallback if file missing)
 */
function loadJSON(relativePath, fallback = []) {
  const fullPath = path.join(__dirname, relativePath);

  if (fs.existsSync(fullPath)) {
    try {
      return JSON.parse(fs.readFileSync(fullPath, "utf8"));
    } catch (err) {
      console.error(`❌ Failed to parse JSON file: ${fullPath}`, err);
      return fallback;
    }
  }

  return fallback;
}

async function seedRBAC() {
  console.log("🔄 Seeding RBAC...");

  //
  // 1. Load roles (JSON OR fallback)
  //
  const roles = loadJSON("../rbac/roles.json", [
    { name: "superadmin", description: "Full system access" },
    { name: "admin", description: "Admin portal access" },
    { name: "staff", description: "Limited admin portal access" },
    { name: "client", description: "Client portal access" },
    { name: "reseller", description: "Reseller portal access" },
    { name: "developer", description: "Marketplace developer" }
  ]);

  //
  // 2. Load permissions (JSON OR fallback)
  //
  const permissions = loadJSON("../rbac/permissions.json", [
    { key: "impersonation.start", description: "Start impersonating a user" },
    { key: "impersonation.stop", description: "Stop impersonation" },
    { key: "apikey.create", description: "Create API keys" },
    { key: "apikey.revoke", description: "Revoke API keys" },
    { key: "portal.admin.access", description: "Access admin portal" },
    { key: "portal.reseller.access", description: "Access reseller portal" },
    { key: "portal.developer.access", description: "Access developer portal" }
  ]);

  //
  // 3. Upsert roles
  //
  for (const r of roles) {
    await prisma.role.upsert({
      where: { name: r.name },
      update: { description: r.description },
      create: {
        name: r.name,
        description: r.description
      }
    });
  }

  //
  // 4. Upsert permissions
  //
  for (const p of permissions) {
    await prisma.permission.upsert({
      where: { key: p.key },
      update: { description: p.description },
      create: p
    });
  }

  //
  // 5. Permission linking helper
  //
  async function link(roleName, permKeys) {
    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) {
      console.warn(`⚠ Role not found: ${roleName}`);
      return;
    }

    for (const key of permKeys) {
      const perm = await prisma.permission.findUnique({ where: { key } });

      if (!perm) {
        console.warn(`⚠ Permission not found: ${key}`);
        continue;
      }

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: perm.id
          }
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: perm.id
        }
      });
    }
  }

  //
  // 6. Determine mapping mode (fallback vs roles.json permissions)
  //
  const rolesHavePerms = roles.some(r => Array.isArray(r.permissions));

  if (!rolesHavePerms) {
    console.log("ℹ Using fallback permission mapping");

    await link("superadmin", permissions.map(p => p.key));
    await link("admin", [
      "impersonation.start",
      "impersonation.stop",
      "apikey.create",
      "portal.admin.access"
    ]);
    await link("staff", ["portal.admin.access"]);
    await link("client", []);
    await link("reseller", ["portal.reseller.access"]);
    await link("developer", ["portal.developer.access", "apikey.create"]);
  } else {
    console.log("ℹ Using permissions from roles.json");
    for (const r of roles) {
      await link(r.name, r.permissions || []);
    }
  }

  console.log("✅ RBAC seeded successfully!");
}

// Export so Jest & server can use it
module.exports = { seedRBAC };

//
// If run from CLI → execute seeding
//
if (require.main === module) {
  seedRBAC()
    .then(() => {
      console.log("🏁 Done.");
      process.exit(0);
    })
    .catch(err => {
      console.error("❌ RBAC seeding error:", err);
      process.exit(1);
    });
}
