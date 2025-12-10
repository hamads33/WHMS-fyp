module.exports = ({ prisma }) => {
  return async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Fetch developer profile
      const developer = await prisma.developerProfile.findUnique({
        where: { userId }
      });

      if (!developer) {
        return res.status(400).json({
          error: "Developer profile not found — user is not a marketplace seller"
        });
      }

      const sellerId = developer.id; // THIS is what Prisma expects

      const { title, slug, shortDesc, longDesc, categoryId } = req.body;

      const product = await prisma.marketplaceProduct.create({
        data: {
          sellerId,       // REQUIRED
          title,
          slug,
          shortDesc,
          longDesc,
          categoryId
        }
      });

      return res.json({ success: true, data: product });
    } catch (err) {
      console.error("Create Product Error:", err);
      return res.status(500).json({ error: err.message });
    }
  };
};
