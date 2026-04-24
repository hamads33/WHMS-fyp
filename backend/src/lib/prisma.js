const { PrismaClient } = require("@prisma/client");

let prisma;

if (!global.prisma) {
  prisma = new PrismaClient();
  if (process.env.NODE_ENV === "development") global.prisma = prisma;
} else {
  prisma = global.prisma;
}

module.exports = prisma;
