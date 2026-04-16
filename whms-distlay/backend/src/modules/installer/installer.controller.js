const installerService = require('./installer.service');
const { created, ok } = require('../../common/utils/response');

async function generateToken(req, res, next) {
  try {
    const record = await installerService.generateInstallToken(req.user.sub);
    return created(res, record);
  } catch (err) {
    next(err);
  }
}

async function validateToken(req, res, next) {
  try {
    const result = await installerService.validateToken(req.body.token);
    return ok(res, result);
  } catch (err) {
    next(err);
  }
}

module.exports = { generateToken, validateToken };
