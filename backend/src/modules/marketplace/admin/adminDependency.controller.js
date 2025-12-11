module.exports = {
  async list(req, res, prisma) {
    const productId = req.params.productId;

    const deps = await prisma.marketplaceDependency.findMany({
      where: { productId },
      orderBy: { createdAt: "desc" }
    });

    return res.json({ ok: true, dependencies: deps });
  },

  async approve(req, res, prisma) {
    const id = req.params.id;

    const dep = await prisma.marketplaceDependency.update({
      where: { id },
      data: { approved: true }
    });

    return res.json({ ok: true, message: "dependency_approved", dep });
  },

  async reject(req, res, prisma) {
    const id = req.params.id;

    const dep = await prisma.marketplaceDependency.update({
      where: { id },
      data: { approved: false }
    });

    // Find submission & mark pending_resubmission
    const submission = await prisma.marketplaceSubmission.findFirst({
      where: { productId: dep.productId },
      orderBy: { createdAt: "desc" }
    });

    if (submission) {
      await prisma.marketplaceSubmission.update({
        where: { id: submission.id },
        data: {
          status: "pending_resubmission",
          notes: "Dependency rejected by admin"
        }
      });
    }

    return res.json({ ok: true, message: "dependency_rejected", dep });
  }
};
