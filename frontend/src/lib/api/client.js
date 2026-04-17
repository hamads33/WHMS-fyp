export function getErrorMessage(err) {
  if (!err) return 'An unknown error occurred'
  if (typeof err === 'string') return err
  return err.message || 'Something went wrong'
}

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
    if (typeof window !== "undefined") {
      const path = window.location.pathname;
      const isLoginPage = path.endsWith("/login") || path.includes("/login/");
      if (!isLoginPage) {
        const loginUrl = path.startsWith("/admin") ? "/admin/login" : "/login";
        window.location.href = loginUrl;
      }
    }
    throw new Error("UNAUTHENTICATED");
  }

  if (!res.ok) {
    const text = await res.text();
    let message = "Something went wrong. Please try again.";
    let fields = null;
    try {
      const json = JSON.parse(text);
      message = json.error || json.message || message;
      if (json.fields && typeof json.fields === "object") fields = json.fields;
    } catch {
      if (text) message = text;
    }
    const err = new Error(message);
    if (fields) err.fields = fields;
    throw err;
  }

  // Parse JSON with BigInt support
  const text = await res.text();
  try {
    // Use JSON.parse with BigInt replacer
    return JSON.parse(text, (_key, value) => {
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