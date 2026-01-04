export async function pluginApi(action, payload = {}) {
  const res = await fetch(
    `/api/plugins/invoice-manager/actions/${action}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }
  );

  const data = await res.json();
  if (!res.ok || data.success === false) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}
