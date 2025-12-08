// upload-version.usecase.js
// End-to-end version upload pipeline:
// 1. Accept ZIP path
// 2. Extract to plugins/actions/{productId}/{version}/
// 3. Parse manifest.json
// 4. Save MarketplaceVersion
// 5. Register Submission
// 6. Run Runtime Verification
// 7. Install Dependencies
// 8. Return result
// upload-version.usecase.js

const fs = require("fs");
const path = require("path");
const InstallerService = require("../../services/installer.service");
const DependencyInstaller = require("../../services/dependency-installer.service");
const pluginAPI = require("../../../../modules/plugins/api");

module.exports = class UploadVersionUseCase {
  constructor(repos, config = {}) {
    this.productRepo = repos.productRepo;
    this.versionRepo = repos.versionRepo;
    this.submissionRepo = repos.submissionRepo;
    this.verificationRepo = repos.verificationRepo;
    this.buildLogRepo = repos.buildLogRepo;

    this.archiveBasePath =
      config.archiveBasePath ||
      path.join(process.cwd(), "src/modules/plugins/actions");
  }

  async execute({ productId, zipPath, userId }) {

    // 🔍 DEBUG LOGS — now valid
    console.log("======================================");
    console.log("UPLOAD VERSION DEBUG");
    console.log("zipPath:", zipPath);
    console.log("archiveBasePath:", this.archiveBasePath);
    console.log("zip exists:", fs.existsSync(zipPath));
    console.log("======================================");

    // ---------------------------------------------------
    // 1. Validate Product Exists
    // ---------------------------------------------------
    const product = await this.productRepo.findById(productId);
    if (!product) throw new Error("Product not found");

    // ---------------------------------------------------
    // 2. Extract ZIP into {productId}/{version}/
    // ---------------------------------------------------
    const extractResult = await InstallerService.extract(zipPath, {
      productId,
      basePath: this.archiveBasePath,
    });

    if (!extractResult.success) {
      await this.buildLogRepo.create({
        productId,
        level: "error",
        message: "Extraction failed",
        meta: extractResult,
      });
      throw new Error("Extraction failed -> " + extractResult.error);
    }

    const { version, extractFolder } = extractResult;

    // ---------------------------------------------------
    // 3. Manifest path
    // ---------------------------------------------------
    const manifestPath = path.join(extractFolder, "manifest.json");
    if (!fs.existsSync(manifestPath)) throw new Error("manifest.json missing");

    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

    // ---------------------------------------------------
    // 4. Create Version Entry
    // ---------------------------------------------------
    const versionEntity = await this.versionRepo.create({
      productId,
      version,
      manifestJson: manifest,
      archivePath: extractFolder,
    });

    // ---------------------------------------------------
    // 5. Create Submission
    // ---------------------------------------------------
    const submission = await this.submissionRepo.create({
      productId,
      versionId: versionEntity.id,
      status: "pending",
      reviewerId: null,
      notes: null,
    });

    // ---------------------------------------------------
    // 6. Run Runtime Verification via plugin module
    // ---------------------------------------------------
    const verifyResult = await pluginAPI.runRuntimeVerification({
      submissionId: submission.id,
      productId,
      versionId: versionEntity.id,
      pluginFolder: extractFolder,
      manifest,
    });

    // Save verification result
    await this.verificationRepo.create({
      productId,
      versionId: versionEntity.id,
      passed: verifyResult.passed,
      issues: verifyResult.issues || {},
    });

    // ---------------------------------------------------
    // 7. Auto Install Dependencies (FR-M7)
    // ---------------------------------------------------
    const depsResult = await DependencyInstaller.installDependencies({
      productId,
      manifest,
      pluginFolder: extractFolder,
    });

    // ---------------------------------------------------
    // 8. Build final response
    // ---------------------------------------------------
    return {
      success: true,
      versionId: versionEntity.id,
      version,
      verification: verifyResult,
      dependencies: depsResult,
    };
  }
};
