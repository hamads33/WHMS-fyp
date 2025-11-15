module.exports = function parseWhois(raw) {
  if (!raw) return {};

  const extract = (pattern) => {
    const match = raw.match(pattern);
    return match ? match[1].trim() : null;
  };

  // Registrar
  const registrar =
    extract(/Registrar:\s*(.+)/i) ||
    extract(/Registrar Name:\s*(.+)/i) ||
    extract(/Registrar URL:\s*(.+)/i);

  // Creation Date
  const created =
    extract(/Creation Date:\s*(.+)/i) ||
    extract(/Created On:\s*(.+)/i);

  // Updated Date
  const updated =
    extract(/Updated Date:\s*(.+)/i) ||
    extract(/Last Updated:\s*(.+)/i);

  // Expiry Date
  const expires =
    extract(/Registry Expiry Date:\s*(.+)/i) ||
    extract(/Expiration Date:\s*(.+)/i) ||
    extract(/Expiry Date:\s*(.+)/i);

  // Status
  const status =
    extract(/Domain Status:\s*([^\s]+)/i) ||
    extract(/Status:\s*(.+)/i);

  // Nameservers (multi-line)
  const nsMatches = raw.match(/Name Server:\s*(.+)/gi) || [];
  const nameServers = nsMatches.map((line) =>
    line.replace(/Name Server:/i, "").trim()
  );

  return {
    registrar: registrar || "Unknown",
    created: created || "N/A",
    updated: updated || "N/A",
    expires: expires || "N/A",
    status: status || "unknown",
    nameServers,
  };
};
