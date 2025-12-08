import React, { useEffect, useState } from "react";
import { apiGetInvoices } from "../api";

export default function ClientInvoices() {
  const [invoices, setInvoices] = useState([]);

  useEffect(() => {
    apiGetInvoices().then(setInvoices);
  }, []);

  return (
    <div>
      <h2>Your Invoices</h2>
      {invoices.map(i => (
        <div key={i.id} style={{ padding: 10, borderBottom: "1px solid #ccc" }}>
          <p><b>Invoice #{i.id}</b></p>
          <p>Total: <b>${i.total}</b></p>
        </div>
      ))}
    </div>
  );
}
