import type { IpRule } from "./types/ipRule";

const JSON_HEADERS = { "Content-Type": "application/json" };
const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

console.log("DEBUG BASE_URL =", BASE_URL);

export const IpRulesAPI = {
  async listRules(): Promise<IpRule[]> {
    const res = await fetch(`${BASE_URL}/api/ip-rules`, { method: "GET" });
    if (!res.ok) throw new Error(`Failed to list ip rules (${res.status})`);
    const body = await res.json();
    return body?.rules ?? [];
  },

  async createRule(payload: {
    pattern: string;
    type: "ALLOW" | "DENY";
    description?: string;
    active?: boolean;
  }): Promise<IpRule> {
    const res = await fetch(`${BASE_URL}/api/ip-rules`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const txt = await safeText(res);
      throw new Error(`Create rule failed (${res.status}) ${txt}`);
    }
    const body = await res.json();
    return body.rule;
  },

  async updateRule(id: number, payload: Partial<{
  pattern: string;
  type: "ALLOW" | "DENY";
  description?: string;
  active?: boolean;
}>): Promise<IpRule> {
  const res = await fetch(`${BASE_URL}/api/ip-rules/${id}`, {
    method: "PATCH",
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const txt = await safeText(res);
    throw new Error(`Update rule failed (${res.status}) ${txt}`);
  }

  const body = await res.json();
  return body.rule;
},


  async deleteRule(id: number): Promise<void> {
    const res = await fetch(`${BASE_URL}/api/ip-rules/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const txt = await safeText(res);
      throw new Error(`Delete rule failed (${res.status}) ${txt}`);
    }
  },
};

async function safeText(res: Response) {
  try {
    return JSON.stringify(await res.json());
  } catch {
    try {
      return await res.text();
    } catch {
      return "";
    }
  }
}
