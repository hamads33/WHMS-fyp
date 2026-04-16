const authService = require('./auth.service');
const { created, ok, fail } = require('../../common/utils/response');

async function register(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await authService.register(email, password);
    return created(res, result);
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    return ok(res, result);
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const authRepo = require('./auth.repository');
    const user = await authRepo.findById(req.user.sub);
    if (!user) return fail(res, 'User not found', 404);
    return ok(res, user);
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, me };
