require("dotenv").config();

const prisma = require("../prisma");
const { seedRBAC } = require("../src/modules/auth/seed/rbac-seed");

async function ensureRoleAssignment(userId, roleId) {
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId,
        roleId,
      },
    },
    update: {},
    create: {
      userId,
      roleId,
    },
  });
}

async function ensureClientProfile(userId) {
  await prisma.clientProfile.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}

async function main() {
  console.log("Seeding auth roles and backfilling user assignments...");

  await seedRBAC();

  const superadminRole = await prisma.role.findUnique({
    where: { name: "superadmin" },
  });
  const clientRole = await prisma.role.findUnique({
    where: { name: "client" },
  });

  if (!superadminRole || !clientRole) {
    throw new Error("Required roles were not created correctly");
  }

  const superadminEmails = ["superadmin@example.com", "superadmin@rxample.com"];
  const matchedSuperadmins = await prisma.user.findMany({
    where: {
      email: { in: superadminEmails },
    },
    select: {
      id: true,
      email: true,
      adminProfile: { select: { id: true } },
    },
  });

  for (const user of matchedSuperadmins) {
    await ensureRoleAssignment(user.id, superadminRole.id);

    if (!user.adminProfile) {
      await prisma.adminProfile.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          department: "System",
          staffTitle: "Super Administrator",
        },
      });
    }
  }

  const usersWithoutRoles = await prisma.user.findMany({
    where: {
      roles: { none: {} },
    },
    select: {
      id: true,
      email: true,
      clientProfile: { select: { id: true } },
    },
  });

  let assignedClientCount = 0;
  let createdClientProfiles = 0;

  for (const user of usersWithoutRoles) {
    if (superadminEmails.includes(user.email)) continue;

    await ensureRoleAssignment(user.id, clientRole.id);
    assignedClientCount += 1;

    if (!user.clientProfile) {
      await ensureClientProfile(user.id);
      createdClientProfiles += 1;
    }
  }

  console.log(`Superadmin accounts fixed: ${matchedSuperadmins.length}`);
  console.log(`Users assigned client role: ${assignedClientCount}`);
  console.log(`Client profiles created: ${createdClientProfiles}`);
}

main()
  .catch((err) => {
    console.error("Auth bootstrap seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
