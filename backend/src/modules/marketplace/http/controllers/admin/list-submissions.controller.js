// src/modules/marketplace/http/controllers/admin/list-submissions.controller.js
module.exports = ({ prisma }) => async (req, res, next) => {
  try {
    const submissions = await prisma.marketplaceSubmission.findMany({
      include: { product: true, version: true, reviewer: true },
      orderBy: { createdAt: "desc" }
    });

    res.json({ success: true, data: submissions });
  } catch (err) {
    next(err);
  }
};
