exports.sellerAuth = (req, res, next) => {
  if (!req.user) return res.status(401).json({ ok: false, message: 'Auth required' });
  if (!req.user.marketplaceSeller) return res.status(403).json({ ok: false, message: 'Seller account required' });
  next();
};

exports.licenseAuth = (req, res, next) => {
  if (!req.user) return res.status(401).json({ ok: false, message: 'Auth required' });
  next();
};

exports.adminAuth = (req, res, next) => {
  if (!req.user) return res.status(401).json({ ok: false, message: 'Auth required' });
  if (req.user.role !== 'admin') return res.status(403).json({ ok: false, message: 'Admin only' });
  next();
};
