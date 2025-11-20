const axios = require("axios");
const currency = require("currency.js");

module.exports = {
  id: "invoice_analytics",
  name: "Invoice Analytics",
  version: "1.0.0",

  async execute(ctx, config) {
    const { apiUrl, token } = config;

    // 1️⃣ Fetch data using axios
    const resp = await axios.get(apiUrl + "/invoices", {
      headers: { Authorization: `Bearer ${token}` }
    });

    const invoices = resp.data;

    // 2️⃣ Use npm package "currency.js" to sum totals
    const total = invoices.reduce(
      (sum, inv) => sum.add(currency(inv.amount)),
      currency(0)
    );

    // 3️⃣ Return analytics data to WHMCS automation engine
    return {
      fetched: invoices.length,
      totalAmount: total.value,
      currency: "USD"
    };
  }
};
