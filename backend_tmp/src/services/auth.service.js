// src/services/auth.service.js
const userRepo = require('../db/user.repo')
const tokenRepo = require('../db/token.repo')
const { hashPassword, comparePassword } = require('../utils/password')
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/token')
const crypto = require('crypto')

exports.register = async ({ username, email, password, role = 'client' }) => {
  const existing = await userRepo.findByEmail(email)
  if (existing) throw { status: 400, message: 'Email already used' }

  const hashed = await hashPassword(password)
  const user = await userRepo.createUser({ username, email, password: hashed, role })

  // sign tokens
  const accessToken = signAccessToken({ userId: user.id, role: user.role })
  const { token: refreshToken, expiresAt } = signRefreshToken({ userId: user.id, role: user.role })

  // persist refresh token
  await tokenRepo.createRefreshToken(user.id, refreshToken, expiresAt)

  return {
    user: { id: user.id, username: user.username, email: user.email, role: user.role },
    accessToken,
    refreshToken
  }
}

exports.login = async ({ email, password }) => {
  const user = await userRepo.findByEmail(email)
  if (!user) throw { status: 401, message: 'Invalid credentials' }

  const ok = await comparePassword(password, user.password)
  if (!ok) throw { status: 401, message: 'Invalid credentials' }

  const accessToken = signAccessToken({ userId: user.id, role: user.role })
  const { token: refreshToken, expiresAt } = signRefreshToken({ userId: user.id, role: user.role })

  await tokenRepo.createRefreshToken(user.id, refreshToken, expiresAt)

  return {
    user: { id: user.id, username: user.username, email: user.email, role: user.role },
    accessToken,
    refreshToken
  }
}

exports.refresh = async ({ refreshToken }) => {
  try {
    const payload = verifyRefreshToken(refreshToken)
    // check DB
    const stored = await tokenRepo.findRefreshToken(refreshToken)
    if (!stored || stored.revoked) throw { status: 401, message: 'Invalid refresh token' }

    // optionally check expiry in stored.expiresAt

    // issue new access token (and optionally new refresh token rotation)
    const accessToken = signAccessToken({ userId: payload.userId, role: payload.role })
    return { accessToken }
  } catch (err) {
    throw { status: 401, message: 'Invalid refresh token' }
  }
}

exports.signout = async ({ refreshToken, userId }) => {
  // revoke the token in DB (or revoke all tokens for the user)
  if (!refreshToken && userId) {
    // revoke all tokens for user
    await tokenRepo.deleteAllForUser(userId)
    return { message: 'Signed out from all sessions' }
  }
  await tokenRepo.revokeRefreshToken(refreshToken)
  return { message: 'Signed out' }
}
