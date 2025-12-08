module.exports = ({ uploadVersion }) => {
  return async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "No file uploaded — use form-data: file=<zip>",
        });
      }

      const productId = req.params.productId;
      const zipPath = req.file.path;

      const result = await uploadVersion.execute({
        productId,
        zipPath,
        userId: req.user?.id || null,
      });

      res.json({ success: true, data: result });
    } catch (err) {
      console.error("Upload Version Error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  };
};
