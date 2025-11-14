// src/db/user.repo.js
const prisma = require('./prisma')

exports.findByEmail = (email) =>
  prisma.user.findUnique({ where: { email } })

exports.findById = (id) =>
  prisma.user.findUnique({ where: { id } })

exports.createUser = (data) =>
  prisma.user.create({ data })
exports.findByGoogleId = async (googleId) => {
  if (!googleId) return null
  return prisma.user.findUnique({ where: { googleId } })
}

exports.updateUser = async (id, data) => {
  return prisma.user.update({ where: { id }, data })
}
