class SubmitVersionUseCase {
  constructor(versionRepo, submissionRepo, productRepo, idGen) {
    this.versionRepo = versionRepo;
    this.submissionRepo = submissionRepo;
    this.productRepo = productRepo;
    this.idGen = idGen;
  }

  async execute(data) {
    const product = await this.productRepo.findById(data.productId);
    if (!product) throw new Error("Product does not exist");

    // 1) Create version draft
    const versionId = this.idGen();
    await this.versionRepo.save({
      id: versionId,
      productId: data.productId,
      version: data.version,
      manifestJson: data.manifestJson,
      archivePath: data.archivePath,
      changelog: data.changelog,
      priceCents: data.priceCents,
      currency: "USD",
      createdAt: new Date(),
    });

    // 2) Create submission record
    const submissionId = this.idGen();
    await this.submissionRepo.save({
      id: submissionId,
      productId: data.productId,
      versionId,
      submitterId: data.submitterId,
      status: "pending",
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return { versionId, submissionId };
  }
}

module.exports = SubmitVersionUseCase;
