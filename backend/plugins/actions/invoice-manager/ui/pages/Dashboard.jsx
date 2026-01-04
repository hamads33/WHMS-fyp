import React from "react";

export default function Dashboard() {
  return (
    <div style={{ padding: 24 }}>
      <h1>📄 Invoice Manager</h1>
      <p>Plugin is loaded and UI is working.</p>

      <ul>
        <li><a href="/plugins/invoice-manager/invoices">View Invoices</a></li>
        <li><a href="/plugins/invoice-manager/create">Create Invoice</a></li>
      </ul>
    </div>
  );
}
