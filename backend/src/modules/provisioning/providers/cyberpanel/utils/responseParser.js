function coerceToString(value) {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function tryParseJson(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function normalizeExecutionResult(rawResult) {
  if (typeof rawResult === "string") {
    return {
      success: true,
      code: 0,
      stdout: rawResult,
      stderr: "",
      output: rawResult,
      parsed: tryParseJson(rawResult),
      raw: rawResult,
    };
  }

  const stdout = coerceToString(
    rawResult?.stdout ?? rawResult?.output ?? rawResult?.data ?? rawResult?.result ?? ""
  );
  const stderr = coerceToString(rawResult?.stderr ?? rawResult?.error ?? "");
  const code = Number.isInteger(rawResult?.code) ? rawResult.code : 0;
  const success = typeof rawResult?.success === "boolean"
    ? rawResult.success
    : code === 0 && !stderr;
  const output = stdout || stderr;

  return {
    success,
    code,
    stdout,
    stderr,
    output,
    parsed: tryParseJson(stdout) || tryParseJson(rawResult?.output),
    raw: rawResult,
  };
}

function detectCyberPanelSuccess(result) {
  if (!result) return false;
  if (result.success === true && !result.stderr) return true;

  const parsed = result.parsed;
  if (parsed && typeof parsed === "object") {
    const status = String(parsed.status ?? parsed.success ?? "").toLowerCase();
    if (status === "1" || status === "true" || status === "success") return true;
    const state = String(parsed.state ?? "").toLowerCase();
    if (state === "completed" || state === "success") return true;
  }

  const output = String(result.output || "").toLowerCase();
  if (output.includes("successfully")) return true;
  if (output.includes("created")) return true;
  return false;
}

function normalizeProviderError(error, context = {}) {
  const normalized = new Error(error?.message || "CyberPanel provider operation failed");
  normalized.name = "CyberPanelProviderError";
  normalized.statusCode = error?.statusCode || 500;
  normalized.code = error?.code || "CYBERPANEL_PROVIDER_ERROR";
  normalized.context = context;
  normalized.cause = error;
  return normalized;
}

function extractWebsiteDomains(result) {
  const parsed = result?.parsed;
  if (Array.isArray(parsed)) {
    return parsed
      .map((entry) => entry.domain || entry.domainName || entry.website)
      .filter(Boolean);
  }

  if (parsed && Array.isArray(parsed.data)) {
    return parsed.data
      .map((entry) => entry.domain || entry.domainName || entry.website)
      .filter(Boolean);
  }

  const stdout = String(result?.stdout || "");
  return stdout
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("{") && !line.startsWith("["));
}

module.exports = {
  normalizeExecutionResult,
  detectCyberPanelSuccess,
  normalizeProviderError,
  extractWebsiteDomains,
};
