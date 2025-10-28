// src/utils/password.js
const bcrypt = require('bcryptjs')
const rounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10)

exports.hashPassword = (plain) => bcrypt.hash(plain, rounds)
exports.comparePassword = (plain, hash) => bcrypt.compare(plain, hash)
