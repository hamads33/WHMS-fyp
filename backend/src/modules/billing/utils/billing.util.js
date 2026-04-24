/**
 * Billing Utility Functions
 * Path: src/modules/billing/utils/billing.util.js
 *
 * Shared helpers for billing cycle calculations, date math,
 * and invoice helpers used across billing, order, and renewal modules.
 */

// ============================================================
// BILLING CYCLE DEFINITIONS
// ============================================================

const CYCLE_MONTHS = {
  monthly: 1,
  quarterly: 3,
  semi_annually: 6,
  annually: 12,
  biennially: 24,
  triennially: 36,
};

const CYCLE_LABELS = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  semi_annually: "Semi-Annually",
  annually: "Annually",
  biennially: "Biennially",
  triennially: "Triennially",
};

const CYCLE_ORDER = [
  "monthly",
  "quarterly",
  "semi_annually",
  "annually",
  "biennially",
  "triennially",
];

// ============================================================
// DATE CALCULATIONS
// ============================================================

/**
 * Calculate the next renewal date from a base date and billing cycle.
 * Uses calendar-accurate month arithmetic (avoids 30-day shortcuts).
 *
 * @param {Date|string} from - Base date
 * @param {string} cycle - Billing cycle key
 * @returns {Date}
 */
function getNextRenewalDate(from, cycle) {
  const date = new Date(from);
  const months = CYCLE_MONTHS[cycle];

  if (!months) {
    throw new Error(`Unknown billing cycle: "${cycle}"`);
  }

  date.setMonth(date.getMonth() + months);
  return date;
}

/**
 * Calculate invoice due date from issue date.
 * Defaults to 7 days (NET-7).
 *
 * @param {Date|string} issueDate
 * @param {number} days - Payment term in days
 * @returns {Date}
 */
function calculateDueDate(issueDate, days = 7) {
  const date = new Date(issueDate);
  date.setDate(date.getDate() + days);
  return date;
}

/**
 * Check whether an invoice is overdue based on its dueDate and status.
 *
 * @param {Object} invoice - Prisma invoice record
 * @returns {boolean}
 */
function isOverdue(invoice) {
  if (!invoice.dueDate) return false;
  if (["paid", "cancelled", "refunded"].includes(invoice.status)) return false;
  return new Date() > new Date(invoice.dueDate);
}

/**
 * Check whether an order is due for renewal.
 *
 * @param {Object} order - Prisma order record
 * @param {number} daysAhead - Consider due if renewal is within N days
 * @returns {boolean}
 */
function isDueForRenewal(order, daysAhead = 3) {
  if (order.status !== "active" || !order.nextRenewalAt) return false;

  const now = new Date();
  const renewalWindow = new Date();
  renewalWindow.setDate(now.getDate() + daysAhead);

  return new Date(order.nextRenewalAt) <= renewalWindow;
}

// ============================================================
// CYCLE HELPERS
// ============================================================

/**
 * Human-readable label for a billing cycle.
 * @param {string} cycle
 * @returns {string}
 */
function getCycleLabel(cycle) {
  return CYCLE_LABELS[cycle] || cycle;
}

/**
 * Number of calendar months for a billing cycle.
 * @param {string} cycle
 * @returns {number}
 */
function getCycleMonths(cycle) {
  return CYCLE_MONTHS[cycle] || 1;
}

/**
 * Sort cycles in ascending duration order.
 * @param {string[]} cycles
 * @returns {string[]}
 */
function sortCycles(cycles) {
  return [...cycles].sort(
    (a, b) => CYCLE_ORDER.indexOf(a) - CYCLE_ORDER.indexOf(b)
  );
}

// ============================================================
// COST CALCULATIONS
// ============================================================

/**
 * Apply a discount to a subtotal.
 * Returns the discount amount (not the final price).
 *
 * @param {number} subtotal
 * @param {string|null} discountType - "percentage" | "fixed" | null
 * @param {number} discountAmount
 * @returns {number}
 */
function applyDiscount(subtotal, discountType, discountAmount) {
  if (!discountType || !discountAmount) return 0;

  const amount = parseFloat(discountAmount) || 0;

  if (discountType === "percentage") {
    return parseFloat(((subtotal * Math.min(amount, 100)) / 100).toFixed(2));
  }

  if (discountType === "fixed") {
    return parseFloat(Math.min(amount, subtotal).toFixed(2));
  }

  return 0;
}

/**
 * Round a number to 2 decimal places (safe for currency).
 * @param {number} value
 * @returns {number}
 */
function toCurrency(value) {
  return parseFloat(parseFloat(value || 0).toFixed(2));
}

// ============================================================
// INVOICE NUMBER GENERATION
// ============================================================

/**
 * Build the invoice number prefix for a given year.
 * @param {number} [year]
 * @returns {string}
 */
function getInvoicePrefix(year) {
  return `INV-${year || new Date().getFullYear()}-`;
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  // Constants
  CYCLE_MONTHS,
  CYCLE_LABELS,
  CYCLE_ORDER,

  // Date math
  getNextRenewalDate,
  calculateDueDate,
  isOverdue,
  isDueForRenewal,

  // Cycle helpers
  getCycleLabel,
  getCycleMonths,
  sortCycles,

  // Cost helpers
  applyDiscount,
  toCurrency,

  // Invoice helpers
  getInvoicePrefix,
};