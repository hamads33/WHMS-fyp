const REQUIRED_TYPES = ["registrant", "admin"];

function validateContacts(contacts = []) {
  if (!Array.isArray(contacts) || contacts.length === 0) {
    throw new Error("WHOIS contacts are required");
  }

  const types = contacts.map(c => c.type);

  for (const required of REQUIRED_TYPES) {
    if (!types.includes(required)) {
      throw new Error(`Missing required WHOIS contact: ${required}`);
    }
  }

  for (const c of contacts) {
    if (!c.type || !c.name || !c.email || !c.country) {
      throw new Error("Invalid WHOIS contact data");
    }
  }

  return true;
}

module.exports = { validateContacts };
