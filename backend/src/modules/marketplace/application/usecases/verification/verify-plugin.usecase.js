class VerifyPluginUseCase {
  constructor({ verificationRepo, submissionRepo, versionRepo, runtimeVerifier }) {
    this.verificationRepo = verificationRepo;
    this.submissionRepo = submissionRepo;
    this.versionRepo = versionRepo;

    // IMPORTANT FIX — ensure proper function binding
    this.runtimeVerifier = (opts) => runtimeVerifier(opts);
  }

  async execute({ versionId }) {
    // 1. Ensure version exists
    const version = await this.versionRepo.findById(versionId);
    if (!version) throw new Error("Version not found");

    // 2. Get latest submission OR auto-create one
    let submission = await this.submissionRepo.findLatestByVersion(versionId);

    if (!submission) {
      submission = await this.submissionRepo.save({
        id: await this.submissionRepo.generateId(),
        productId: version.productId,
        versionId,
        status: "pending",
        reviewerId: null,
        notes: null,
        createdAt: new Date()
      });
    }

    // 3. Run runtime verification
    const verifyResult = await this.runtimeVerifier({
      submissionId: submission.id,
      productId: submission.productId,
      versionId: submission.versionId,
      pluginFolder: version.archivePath,  // must be extracted folder
      manifest: version.manifestJson
    });

    // 4. Store verification result
    const verificationRecord = await this.verificationRepo.save({
      id: await this.verificationRepo.generateId(),
      submissionId: submission.id,
      productId: submission.productId,
      versionId: submission.versionId,
      passed: verifyResult.passed,
      issues: verifyResult.details || verifyResult.issues || {},
      createdAt: new Date()
    });

    // 5. Update submission state
    submission.status = verifyResult.passed ? "approved" : "rejected";
    submission.updatedAt = new Date();

    await this.submissionRepo.save(submission);

    return {
      success: true,
      verificationId: verificationRecord.id,
      passed: verifyResult.passed,
      logs: verifyResult.logs || [],
      details: verifyResult.details || {}
    };
  }
}

module.exports = VerifyPluginUseCase;
