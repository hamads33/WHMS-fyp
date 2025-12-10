// src/modules/marketplace/stores/buildLogStore.js
module.exports = function BuildLogStore({ prisma }) {
  return {
    write({ submissionId, productId, versionId, step, level = "info", message, meta }) {
      return prisma.marketplaceBuildLog.create({
        data: { submissionId, productId, versionId, step, level, message, meta }
      });
    },

    list(submissionId) {
      return prisma.marketplaceBuildLog.findMany({
        where: { submissionId },
        orderBy: { createdAt: "asc" }
      });
    }
  };
};
