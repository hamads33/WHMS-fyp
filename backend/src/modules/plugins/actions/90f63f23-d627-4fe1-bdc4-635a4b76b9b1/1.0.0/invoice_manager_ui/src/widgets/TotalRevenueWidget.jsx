import React, { useEffect, useState } from "react";
import { apiGetRevenue } from "../api";

export default function TotalRevenueWidget() {
  const [amount, setAmount] = useState(0);

  useEffect(() => {
    apiGetRevenue().then(r => setAmount(r.total || 0));
  }, []);

  return (
    <div style={{ padding: 15, background: "#222", color: "#fff", borderRadius: 8 }}>
      <h3>Total Revenue</h3>
      <p style={{ fontSize: 24 }}>${amount}</p>
    </div>
  );
}
