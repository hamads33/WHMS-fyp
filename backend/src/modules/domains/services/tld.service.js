const tldRepo = require("../repositories/tld.repository");
const porkbun = require("../domainProviders/porkbun.provider");

exports.getAll = () => {
  return tldRepo.findAll();
};

// ------------------------------------------------------
// SAFE CREATE / UPDATE
// Only update specific allowed fields (registerPrice, markupPercent)
// ------------------------------------------------------
exports.createOrUpdate = async (data) => {
  const existing = await tldRepo.findByName(data.name);

 if (!existing) {
  return tldRepo.upsert({
    name: data.name,
    registerPrice: data.registerPrice ?? 0,
    renewPrice: 0,
    transferPrice: 0,
    markupPercent: data.markupPercent ?? 0,
    active: true,
    providerData: existing?.providerData ?? {},
    lastSynced: existing?.lastSynced ?? null,
  });
}


  // Update existing
  return tldRepo.upsert({
  name: existing.name,
  registerPrice: data.registerPrice ?? existing.registerPrice,
  renewPrice: existing.renewPrice,
  transferPrice: existing.transferPrice,
  markupPercent: data.markupPercent ?? existing.markupPercent,
  active: existing.active,
  providerData: existing.providerData ?? {},
  lastSynced: existing.lastSynced ?? null,
});

};

// ------------------------------------------------------
// VALIDATE TLD NAME
// Example allowed: com, net, io, co.uk, org.pk
// Disallowed: numeric, garbage, "247", "777", "abc123x"
// ------------------------------------------------------
function isValidTld(key) {
  return (
    /^[a-z0-9.-]+$/.test(key) && // valid chars
    !/^[0-9]/.test(key)         // can't start with number
  );
}

// ------------------------------------------------------
// SYNC FROM PORKBUN → DB
// Creates clean TLDs only
// ------------------------------------------------------
exports.syncWithPorkbun = async () => {
  const pricing = await porkbun.getPricing();

  if (!pricing?.pricing) {
    throw new Error("Invalid pricing response from Porkbun");
  }

  let count = 0;

  for (const key of Object.keys(pricing.pricing)) {
    if (!isValidTld(key)) continue;

    const p = pricing.pricing[key];
    const tld = key.toLowerCase();

    const name = tld.startsWith(".") ? tld : `.${tld}`;

    await tldRepo.upsert({
      name,
      registerPrice: Math.round((p.registration?.amount || 0) * 100),
      renewPrice: Math.round((p.renewal?.amount || 0) * 100),
      transferPrice: Math.round((p.transfer?.amount || 0) * 100),
      markupPercent: 0, // preserve markup separate
      active: true,
      providerData: p,
      lastSynced: new Date(),
    });

    count++;
  }

  return count;
};
