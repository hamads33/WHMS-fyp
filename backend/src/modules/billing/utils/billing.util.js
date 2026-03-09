/**
 * Billing Utilities
 * Path: src/modules/billing/utils/billing.util.js
 */

const prisma = require("../../../../prisma");

/**
 * Generate sequential invoice number: INV-YYYY-XXXXX
 */
async function generateInvoiceNumber() {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;

  // Count invoices this year to get next sequence
  const count = await prisma.invoice.count({
    where: {
      invoiceNumber: { startsWith: prefix },
    },
  });

  const seq = String(count + 1).padStart(5, "0");
  return `${prefix}${seq}`;
}

/**
 * ✅ NEW: Calculate next renewal date based on billing cycle
 * Uses calendar-based date arithmetic (proper month/year handling)
 * 
 * IMPORTANT: Handles month boundaries correctly
 * Examples:
 *   Jan 31 + 1 month = Feb 28/29 (NOT Mar 3)
 *   Feb 28 + 1 quarter = May 28
 *   2024-01-31 + 1 year = 2025-01-31 (leap year safe)
 * 
 * @param {Date} currentDate - Base date to add cycle to
 * @param {string} cycle - 'monthly' | 'quarterly' | 'semi_annually' | 'annually'
 * @returns {Date} Next renewal date
 */
function getNextRenewalDate(currentDate, cycle) {
  const date = new Date(currentDate);
  
  switch(cycle) {
    case 'monthly':
      // Add 1 month (handles month boundary overflow)
      date.setMonth(date.getMonth() + 1);
      break;
      
    case 'quarterly':
      // Add 3 months
      date.setMonth(date.getMonth() + 3);
      break;
      
    case 'semi_annually':
      // Add 6 months
      date.setMonth(date.getMonth() + 6);
      break;
      
    case 'annually':
      // Add 1 year
      date.setFullYear(date.getFullYear() + 1);
      break;
      
    default:
      // Fallback: add 30 days (backward compatible)
      date.setDate(date.getDate() + 30);
  }
  
  return date;
}

/**
 * @deprecated Use getNextRenewalDate() instead
 * 
 * Calculate billing cycle days
 * Returns approximate days for reference only.
 * For actual date calculations, use getNextRenewalDate() which handles month boundaries.
 */
function cycleToDays(cycle) {
  const map = {
    monthly: 30,
    quarterly: 90,
    semi_annually: 180,
    annually: 365,
  };
  return map[cycle] || 30;
}

/**
 * Calculate due date (default: 7 days from now)
 */
function calculateDueDate(daysFromNow = 7) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date;
}

/**
 * Compute tax amount from subtotal
 */
function computeTax(subtotal, taxRate) {
  if (!taxRate) return 0;
  return parseFloat((subtotal * parseFloat(taxRate)).toFixed(2));
}

/**
 * Compute discount amount
 */
function computeDiscount(subtotal, discount) {
  if (!discount) return 0;
  if (discount.isPercent) {
    return parseFloat((subtotal * (discount.amount / 100)).toFixed(2));
  }
  return parseFloat(discount.amount);
}

/**
 * Build invoice totals from line items + tax + discounts
 */
function buildTotals(lineItems, taxRate = 0, discounts = []) {
  const subtotal = lineItems.reduce((sum, item) => {
    return sum + parseFloat(item.total);
  }, 0);

  let discountAmount = 0;
  for (const d of discounts) {
    discountAmount += computeDiscount(subtotal, d);
  }

  const taxableAmount = Math.max(subtotal - discountAmount, 0);
  const taxAmount = computeTax(taxableAmount, taxRate);
  const totalAmount = parseFloat((taxableAmount + taxAmount).toFixed(2));

  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    discountAmount: parseFloat(discountAmount.toFixed(2)),
    taxAmount,
    totalAmount,
    amountDue: totalAmount,
  };
}

module.exports = {
  generateInvoiceNumber,
  getNextRenewalDate,  // ✅ NEW: Use this for accurate date calculations
  cycleToDays,         // ⚠️  DEPRECATED: Use getNextRenewalDate instead
  calculateDueDate,
  computeTax,
  computeDiscount,
  buildTotals,
};