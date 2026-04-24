const axios = require("axios");

// Register webhook URLs in DB later — for now config env
const HOOK_URLS = (process.env.AUTH_WEBHOOKS || "")
  .split(",")
  .map((u) => u.trim())
  .filter(Boolean);

module.exports = {
  async emit(event, payload) {
    if (!HOOK_URLS.length) return;

    for (const url of HOOK_URLS) {
      axios.post(url, { event, payload }).catch(() => {
        console.warn("Webhook failed:", url);
      });
    }
  }
};
