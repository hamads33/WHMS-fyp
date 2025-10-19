// src/utils/token.js
const jwt = require('jsonwebtoken')
const { add } = require('date-fns') // optional, or use plain Date

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET
const ACCESS_EXP = process.env.ACCESS_TOKEN_EXPIRY || '15m'
const REFRESH_EXP_DAYS = parseInt(process.env.REFRESH_TOKEN_EXPIRY_DAYS || '30', 10)

if (!ACCESS_SECRET || !REFRESH_SECRET) {
  throw new Error('Missing JWT secrets in env')
}

exports.signAccessToken = (payload) =>
  jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXP })

exports.verifyAccessToken = (token) =>
  jwt.verify(token, ACCESS_SECRET)

exports.signRefreshToken = (payload) => {
  // refresh token long lived
  const token = jwt.sign(payload, REFRESH_SECRET, { expiresIn: `${REFRESH_EXP_DAYS}d` })
  const expiresAt = add(new Date(), { days: REFRESH_EXP_DAYS })
  return { token, expiresAt }
}

exports.verifyRefreshToken = (token) =>
  jwt.verify(token, REFRESH_SECRET)
