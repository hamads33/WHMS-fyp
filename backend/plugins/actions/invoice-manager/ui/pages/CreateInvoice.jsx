import React, { useState } from "react";
import { pluginApi } from "../utils/api";

export default function CreateInvoice() {
  const [clientId, setClientId] = useState("");
  const [amount, setAmount] = useState("");
  const [msg, setMsg] = useState("");

  async function submit() {
    try {
      const res = await pluginApi("create_invoice", {
        clientId,
        items: [{ description: "Test Item", price: Number(amount), qty: 1 }],
        dueDate: new Date().toISOString()
      });
      setMsg(`Invoice created: ${res.invoice.id}`);
    } catch (e) {
      setMsg(e.message);
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>Create Invoice</h2>

      <input
        placeholder="Client ID"
        value={clientId}
        onChange={e => setClientId(e.target.value)}
      />
      <br />

      <input
        placeholder="Amount"
        type="number"
        value={amount}
        onChange={e => setAmount(e.target.value)}
      />
      <br />

      <button onClick={submit}>Create</button>

      {msg && <p>{msg}</p>}
    </div>
  );
}
