const jwt = require('jsonwebtoken')
const SECRET = process.env.JWT_SECRET || 'dev_secret'

function signToken(payload, expiresIn = '1h') {
  return jwt.sign(payload, SECRET, { expiresIn })
}
function verifyToken(token) {
  return jwt.verify(token, SECRET)
}

module.exports = { signToken, verifyToken }
