// src/modules/marketplace/admin/adminReview.service.js
const path = require("path");
const PluginInstaller = require("../../plugins/pluginInstaller.service");

/**
 * listPending - list submissions by status with some joined info
 */
async function listPending({ prisma, status = "pending_review", limit = 50, offset = 0 }) {
  const submissions = await prisma.marketplaceSubmission.findMany({
    where: { status },
    take: limit,
    skip: offset,
    orderBy: { createdAt: "desc" },
    include: {
      product: { select: { id: true, title: true, slug: true, sellerId: true, status: true } },
      version: { select: { id: true, version: true, manifestJson: true, archivePath: true, createdAt: true } }
    }
  });

  return submissions.map(s => ({
    id: s.id,
    productId: s.productId,
    product: s.product
      ? {
          id: s.product.id,
          title: s.product.title,
          slug: s.product.slug,
          sellerId: s.product.sellerId,
          status: s.product.status
        }
      : null,
    versionId: s.versionId,
    version: s.version
      ? {
          id: s.version.id,
          version: s.version.version,
          manifest: s.version.manifestJson,
          archivePath: s.version.archivePath,
          createdAt: s.version.createdAt
        }
      : null,
    status: s.status,
    createdAt: s.createdAt
  }));
}

/**
 * getDetails - returns full submission details including previous versions + dependencies
 */
async function getDetails({ prisma, submissionId }) {
  const submission = await prisma.marketplaceSubmission.findUnique({
    where: { id: submissionId },
    include: { product: true, version: true }
  });
  if (!submission) return null;

  const versions = await prisma.marketplaceVersion.findMany({
    where: { productId: submission.productId },
    orderBy: { createdAt: "desc" },
    take: 20
  });

  const dependencies = await prisma.marketplaceDependency.findMany({
    where: { productId: submission.productId }
  });

  return {
    id: submission.id,
    status: submission.status,
    notes: submission.notes,
    reviewerId: submission.reviewerId,
    createdAt: submission.createdAt,
    product: submission.product
      ? {
          id: submission.product.id,
          title: submission.product.title,
          slug: submission.product.slug,
          sellerId: submission.product.sellerId,
          status: submission.product.status,
          shortDesc: submission.product.shortDesc,
          longDesc: submission.product.longDesc,
          tags: submission.product.tags,
          logo: submission.product.logo,
          screenshots: submission.product.screenshots
        }
      : null,
    version: submission.version
      ? {
          id: submission.version.id,
          version: submission.version.version,
          manifest: submission.version.manifestJson,
          archivePath: submission.version.archivePath,
          changelog: submission.version.changelog,
          approvedAt: submission.version.approvedAt,
          createdAt: submission.version.createdAt
        }
      : null,
    previousVersions: versions.map(v => ({
      id: v.id,
      version: v.version,
      createdAt: v.createdAt,
      approvedAt: v.approvedAt
    })),
    dependencies: dependencies.map(d => ({
      id: d.id,
      dependencyId: d.dependencyId,
      versionRange: d.versionRange,
      approved: d.approved,
      createdAt: d.createdAt
    }))
  };
}

/**
 * approveSubmission (FINAL MERGED VERSION)
 */
async function approveSubmission({
  prisma,
  submissionId,
  reviewerId = null,
  autoFill = true,
  approveDependencies = false,
  logger = console
}) {
  const submission = await prisma.marketplaceSubmission.findUnique({
    where: { id: submissionId },
    include: { version: true, product: true }
  });

  if (!submission)
    return { ok: false, code: 404, error: "submission_not_found" };

  if (submission.status === "approved")
    return { ok: false, code: 400, error: "already_approved" };

  if (submission.status === "rejected")
    return { ok: false, code: 400, error: "already_rejected" };

  const version = submission.version;
  const product = submission.product;

  if (!version)
    return { ok: false, code: 400, error: "version_missing" };

  // -------------------------------------------------------------------
  // 1. DEPENDENCY VALIDATION
  // -------------------------------------------------------------------
  const declaredDeps = await prisma.marketplaceDependency.findMany({
    where: { productId: submission.productId }
  });

  const unapprovedDeps = declaredDeps.filter(d => !d.approved);

  if (unapprovedDeps.length > 0) {
    if (!approveDependencies) {
      await prisma.marketplaceSubmission.update({
        where: { id: submissionId },
        data: {
          status: "pending_dependency_approval",
          reviewerId: reviewerId || null
        }
      });

      return {
        ok: false,
        code: 409,
        error: "dependencies_require_approval",
        dependencies: unapprovedDeps.map(d => ({
          dependencyId: d.dependencyId,
          versionRange: d.versionRange
        }))
      };
    }

    // Auto approve dependencies
    await prisma.marketplaceDependency.updateMany({
      where: { id: { in: unapprovedDeps.map(d => d.id) } },
      data: { approved: true }
    });
  }

  // -------------------------------------------------------------------
  // 2. APPROVAL TRANSACTION
  // -------------------------------------------------------------------
  try {
    const now = new Date();
    const txOps = [];

    // Approve version
    txOps.push(
      prisma.marketplaceVersion.update({
        where: { id: version.id },
        data: { approvedAt: now }
      })
    );

    // Approve submission
    txOps.push(
      prisma.marketplaceSubmission.update({
        where: { id: submissionId },
        data: {
          status: "approved",
          reviewerId: reviewerId || null
        }
      })
    );

    // Update product metadata
    const productUpdate = {
      status: "published",
      lastUpdatedAt: now
    };

    if (!product.approvedAt) productUpdate.approvedAt = now;

    // Auto-fill fields from manifest
    if (autoFill && version.manifestJson) {
      const m = version.manifestJson;

      if (!product.title && m.name) productUpdate.title = m.name;
      if ((!product.shortDesc || product.shortDesc === "") && m.short_description)
        productUpdate.shortDesc = m.short_description;
      if ((!product.longDesc || product.longDesc === "") && m.description)
        productUpdate.longDesc = m.description;

      if ((!product.tags || product.tags.length === 0) && m.tags) {
        productUpdate.tags = Array.isArray(m.tags)
          ? m.tags
          : m.tags.split(",").map(t => t.trim());
      }

      if ((!product.logo || product.logo === "") && m.logo)
        productUpdate.logo = m.logo;

      if ((!product.screenshots || product.screenshots.length === 0) && m.screenshots)
        productUpdate.screenshots = Array.isArray(m.screenshots)
          ? m.screenshots
          : [];
    }

    txOps.push(
      prisma.marketplaceProduct.update({
        where: { id: product.id },
        data: productUpdate
      })
    );

    // Execute atomic transaction
    const [v, s, p] = await prisma.$transaction(txOps);

    // -------------------------------------------------------------------
    // 3. PLUGIN INSTALLATION
    // -------------------------------------------------------------------
    try {
      const installResult = await PluginInstaller.installFromArchive({
        archivePath: version.archivePath,
        productId: product.id,
        version: version.version,
        submissionId,
        destBase: path.join(process.cwd(), "plugins", "actions")
      });

      await prisma.marketplaceBuildLog.create({
        data: {
          submissionId,
          productId: product.id,
          versionId: version.id,
          level: "info",
          step: "install",
          message: "Plugin installed successfully"
        }
      });

      return {
        ok: true,
        details: { version: v, submission: s, product: p, installed: true }
      };
    } catch (installErr) {
      const msg = installErr?.message || String(installErr);

      await prisma.marketplaceBuildLog.create({
        data: {
          submissionId,
          productId: product.id,
          versionId: version.id,
          level: "error",
          step: "install",
          message: msg
        }
      });

      await prisma.marketplaceSubmission.update({
        where: { id: submissionId },
        data: { notes: (s.notes || "") + "\ninstall_error: " + msg }
      });

      return {
        ok: true,
        details: { version: v, submission: s, product: p, installError: msg }
      };
    }
  } catch (err) {
    return { ok: false, code: 500, error: err?.message || String(err) };
  }
}

/**
 * rejectSubmission
 */
async function rejectSubmission({ prisma, submissionId, reviewerId = null, reason = "" }) {
  const submission = await prisma.marketplaceSubmission.findUnique({
    where: { id: submissionId }
  });

  if (!submission) return { ok: false, code: 404, error: "submission_not_found" };
  if (submission.status === "approved") return { ok: false, code: 400, error: "already_approved" };

  try {
    const updated = await prisma.marketplaceSubmission.update({
      where: { id: submissionId },
      data: {
        status: "rejected",
        reviewerId: reviewerId || null,
        notes: reason || null
      }
    });
    return { ok: true, submission: updated };
  } catch (err) {
    return { ok: false, code: 500, error: err?.message || String(err) };
  }
}

module.exports = {
  listPending,
  getDetails,
  approveSubmission,
  rejectSubmission
};
