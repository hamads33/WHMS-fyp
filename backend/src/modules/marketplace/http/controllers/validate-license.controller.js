module.exports = ({ validateLicense }) => {
  return async (req, res, next) => {
    try {
      const licenseKey = req.body.licenseKey;

      const result = await validateLicense.execute({ licenseKey });

      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };
};
