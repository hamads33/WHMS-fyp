import React, { useEffect, useState } from "react";
import { pluginApi } from "../utils/api";

export default function InvoiceDetails() {
  const params = new URLSearchParams(window.location.search);
  const invoiceId = params.get("id");

  const [invoice, setInvoice] = useState(null);

  useEffect(() => {
    if (!invoiceId) return;
    pluginApi("get_invoice", { invoiceId })
      .then(res => setInvoice(res.invoice));
  }, [invoiceId]);

  if (!invoice) return <p>Loading...</p>;

  return (
    <div style={{ padding: 24 }}>
      <h2>Invoice {invoice.id}</h2>
      <p>Status: {invoice.status}</p>
      <p>Total: {invoice.total}</p>
    </div>
  );
}
