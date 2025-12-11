// src/modules/marketplace/admin/adminDependency.service.js

async function approveDependency({ prisma, depId }) {
  const dependency = await prisma.marketplaceDependency.findUnique({ where: { id: depId } });
  if (!dependency) return { ok: false, code: 404, error: "dependency_not_found" };

  const updated = await prisma.marketplaceDependency.update({
    where: { id: depId },
    data: { approved: true }
  });

  return { ok: true, dependency: updated };
}

async function rejectDependency({ prisma, depId, reason = "" }) {
  const dependency = await prisma.marketplaceDependency.findUnique({ where: { id: depId } });
  if (!dependency) return { ok: false, code: 404, error: "dependency_not_found" };

  // mark as not approved and keep history (we append reason into versionRange for trace)
  const updated = await prisma.marketplaceDependency.update({
    where: { id: depId },
    data: {
      approved: false,
      versionRange: dependency.versionRange + (reason ? ` (rejected: ${reason})` : "")
    }
  });

  // Move any active submissions for this product into pending_resubmission
  try {
    const affected = await prisma.marketplaceSubmission.findMany({
      where: {
        productId: dependency.productId,
        status: { in: ["pending_review", "pending_dependency_approval"] }
      }
    });

    for (const sub of affected) {
      await prisma.marketplaceSubmission.update({
        where: { id: sub.id },
        data: {
          status: "pending_resubmission",
          notes: (sub.notes || "") + `\nDependency ${dependency.dependencyId} rejected: ${reason}`
        }
      });
    }
  } catch (e) {
    // non-fatal
  }

  return { ok: true, dependency: updated };
}

module.exports = { approveDependency, rejectDependency };
