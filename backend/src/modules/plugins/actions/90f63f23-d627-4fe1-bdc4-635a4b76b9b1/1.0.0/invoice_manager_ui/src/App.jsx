import React from "react";
import AdminDashboard from "./admin/AdminDashboard";
import ClientInvoices from "./client/ClientInvoices";
import TotalRevenueWidget from "./widgets/TotalRevenueWidget";

window.pluginExports = {
  AdminDashboard,
  ClientInvoices,
  TotalRevenueWidget
};

export default function App() {
  return (
    <div style={{ padding: 20 }}>
      <h2>Invoice Manager UI Plugin</h2>
      <p>This React UI has been loaded successfully.</p>
    </div>
  );
}
