// src/modules/marketplace/index.js

/* ============================================================
   INTERNAL IMPORTS
============================================================ */
const pluginAPI = require("../plugins/api");

/* ============================================================
   PRISMA REPOSITORIES
============================================================ */
const ProductRepo = require("./infra/prisma/product.prisma.repository");
const VersionRepo = require("./infra/prisma/version.prisma.repository");
const PurchaseRepo = require("./infra/prisma/purchase.prisma.repository");
const ReviewRepo = require("./infra/prisma/review.prisma.repository");
const SubmissionRepo = require("./infra/prisma/submission.prisma.repository");
const VerificationRepo = require("./infra/prisma/verification.prisma.repository");
const AnalyticsRepo = require("./infra/prisma/analytics.prisma.repository");
const CategoryRepo = require("./infra/prisma/category.prisma.repository");
const BuildLogRepo = require("./infra/prisma/buildLog.prisma.repository");

/* ============================================================
   USE CASES
============================================================ */
const CreateProductUseCase = require("./application/usecases/product/create-product.usecase");
const UpdateProductInfoUseCase = require("./application/usecases/product/update-product-info.usecase");
const BrowseProductsUseCase = require("./application/usecases/product/browse-products.usecase");
const GetProductDetailsUseCase = require("./application/usecases/product/get-product-details.usecase");

const SubmitVersionUseCase = require("./application/usecases/version/submit-version.usecase");
const VerifyPluginUseCase = require("./application/usecases/verification/verify-plugin.usecase");

const UploadVersionUseCase = require("./application/usecases/upload-version.usecase");

const PurchasePluginUseCase = require("./application/usecases/purchase/purchase-plugin.usecase");
const ValidateLicenseUseCase = require("./application/usecases/purchase/validate-license.usecase");

const AddReviewUseCase = require("./application/usecases/review/add-review.usecase");
const AnalyticsOverviewUseCase = require("./application/usecases/analytics/analytics-overview.usecase");

/* ============================================================
   CONTROLLERS
============================================================ */
const browseProductsController = require("./http/controllers/browse-products.controller");
const getProductDetailsController = require("./http/controllers/get-product-details.controller");

const createProductController = require("./http/controllers/create-product.controller");
const updateProductInfoController = require("./http/controllers/update-product-info.controller");

const submitVersionController = require("./http/controllers/submit-version.controller");
const verifyPluginController = require("./http/controllers/verify-plugin.controller");

const uploadVersionController = require("./http/controllers/upload-version.controller");

const purchasePluginController = require("./http/controllers/purchase-plugin.controller");
const validateLicenseController = require("./http/controllers/validate-license.controller");

const addReviewController = require("./http/controllers/add-review.controller");
const analyticsController = require("./http/controllers/analytics-overview.controller");

/* ============================================================
   ROUTES
============================================================ */
const marketplaceRoutes = require("./http/routes");

/* ============================================================
   MODULE ENTRY
============================================================ */
module.exports = function MarketplaceModule({ prisma, idGen }) {
  /* -----------------------------------------
     1. REPOSITORIES
  ----------------------------------------- */
  const repos = {
    productRepo: new ProductRepo(prisma),
    versionRepo: new VersionRepo(prisma),
    purchaseRepo: new PurchaseRepo(prisma),
    reviewRepo: new ReviewRepo(prisma),
    submissionRepo: new SubmissionRepo(prisma),
    verificationRepo: new VerificationRepo(prisma),
    analyticsRepo: new AnalyticsRepo(prisma),
    categoryRepo: new CategoryRepo(prisma),
    buildLogRepo: new BuildLogRepo(prisma),
  };

  /* -----------------------------------------
     2. USE CASES
  ----------------------------------------- */
  const usecases = {
    createProduct: new CreateProductUseCase(repos.productRepo, idGen),
    updateProductInfo: new UpdateProductInfoUseCase(repos.productRepo),
    browseProducts: new BrowseProductsUseCase(repos.productRepo),

    getProductDetails: new GetProductDetailsUseCase(
      repos.productRepo,
      repos.versionRepo,
      repos.reviewRepo
    ),

    submitVersion: new SubmitVersionUseCase(
      repos.versionRepo,
      repos.submissionRepo,
      repos.productRepo,
      idGen
    ),

    verifyPlugin: new VerifyPluginUseCase({
      verificationRepo: repos.verificationRepo,
      submissionRepo: repos.submissionRepo,
      versionRepo: repos.versionRepo,
      runtimeVerifier: pluginAPI.runRuntimeVerification, // FIXED
    }),

    uploadVersion: new UploadVersionUseCase(
      {
        productRepo: repos.productRepo,
        versionRepo: repos.versionRepo,
        submissionRepo: repos.submissionRepo,
        verificationRepo: repos.verificationRepo,
        buildLogRepo: repos.buildLogRepo,
      },
      {
        zipStorageDir: "C:/Fyp/backend/uploads/marketplace",
        actionsDir: "C:/Fyp/backend/plugins/actions",
      }
    ),

    purchasePlugin: new PurchasePluginUseCase(
      repos.purchaseRepo,
      repos.productRepo,
      idGen
    ),

    validateLicense: new ValidateLicenseUseCase(repos.purchaseRepo),

    addReview: new AddReviewUseCase(
      repos.reviewRepo,
      repos.productRepo,
      idGen
    ),

    analyticsOverview: new AnalyticsOverviewUseCase(repos.analyticsRepo),
  };

  /* -----------------------------------------
     3. CONTROLLERS
  ----------------------------------------- */
  const controllers = {
    browseProducts: browseProductsController({ browseProducts: usecases.browseProducts }),
    getDetails: getProductDetailsController({ getProductDetails: usecases.getProductDetails }),
    createProduct: createProductController({ createProduct: usecases.createProduct }),
    updateProduct: updateProductInfoController({ updateProductInfo: usecases.updateProductInfo }),
    submitVersion: submitVersionController({ submitVersion: usecases.submitVersion }),
    verifyPlugin: verifyPluginController({ verifyPlugin: usecases.verifyPlugin }),
    uploadVersion: uploadVersionController({ uploadVersion: usecases.uploadVersion }),
    purchase: purchasePluginController({ purchasePlugin: usecases.purchasePlugin }),
    validateLicense: validateLicenseController({ validateLicense: usecases.validateLicense }),
    addReview: addReviewController({ addReview: usecases.addReview }),
    analytics: analyticsController({ analyticsOverview: usecases.analyticsOverview }),
  };

  /* -----------------------------------------
     4. EXPORT MODULE ROUTES
  ----------------------------------------- */
  return {
    routes: marketplaceRoutes({ controllers }),
  };
};
