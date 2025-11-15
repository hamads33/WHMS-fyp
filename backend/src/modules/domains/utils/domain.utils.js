function extractTld(domain) {
  if (!domain) return null;
  const parts = domain.split('.');
  return parts.length > 1 ? parts[parts.length - 1] : null;
}

module.exports = { extractTld };
