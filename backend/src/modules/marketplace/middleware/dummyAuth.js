const SellerStore = require("../stores/sellerStore");

module.exports = async function dummyAuth(req, res, next) {
  try {
    console.log("🔥 dummyAuth START");

    // Fake logged-in user (matches seed userId = 1)
    req.user = { id: 1 };

    console.log("👤 req.user before DB lookup =", req.user);

    const seller = await SellerStore.findByUserId(req.user.id);

    console.log("📦 SellerStore.findByUserId returned =", seller);

    if (!seller) {
      console.warn("⚠️ No marketplace seller found for this user");
      req.user.marketplaceSeller = null;
    } else {
      req.user.marketplaceSeller = seller;
    }

    console.log("📌 req.user after attaching seller =", req.user);

    next();
  } catch (err) {
    console.error("dummyAuth error:", err);
    res.status(500).json({ error: "Internal auth middleware error" });
  }
};
