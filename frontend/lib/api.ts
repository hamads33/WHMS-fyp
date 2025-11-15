// lib/api.ts
export const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  console.warn("⚠️ NEXT_PUBLIC_API_URL is missing in .env.local");
}

export async function apiGet(path: string) {
  try {
    const url = `${API_URL}${path}`;
    console.log("API GET →", url);

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json"
      }
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    return res.json();
  } catch (err) {
    console.error("API GET Error:", err);
    throw err;
  }
}
