const porkbun = require("../domainProviders/porkbun.provider");

exports.getLivePricing = async (req, res) => {
  try {
    // Fetch pricing from Porkbun API
    const pb = await porkbun.getPricing();

    // Porkbun sometimes returns HTML error page → handle it safely
    if (!pb || !pb.pricing || typeof pb.pricing !== "object") {
      return res.status(500).json({
        success: false,
        error: "Invalid response from Porkbun",
        raw: pb
      });
    }

    // Normalize Porkbun response to simple TLD → {registration, renewal, transfer}
    const map = {};

    for (const [tld, info] of Object.entries(pb.pricing)) {
      map[tld] = {
        registration: Number(info.registration) || 0,
        renewal: Number(info.renewal) || 0,
        transfer: Number(info.transfer) || 0,
      };
    }

    return res.json({
      success: true,
      data: map,
    });
  } catch (err) {
    console.error("Porkbun pricing error:", err);
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};
