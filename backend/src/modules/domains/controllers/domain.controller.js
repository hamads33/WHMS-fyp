const domainService = require('../services/domain.service');

exports.getAllDomains = async (req, res) => {
  try {
    const list = await domainService.getAllDomains();
    return res.json({ success: true, data: list });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

exports.getDomainById = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ success: false, error: 'Invalid domain id' });
    }
    const domain = await domainService.getDomainById(id);
    if (!domain) return res.status(404).json({ success: false, error: 'Domain not found' });
    return res.json({ success: true, data: domain });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

exports.checkAvailability = async (req, res) => {
  try {
    const { domain } = req.query;
    if (!domain) return res.status(400).json({ success: false, error: 'domain query required' });
    const result = await domainService.checkAvailability(String(domain));
    return res.json({ success: true, data: result });
  } catch (err) {
    console.error(err);
    return res.status(400).json({ success: false, error: err.message });
  }
};

exports.whoisLookup = async (req, res) => {
  try {
    const domain = req.query.domain;

    if (!domain) {
      return res.status(400).json({ success: false, error: "domain query required" });
    }

    // Clean input: remove http://, https://, slashes
    const cleaned = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "");

    const result = await domainService.whoisLookup(cleaned);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: "WHOIS lookup failed or no data found",
      });
    }

    return res.json({
      success: true,
      data: result, // return raw + parsed
    });
  } catch (err) {
    console.error("WHOIS Controller Error:", err);
    return res.status(500).json({
      success: false,
      error: "Internal WHOIS processing error",
    });
  }
};


exports.registerDomain = async (req, res) => {
  try {
    const payload = req.body;
    if (!payload || !payload.domain) return res.status(400).json({ success: false, error: 'domain required' });
    const result = await domainService.registerDomain(payload);
    if (!result.success) return res.status(400).json({ success: false, error: result.error || 'Registration failed' });
    return res.json({ success: true, data: result.domain });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

exports.addDnsRecord = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ success: false, error: 'Invalid id' });
    const { type, name, value } = req.body;
    if (!type || !name || !value) return res.status(400).json({ success: false, error: 'type, name, value required' });
    const updated = await domainService.addDnsRecord(id, { type, name, value });
    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error(err);
    return res.status(400).json({ success: false, error: err.message });
  }
};
exports.deleteDomain = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({ success: false, error: 'Invalid domain id' });
    }

    const deleted = await domainService.deleteDomain(id);

    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Domain not found' });
    }

    return res.json({ success: true, message: 'Domain deleted successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};
