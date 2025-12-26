
// const fetch = require("node-fetch"); // Uncomment for Node.js version < 18

module.exports = {
  name: "http_request",
  type: "builtin",
  description: "Perform an HTTP request (internal or external)",

  schema: {
    type: "object",
    properties: {
      url: { type: "string", title: "Request URL" },
      method: {
        type: "string",
        enum: ["GET", "POST", "PUT", "PATCH", "DELETE"],
        default: "GET",
      },
      headers: {
        type: "object",
        additionalProperties: { type: "string" },
      },
      query: {
        type: "object",
        additionalProperties: { type: "string" },
      },
      body: { type: "object" },
      timeoutMs: { type: "number", default: 10000 },
    },
    required: ["url"],
  },

  async execute(meta = {}) {
    const {
      url,
      method = "GET",
      headers = {},
      query,
      body,
      timeoutMs = 10000,
    } = meta

    let finalUrl = url

    if (query && Object.keys(query).length) {
      finalUrl +=
        (url.includes("?") ? "&" : "?") +
        new URLSearchParams(query).toString()
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const res = await fetch(finalUrl, {
        method,
        headers: { "Content-Type": "application/json", ...headers },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })

      return {
        ok: res.ok,
        status: res.status,
        response: await res.text(),
      }
    } finally {
      clearTimeout(timer)
    }
  },
}
