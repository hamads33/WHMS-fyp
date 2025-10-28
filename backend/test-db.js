// test-db.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log('Connected ✅ | Found users:', users);
}

main()
  .catch((err) => console.error('DB error ❌', err))
  .finally(() => prisma.$disconnect());
