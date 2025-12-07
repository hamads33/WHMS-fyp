// prisma/seed.js
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

// All permissions from your permission.json
const ALL_PERMISSIONS = [
  { key: "admin.access", description: "Access admin portal" },
  { key: "admin.manage.staff", description: "Manage admin staff accounts" },
  { key: "admin.settings.update", description: "Update system settings" },
  { key: "client.area.access", description: "Access client dashboard" },
  { key: "billing.invoices.view", description: "View invoices" },
  { key: "billing.invoices.pay", description: "Pay invoices" },
  { key: "reseller.dashboard.access", description: "Access reseller dashboard" },
  { key: "developer.console.access", description: "Access developer console" },
  { key: "plugins.upload", description: "Upload new plugin to marketplace" },
  { key: "plugins.update", description: "Update existing plugin versions" }
];

async function main() {
  console.log("🌱 Seeding SUPERADMIN...");

  // -------------------------------------------------
  // 1) Create SUPERADMIN Role
  // -------------------------------------------------
  const superadminRole = await prisma.role.upsert({
    where: { name: "superadmin" },
    update: {},
    create: {
      name: "superadmin",
      description: "System super administrator"
    }
  });

  // -------------------------------------------------
  // 2) Create ALL permissions
  // -------------------------------------------------
  for (const perm of ALL_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: perm.key },
      update: {},
      create: {
        key: perm.key,
        description: perm.description
      }
    });
  }

  // -------------------------------------------------
  // 3) Assign ALL permissions to SUPERADMIN
  // -------------------------------------------------
  const permissions = await prisma.permission.findMany();

  for (const perm of permissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: superadminRole.id,
          permissionId: perm.id
        }
      },
      update: {},
      create: {
        roleId: superadminRole.id,
        permissionId: perm.id
      }
    });
  }

  // -------------------------------------------------
  // 4) Create SUPERADMIN user
  // -------------------------------------------------
  const email = "superadmin@example.com";
  const passwordHash = await bcrypt.hash("SuperAdmin123!", 12);

  const superadminUser = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash,
      emailVerified: true
    }
  });

  // -------------------------------------------------
  // 5) Assign SUPERADMIN role → user
  // -------------------------------------------------
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: superadminUser.id,
        roleId: superadminRole.id
      }
    },
    update: {},
    create: {
      userId: superadminUser.id,
      roleId: superadminRole.id
    }
  });

  // -------------------------------------------------
  // 6) Create AdminProfile
  // -------------------------------------------------
  await prisma.adminProfile.upsert({
    where: { userId: superadminUser.id },
    update: {},
    create: {
      userId: superadminUser.id,
      department: "System",
      staffTitle: "Super Administrator"
    }
  });

  console.log("✅ SUPERADMIN READY");
  console.log("Login Email:", email);
  console.log("Password: SuperAdmin123!");
}

main()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
  })
  .finally(() => prisma.$disconnect());
