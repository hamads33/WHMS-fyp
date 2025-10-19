// src/db/user.repo.js
const prisma = require('./prisma')

exports.findByEmail = (email) =>
  prisma.user.findUnique({ where: { email } })

exports.findById = (id) =>
  prisma.user.findUnique({ where: { id } })

exports.createUser = (data) =>
  prisma.user.create({ data })
