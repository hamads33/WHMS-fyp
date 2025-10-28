// src/middleware/auth.middleware.js
const { verifyAccessToken } = require('../utils/token')
const userRepo = require('../db/user.repo')

module.exports = async (req, res, next) => {
  const header = req.headers.authorization
  if (!header) return res.status(401).json({ message: 'No Authorization header' })

  const parts = header.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer')
    return res.status(401).json({ message: 'Bad Authorization header format' })

  const token = parts[1]
  try {
    const payload = verifyAccessToken(token)
    const user = await userRepo.findById(payload.userId)
    if (!user) return res.status(401).json({ message: 'User not found' })
    req.user = { id: user.id, role: user.role }
    next()
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' })
  }
}
