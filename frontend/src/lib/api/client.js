export async function apiFetch(path, options = {}) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}${path}`,
    {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      ...options,
    }
  );

  if (res.status === 401) {
    throw new Error("UNAUTHENTICATED");
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "API_ERROR");
  }

  return res.json();
}