export async function apiGetInvoices() {
  const res = await fetch("/api/invoices");
  return res.json();
}

export async function apiGetRevenue() {
  const res = await fetch("/api/invoices/revenue");
  return res.json();
}
