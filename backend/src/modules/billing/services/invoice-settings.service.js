/**
 * Invoice Settings Service
 * Path: src/modules/billing/services/invoice-settings.service.js
 *
 * Manages global invoice configuration stored in SystemSetting.
 */

const prisma = require("../../../../prisma");

const SETTING_KEY = "invoice_settings";

const DEFAULTS = {
  // Generation
  continuousInvoiceGeneration: false,
  enableMetricUsageInvoicing: false,

  // PDF
  enablePdfInvoices: true,
  pdfPaperSize: "A4",            // A4 | Letter | Legal
  pdfFontFamily: "Helvetica",    // Courier | Freesans | Helvetica | Times | Dejavusans | Custom

  // Behaviour
  storeClientDataSnapshot: false,
  enableMassPayment: true,
  clientsChooseGateway: true,
  groupSimilarLineItems: true,

  // Lifecycle
  cancellationRequestHandling: true,   // auto-cancel unpaid on cancellation
  automaticSubscriptionManagement: false,
  enableProformaInvoicing: false,

  // Numbering
  sequentialPaidInvoiceNumbering: false,
  sequentialInvoiceNumberFormat: "{NUMBER}",   // supports {YEAR} {MONTH} {DAY} {NUMBER}
  nextPaidInvoiceNumber: 1,

  // Late fees
  lateFeeType: "Percentage",   // Percentage | Fixed
  lateFeeAmount: 10.00,
  lateFeeMinimum: 0.00,

  // Payment terms
  defaultDueDays: 7,
};

class InvoiceSettingsService {
  async get() {
    const row = await prisma.systemSetting.findUnique({ where: { key: SETTING_KEY } });
    if (!row) return { ...DEFAULTS };
    return { ...DEFAULTS, ...(row.value ?? {}) };
  }

  async update(data) {
    // Strip any keys not in DEFAULTS to avoid garbage
    const allowed = Object.keys(DEFAULTS);
    const clean = {};
    for (const k of allowed) {
      if (k in data) clean[k] = data[k];
    }

    const existing = await this.get();
    const merged = { ...existing, ...clean };

    await prisma.systemSetting.upsert({
      where: { key: SETTING_KEY },
      update: { value: merged },
      create: { key: SETTING_KEY, value: merged },
    });

    return merged;
  }
}

module.exports = new InvoiceSettingsService();
