module.exports = {
  id: "invoice_manager_ui",
  name: "Invoice Manager UI",
  version: "1.0.0",

  async init(ctx) {
    console.log("[invoice_manager_ui] UI plugin initialized");
    return { ok: true };
  },

  // Optional test route
  async test() {
    return { ok: true, message: "UI plugin test OK!" };
  }
};
