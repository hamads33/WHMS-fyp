const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

function money(n) {
  return Number(n).toFixed(2);
}

module.exports = {
  id: "invoice_pdf_generator",
  name: "Invoice PDF Generator",
  version: "1.0.0",

  async execute(ctx, config) {
    const {
      invoiceNumber,
      clientName,
      clientEmail,
      items,
      currency = "USD"
    } = config;

    // 🔥 fix: ensure items is always an array
    const safeItems = Array.isArray(items) ? items : [];

    const pdf = await PDFDocument.create();
    const page = pdf.addPage([600, 750]);

    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

    let y = 700;

    function write(text, bold = false, size = 14) {
      page.drawText(text, {
        x: 50,
        y,
        size,
        font: bold ? fontBold : font,
        color: rgb(0, 0, 0)
      });
      y -= 22;
    }

    write("INVOICE", true, 24);
    y -= 10;
    write(`Invoice #${invoiceNumber}`, true);
    write(`Client: ${clientName}`);
    if (clientEmail) write(`Email: ${clientEmail}`);

    y -= 20;
    write("Items", true);

    let total = 0;

    // 🔥 fix: loop over safeItems instead
    safeItems.forEach((item) => {
      const line = `${item.qty}x ${item.name} — ${currency} ${money(
        item.qty * item.price
      )}`;
      write(line);
      total += item.qty * item.price;
    });

    y -= 20;
    write(`Total: ${currency} ${money(total)}`, true);

    const pdfBytes = await pdf.save();
    const base64 = Buffer.from(pdfBytes).toString("base64");

    return {
      ok: true,
      invoiceNumber,
      total,
      pdfBase64: base64,
      message: "PDF invoice generated successfully"
    };
  },

  async test(input) {
    return this.execute(
      { test: true },
      {
        invoiceNumber: input.invoiceNumber || "TST-001",
        clientName: input.clientName || "Test Client",
        clientEmail: input.clientEmail || "test@example.com",
        items: input.items || [
          { name: "Hosting Plan", qty: 1, price: 10 },
          { name: "Domain Renewal", qty: 1, price: 12 }
        ],
        currency: "USD"
      }
    );
  }
};
