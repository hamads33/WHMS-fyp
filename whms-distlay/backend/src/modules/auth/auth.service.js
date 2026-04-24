const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../../config');
const authRepo = require('./auth.repository');
const tenantService = require('../tenant/tenant.service');

const SALT_ROUNDS = 12;

async function register(email, password) {
  const existing = await authRepo.findByEmail(email);
  if (existing) {
    const err = new Error('Email already registered');
    err.status = 409;
    throw err;
  }

  const hashed = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await authRepo.create(email, hashed);

  await tenantService.createForUser(user.id);

  return { user, token: signToken(user) };
}

async function login(email, password) {
  const user = await authRepo.findByEmail(email);
  if (!user) {
    const err = new Error('Invalid credentials');
    err.status = 401;
    throw err;
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    const err = new Error('Invalid credentials');
    err.status = 401;
    throw err;
  }

  const { password: _pw, ...safeUser } = user;
  return { user: safeUser, token: signToken(user) };
}

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
}

module.exports = { register, login };
