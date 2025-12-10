module.exports = ({ uploadVersion, prisma, buildLogStore }) => {
  return async (req, res) => {
    try {
      // Step 1: Validate upload
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "No file uploaded — use form-data: file=<zip>"
        });
      }

      const productId = req.params.productId;
      const userId = req.user?.id || null;
      const zipPath = req.file.path;

      // Step 2: Run upload usecase (extract manifest, save archive, create version)
      const { version, manifest } = await uploadVersion.execute({
        productId,
        zipPath,
        userId
      });

      // Step 3: Create submission entry (FR-M6)
      const submission = await prisma.marketplaceSubmission.create({
        data: {
          productId,
          versionId: version.id,
          status: "pending"
        }
      });

      // Step 4: Write upload logs (installer reads these)
      await buildLogStore.write({
        submissionId: submission.id,
        productId,
        versionId: version.id,
        step: "upload",
        message: "Version uploaded and manifest extracted",
        meta: { manifest }
      });

      // Step 5: Respond cleanly
      return res.json({
        success: true,
        data: {
          version,
          submission
        }
      });
    } catch (err) {
      console.error("Upload Version Error:", err);

      return res.status(500).json({
        success: false,
        error: err.message
      });
    }
  };
};
