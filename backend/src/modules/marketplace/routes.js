const ProductController = require("./controllers/product.controller");
const VersionController = require("./controllers/version.controller");
const SellerController = require("./controllers/seller.controller");
const PurchaseController = require("./controllers/purchase.controller");
const UploadController = require("./controllers/upload.controller");
const { uploadMiddleware } = require("./uploader/pluginUpload");

module.exports = (router, deps) => {
    const seller = new SellerController(deps);
    const product = new ProductController(deps);
    const version = new VersionController(deps);
    const purchase = new PurchaseController(deps);
    const upload = new UploadController(deps);

    // --- Seller ---
    router.post("/seller/register", (req, res) => seller.register(req, res));
    router.get("/seller/me", (req, res) => seller.me(req, res));

    // --- Products ---
    router.post("/products", (req, res) => product.create(req, res));
    router.get("/products", (req, res) => product.list(req, res));
    router.get("/products/:slug", (req, res) => product.get(req, res));
    router.put("/products/:productId", (req, res) => product.update(req, res));
    router.post("/products/:productId/publish", (req, res) => product.publish(req, res));

    // --- Versions ---
    router.post("/products/:productId/versions", (req, res) => version.create(req, res));
    router.get("/products/:productId/versions", (req, res) => version.list(req, res));

    // --- Upload version (ZIP + manifest validation) ---
    // TODO: add sellerAuth.mustBeSeller, sellerAuth.mustOwnProduct when auth is available
    router.post(
      "/products/:productId/versions/upload",
      uploadMiddleware,
      (req, res, next) => upload.uploadHandler(req, res, next)
    );

    // --- Purchases ---
    router.post("/purchase/:productId", (req, res) => purchase.buy(req, res));
    router.get("/purchases", (req, res) => purchase.listMine(req, res));
};
