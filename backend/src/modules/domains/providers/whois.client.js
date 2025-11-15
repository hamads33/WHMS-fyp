const whois = require("whois");
const { promisify } = require("util");

const lookupAsync = promisify(whois.lookup);

/**
 * Sanitize domain input.
 * Removes:
 * - http://, https://
 * - www.
 * - url paths (/page)
 */
function cleanDomain(domain) {
  return domain
    .trim()
    .replace(/^https?:\/\//, "")  // remove http:// or https://
    .replace(/^www\./, "")        // remove www.
    .split("/")[0]                // remove any paths after the domain
    .toLowerCase();
}

/**
 * WHOIS lookup wrapper.
 * Cleans domain before lookup.
 */
async function lookup(domain) {
  if (!domain) throw new Error("domain required");

  const clean = cleanDomain(domain);

  try {
    const res = await lookupAsync(clean, { timeout: 15000 });
    return res || "";
  } catch (err) {
    console.warn("❌ WHOIS lookup error:", err.message);
    return "";
  }
}

module.exports = { lookup, cleanDomain };
