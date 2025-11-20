/**
 * Invoice Manager Pro – WHMCS-like Plugin
 * - Validates API key
 * - Fetches a client (simulated)
 * - Creates invoice (simulated)
 * - Sends email (simulated)
 * - Returns detailed logs
 */

module.exports = {
  id: "invoice_manager",
  name: "Invoice Manager Pro",
  version: "1.0.0",

  async execute(ctx, config) {
    const logs = [];
    const log = (msg, data = {}) => logs.push({ msg, ...data, ts: new Date().toISOString() });

    log("Starting Invoice Manager Plugin", { mode: ctx.test ? "test" : "live" });

    // 1) Validate API key
    if (!config.apiKey || config.apiKey.length < 10) {
      throw new Error("Invalid API key: must be at least 10 chars");
    }
    log("API Key validated");

    // 2) Fetch client (simulate)
    log("Fetching client details...", { clientId: config.clientId });
    const client = await mockFetchClient(config.clientId);
    log("Client fetched", client);

    // 3) Create invoice (simulate)
    const invoice = await mockCreateInvoice({
      clientId: config.clientId,
      amount: config.amount,
      currency: config.currency,
      desc: config.description
    });

    log("Invoice created", invoice);

    // 4) Send email (if enabled)
    if (config.sendEmail) {
      const emailResult = await mockSendEmail({
        to: client.email,
        subject: "Your Invoice",
        body: `Dear ${client.name}, here is your invoice #${invoice.id}`
      });

      log("Email sent", emailResult);
    }

    log("Plugin execution completed");

    return {
      ok: true,
      invoice,
      client,
      logs
    };
  },

  /**
   * Test mode
   * Simulates execution without sending email or modifying DB
   */
  async test(config) {
    return {
      ok: true,
      msg: "Test completed. No invoice created.",
      config
    };
  }
};

// -------------------------
// MOCK INTERNAL HELPERS
// -------------------------

async function mockFetchClient(id) {
  await wait(200);
  return {
    id,
    name: "John Doe",
    email: "john@example.com"
  };
}

async function mockCreateInvoice({ clientId, amount, currency, desc }) {
  await wait(300);
  return {
    id: "INV-" + Math.floor(Math.random() * 999999),
    clientId,
    amount,
    currency,
    description: desc || "No description",
    createdAt: new Date().toISOString()
  };
}

async function mockSendEmail({ to, subject, body }) {
  await wait(150);
  return {
    sent: true,
    to,
    subject
  };
}

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
