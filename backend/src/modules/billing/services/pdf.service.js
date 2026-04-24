/**
 * PDF Service — Invoice PDF Generation
 * Generates professional invoice PDFs using PDFKit.
 */

const PDFDocument = require("pdfkit");

// ── Colours & fonts ──────────────────────────────────────────────────────────

const BRAND   = "#1e293b";   // dark navy header
const ACCENT  = "#3b82f6";   // blue accent
const TEXT    = "#1e293b";
const MUTED   = "#64748b";
const LIGHT   = "#f8fafc";
const BORDER  = "#e2e8f0";
const SUCCESS = "#16a34a";
const WARN    = "#d97706";
const DANGER  = "#dc2626";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(amount, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(parseFloat(amount) || 0);
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function statusColor(status) {
  switch (status) {
    case "paid":     return SUCCESS;
    case "overdue":  return DANGER;
    case "cancelled":return MUTED;
    default:         return WARN;  // unpaid / draft
  }
}

// ── Main generator ────────────────────────────────────────────────────────────

/**
 * Generate an invoice PDF and return it as a Buffer.
 *
 * @param {Object} invoice  - Full invoice object with lineItems, discounts,
 *                            client, billingProfile, order relations
 * @param {Object} settings - Invoice settings (company name, address, logo, etc.)
 * @returns {Promise<Buffer>}
 */
async function generateInvoicePDF(invoice, settings = {}) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 50,
      info: {
        Title: `Invoice ${invoice.invoiceNumber}`,
        Author: settings.companyName || "WHMS",
        Subject: `Invoice for ${invoice.client?.email || "client"}`,
      },
    });

    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end",  () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageW = doc.page.width;
    const margin = 50;
    const contentW = pageW - margin * 2;

    // ── HEADER ─────────────────────────────────────────────────────────────

    // Dark navy header bar
    doc.rect(0, 0, pageW, 110).fill(BRAND);

    // Company name / logo text
    doc.fillColor("#ffffff")
       .fontSize(22)
       .font("Helvetica-Bold")
       .text(settings.companyName || "WHMS", margin, 30, { width: contentW / 2 });

    if (settings.companyTagline) {
      doc.fillColor("#94a3b8")
         .fontSize(9)
         .font("Helvetica")
         .text(settings.companyTagline, margin, 56, { width: contentW / 2 });
    }

    // INVOICE label (right side of header)
    doc.fillColor("#ffffff")
       .fontSize(28)
       .font("Helvetica-Bold")
       .text("INVOICE", margin + contentW / 2, 28, { width: contentW / 2, align: "right" });

    doc.fillColor("#94a3b8")
       .fontSize(9)
       .font("Helvetica")
       .text(invoice.invoiceNumber, margin + contentW / 2, 62, { width: contentW / 2, align: "right" });

    // Status badge
    const badgeColor = statusColor(invoice.status);
    const badgeText  = (invoice.status || "DRAFT").toUpperCase();
    const badgeY     = 75;
    doc.fillColor(badgeColor)
       .roundedRect(pageW - margin - 80, badgeY, 80, 20, 4)
       .fill();
    doc.fillColor("#ffffff")
       .fontSize(8)
       .font("Helvetica-Bold")
       .text(badgeText, pageW - margin - 78, badgeY + 6, { width: 76, align: "center" });

    doc.moveDown(0.5);

    // ── META ROW (invoice date, due date) ──────────────────────────────────

    const metaY = 130;
    doc.fillColor(TEXT).font("Helvetica-Bold").fontSize(8);

    const metaFields = [
      { label: "Invoice Date", value: fmtDate(invoice.issuedAt || invoice.createdAt) },
      { label: "Due Date",     value: fmtDate(invoice.dueDate)                       },
      { label: "Currency",     value: invoice.currency || "USD"                      },
    ];

    const colW = contentW / metaFields.length;
    metaFields.forEach(({ label, value }, i) => {
      const x = margin + i * colW;
      doc.fillColor(MUTED).font("Helvetica").fontSize(7).text(label.toUpperCase(), x, metaY);
      doc.fillColor(TEXT).font("Helvetica-Bold").fontSize(10).text(value, x, metaY + 12);
    });

    // ── BILL TO / FROM COLUMNS ─────────────────────────────────────────────

    const addrY = 185;
    const colHalf = contentW / 2 - 10;

    // "From" box (left)
    doc.rect(margin, addrY, colHalf, 100).fillAndStroke(LIGHT, BORDER);

    doc.fillColor(ACCENT).font("Helvetica-Bold").fontSize(7)
       .text("FROM", margin + 12, addrY + 10);
    doc.fillColor(TEXT).font("Helvetica-Bold").fontSize(10)
       .text(settings.companyName || "WHMS", margin + 12, addrY + 22);
    doc.fillColor(MUTED).font("Helvetica").fontSize(8)
       .text(
         [
           settings.companyAddress,
           settings.companyCity,
           settings.companyEmail,
           settings.companyPhone,
         ].filter(Boolean).join("\n"),
         margin + 12, addrY + 38,
         { width: colHalf - 24 }
       );

    // "Bill To" box (right)
    const rightX = margin + colHalf + 20;
    doc.rect(rightX, addrY, colHalf, 100).fillAndStroke(LIGHT, BORDER);

    const bp = invoice.billingProfile;
    doc.fillColor(ACCENT).font("Helvetica-Bold").fontSize(7)
       .text("BILL TO", rightX + 12, addrY + 10);
    doc.fillColor(TEXT).font("Helvetica-Bold").fontSize(10)
       .text(
         bp
           ? [bp.firstName, bp.lastName].filter(Boolean).join(" ") ||
             invoice.client?.email || "Client"
           : invoice.client?.email || "Client",
         rightX + 12, addrY + 22
       );
    doc.fillColor(MUTED).font("Helvetica").fontSize(8)
       .text(
         [
           invoice.client?.email,
           bp?.address,
           bp?.city && bp?.country ? `${bp.city}, ${bp.country}` : bp?.city || bp?.country,
           bp?.postalCode,
           bp?.taxId ? `Tax ID: ${bp.taxId}` : null,
         ].filter(Boolean).join("\n"),
         rightX + 12, addrY + 38,
         { width: colHalf - 24 }
       );

    // ── LINE ITEMS TABLE ───────────────────────────────────────────────────

    const tableY = addrY + 115;
    const cols = {
      desc:  { x: margin,              w: contentW * 0.45 },
      qty:   { x: margin + contentW * 0.45, w: contentW * 0.10, align: "center" },
      price: { x: margin + contentW * 0.55, w: contentW * 0.20, align: "right"  },
      tax:   { x: margin + contentW * 0.75, w: contentW * 0.12, align: "right"  },
      total: { x: margin + contentW * 0.87, w: contentW * 0.13, align: "right"  },
    };

    // Table header
    doc.rect(margin, tableY, contentW, 22).fill(BRAND);
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(8);
    [
      { key: "desc",  label: "Description"  },
      { key: "qty",   label: "Qty"          },
      { key: "price", label: "Unit Price"   },
      { key: "tax",   label: "Tax"          },
      { key: "total", label: "Total"        },
    ].forEach(({ key, label }) => {
      const c = cols[key];
      doc.text(label, c.x + 6, tableY + 7, { width: c.w - 6, align: c.align || "left" });
    });

    // Table rows
    let rowY = tableY + 22;
    const lineItems = invoice.lineItems || [];

    lineItems.forEach((li, i) => {
      const rowH   = 34;
      const bgColor = i % 2 === 0 ? "#ffffff" : LIGHT;
      doc.rect(margin, rowY, contentW, rowH).fill(bgColor);

      // Description + sub-label
      doc.fillColor(TEXT).font("Helvetica-Bold").fontSize(8.5)
         .text(li.description || "Service", cols.desc.x + 6, rowY + 8, {
           width: cols.desc.w - 10, ellipsis: true,
         });
      if (li.planName || li.cycle) {
        doc.fillColor(MUTED).font("Helvetica").fontSize(7)
           .text(
             [li.planName, li.cycle].filter(Boolean).join(" · "),
             cols.desc.x + 6, rowY + 20,
             { width: cols.desc.w - 10 }
           );
      }

      doc.fillColor(TEXT).font("Helvetica").fontSize(8.5);
      doc.text(String(li.quantity || 1),
        cols.qty.x, rowY + 12, { width: cols.qty.w, align: "center" });
      doc.text(fmt(li.unitPrice, invoice.currency),
        cols.price.x, rowY + 12, { width: cols.price.w - 6, align: "right" });
      doc.text(li.taxRate ? `${(parseFloat(li.taxRate) * 100).toFixed(0)}%` : "—",
        cols.tax.x, rowY + 12, { width: cols.tax.w - 6, align: "right" });
      doc.font("Helvetica-Bold")
         .text(fmt(li.total, invoice.currency),
           cols.total.x, rowY + 12, { width: cols.total.w - 6, align: "right" });

      // Row border
      doc.strokeColor(BORDER).lineWidth(0.5)
         .moveTo(margin, rowY + rowH).lineTo(margin + contentW, rowY + rowH).stroke();

      rowY += rowH;
    });

    // ── TOTALS BOX ─────────────────────────────────────────────────────────

    const totalsX = margin + contentW * 0.55;
    const totalsW = contentW * 0.45;
    let totalsY   = rowY + 15;

    function totalRow(label, value, bold = false, color = TEXT) {
      doc.fillColor(MUTED).font("Helvetica").fontSize(8.5)
         .text(label, totalsX, totalsY, { width: totalsW * 0.55 });
      doc.fillColor(color).font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(8.5)
         .text(value, totalsX, totalsY, { width: totalsW - 6, align: "right" });
      totalsY += 16;
    }

    totalRow("Subtotal",          fmt(invoice.subtotal,        invoice.currency));
    if (parseFloat(invoice.taxAmount) > 0)
      totalRow("Tax",             fmt(invoice.taxAmount,       invoice.currency));
    if (parseFloat(invoice.discountAmount) > 0)
      totalRow("Discount",       `-${fmt(invoice.discountAmount, invoice.currency)}`);
    if (parseFloat(invoice.amountPaid) > 0)
      totalRow("Amount Paid",    `-${fmt(invoice.amountPaid,   invoice.currency)}`, false, SUCCESS);

    totalsY += 4;
    // Total due highlight
    doc.rect(totalsX, totalsY, totalsW, 28).fill(BRAND);
    doc.fillColor("#94a3b8").font("Helvetica").fontSize(8)
       .text("AMOUNT DUE", totalsX + 10, totalsY + 8);
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(14)
       .text(
         fmt(invoice.amountDue, invoice.currency),
         totalsX, totalsY + 7,
         { width: totalsW - 10, align: "right" }
       );

    // ── DISCOUNTS LIST ────────────────────────────────────────────────────

    if ((invoice.discounts || []).length > 0) {
      let discY = rowY + 15;
      doc.fillColor(ACCENT).font("Helvetica-Bold").fontSize(7)
         .text("APPLIED DISCOUNTS", margin, discY);
      discY += 12;
      invoice.discounts.forEach(d => {
        doc.fillColor(MUTED).font("Helvetica").fontSize(8)
           .text(
             `• ${d.description || d.code || d.type}  ${d.isPercent ? `${d.amount}%` : fmt(d.amount, invoice.currency)} off`,
             margin, discY, { width: contentW * 0.5 }
           );
        discY += 14;
      });
    }

    // ── NOTES ────────────────────────────────────────────────────────────

    if (invoice.notes) {
      const notesY = Math.max(totalsY + 44, rowY + 15);
      doc.fillColor(ACCENT).font("Helvetica-Bold").fontSize(7)
         .text("NOTES", margin, notesY);
      doc.fillColor(MUTED).font("Helvetica").fontSize(8.5)
         .text(invoice.notes, margin, notesY + 12, { width: contentW * 0.5 });
    }

    // ── PAYMENT HISTORY ───────────────────────────────────────────────────

    const payments = invoice.payments || [];
    if (payments.length > 0) {
      const phpY = totalsY + 55;
      doc.fillColor(ACCENT).font("Helvetica-Bold").fontSize(7)
         .text("PAYMENT HISTORY", margin, phpY);

      let phRowY = phpY + 12;
      doc.rect(margin, phRowY, contentW, 16).fill(BRAND);
      doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(7);
      doc.text("Date",        margin + 6,               phRowY + 4, { width: 100 });
      doc.text("Gateway",     margin + 110,              phRowY + 4, { width: 80  });
      doc.text("Reference",   margin + 200,              phRowY + 4, { width: 160 });
      doc.text("Amount",      margin + contentW - 80,    phRowY + 4, { width: 74, align: "right" });
      doc.text("Status",      margin + contentW - 6,     phRowY + 4, { width: 0  });
      phRowY += 16;

      payments.forEach((p, i) => {
        doc.rect(margin, phRowY, contentW, 14).fill(i % 2 === 0 ? "#fff" : LIGHT);
        doc.fillColor(TEXT).font("Helvetica").fontSize(7.5);
        doc.text(fmtDate(p.paidAt || p.createdAt), margin + 6,            phRowY + 3, { width: 100 });
        doc.text(p.gateway || "manual",            margin + 110,           phRowY + 3, { width: 80  });
        doc.text(p.gatewayRef || "—",              margin + 200,           phRowY + 3, { width: 160 });
        doc.text(fmt(p.amount, invoice.currency),  margin + contentW - 80, phRowY + 3, { width: 74, align: "right" });
        doc.fillColor(p.status === "completed" ? SUCCESS : MUTED).font("Helvetica-Bold").fontSize(6.5)
           .text((p.status || "").toUpperCase(), margin + contentW - 6, phRowY + 4);
        phRowY += 14;
      });
    }

    // ── FOOTER ────────────────────────────────────────────────────────────

    const footerY = doc.page.height - 55;
    doc.rect(0, footerY, pageW, 55).fill(LIGHT);
    doc.strokeColor(BORDER).lineWidth(0.5)
       .moveTo(0, footerY).lineTo(pageW, footerY).stroke();

    doc.fillColor(MUTED).font("Helvetica").fontSize(7.5)
       .text(
         settings.footerText ||
           `Thank you for your business. Please include invoice number ${invoice.invoiceNumber} with your payment.`,
         margin, footerY + 10,
         { width: contentW, align: "center" }
       );

    if (settings.companyEmail || settings.companyPhone) {
      doc.fillColor(MUTED).font("Helvetica").fontSize(7)
         .text(
           [settings.companyEmail, settings.companyPhone].filter(Boolean).join("  ·  "),
           margin, footerY + 28,
           { width: contentW, align: "center" }
         );
    }

    doc.fillColor(BORDER).font("Helvetica").fontSize(7)
       .text(
         `Page 1  ·  Generated ${new Date().toLocaleDateString()}`,
         margin, footerY + 40,
         { width: contentW, align: "center" }
       );

    doc.end();
  });
}

module.exports = { generateInvoicePDF };
