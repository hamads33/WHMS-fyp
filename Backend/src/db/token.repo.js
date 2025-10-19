// src/db/token.repo.js
const prisma = require('./prisma')

exports.createRefreshToken = (userId, token, expiresAt) =>
  prisma.refreshToken.create({
    data: { userId, token, expiresAt }
  })

exports.revokeRefreshToken = async (token) =>
  prisma.refreshToken.updateMany({
    where: { token },
    data: { revoked: true }
  })

exports.findRefreshToken = (token) =>
  prisma.refreshToken.findUnique({ where: { token } })

exports.deleteRefreshToken = (token) =>
  prisma.refreshToken.deleteMany({ where: { token } })

exports.deleteAllForUser = (userId) =>
  prisma.refreshToken.updateMany({
    where: { userId },
    data: { revoked: true }
  })
