import React, { useEffect, useState } from "react";
import { apiGetInvoices } from "../api";

export default function InvoiceTable() {
  const [invoices, setInvoices] = useState([]);

  useEffect(() => {
    apiGetInvoices().then(setInvoices);
  }, []);

  return (
    <table border="1" width="100%">
      <thead>
        <tr>
          <th>ID</th>
          <th>Client</th>
          <th>Total</th>
          <th>Date</th>
        </tr>
      </thead>
      <tbody>
        {invoices.map((i) => (
          <tr key={i.id}>
            <td>{i.id}</td>
            <td>{i.client}</td>
            <td>${i.total}</td>
            <td>{i.date}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
