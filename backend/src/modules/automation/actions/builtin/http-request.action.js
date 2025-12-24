// src/modules/automation/actions/builtin/http-request.action.js
const fetch = require("node-fetch");

module.exports = {
  key: "http_request",
  type: "builtin",
  description: "Perform an HTTP request (internal or external)",

  schema: {
    type: "object",
    properties: {
      url: {
        type: "string",
        title: "Request URL",
        description: "External URL or internal API endpoint",
      },
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
      body: {
        type: "object",
      },
      timeoutMs: {
        type: "number",
        default: 10000,
      },
    },
    required: ["url"],
  },

  async execute(meta = {}, ctx) {
    const {
      url,
      method = "GET",
      headers = {},
      query,
      body,
      timeoutMs,
    } = meta;

    let finalUrl = url;

    // append query params
    if (query && Object.keys(query).length) {
      const qs = new URLSearchParams(query).toString();
      finalUrl += (url.includes("?") ? "&" : "?") + qs;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(finalUrl, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      const text = await res.text();

      return {
        status: res.status,
        ok: res.ok,
        response: text,
      };
    } finally {
      clearTimeout(timer);
    }
  },
};
