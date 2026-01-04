import React, { useEffect, useState } from "react";
import { pluginApi } from "../utils/api";

export default function InvoicesList() {
  const [invoices, setInvoices] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    pluginApi("list_invoices")
      .then(res => setInvoices(res.invoices || []))
      .catch(e => setError(e.message));
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h2>Invoices</h2>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <table border="1" cellPadding="8">
        <thead>
          <tr>
            <th>ID</th>
            <th>Status</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map(inv => (
            <tr key={inv.id}>
              <td>
                <a href={`/plugins/invoice-manager/details?id=${inv.id}`}>
                  {inv.id}
                </a>
              </td>
              <td>{inv.status}</td>
              <td>{inv.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
