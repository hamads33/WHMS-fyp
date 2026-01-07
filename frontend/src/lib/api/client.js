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
    throw new Error(String(text) || "API_ERROR");
  }

  // Parse JSON with BigInt support
  const text = await res.text();
  try {
    // Use JSON.parse with BigInt replacer
    return JSON.parse(text, (key, value) => {
      // Handle BigInt serialization if needed
      if (typeof value === 'string' && /^\d+n$/.test(value)) {
        return BigInt(value.slice(0, -1));
      }
      return value;
    });
  } catch (parseError) {
    // Fallback: try parsing without BigInt conversion
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`Failed to parse API response: ${text.slice(0, 100)}`);
    }
  }
}