// src/controllers/auth.controller.js
const authService = require('../services/auth.service')

exports.register = async (req, res) => {
  try {
    const payload = await authService.register(req.body)
    res.status(201).json(payload)
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Server error' })
  }
}

exports.login = async (req, res) => {
  try {
    const payload = await authService.login(req.body)
    res.json(payload)
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Server error' })
  }
}

exports.refresh = async (req, res) => {
  try {
    const { accessToken } = await authService.refresh(req.body)
    res.json({ accessToken })
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Server error' })
  }
}

// src/controllers/auth.controller.js (replace signout)
exports.signout = async (req, res) => {
  try {
    // guard against undefined req.body
    const { refreshToken } = req.body || {}
    const userId = req.user?.id

    // If neither refreshToken nor userId present, return 400
    if (!refreshToken && !userId) {
      return res.status(400).json({ message: 'refreshToken or Authorization header required' })
    }

    const result = await authService.signout({ refreshToken, userId })
    return res.json(result)
  } catch (err) {
    console.error('SIGNOUT ERROR', err)
    return res.status(err.status || 500).json({ message: err.message || 'Server error' })
  }
}
// src/controllers/auth.controller.js
exports.signoutWithToken = async (req, res) => {
  try {
    const { refreshToken, accessToken } = req.body || {}

    if (!refreshToken && !accessToken) {
      return res.status(400).json({ message: 'refreshToken or accessToken required' })
    }

    if (refreshToken) {
      // revoke specific refresh token
      await require('../services/auth.service').signout({ refreshToken })
      return res.json({ message: 'Signed out (refresh token revoked)' })
    }

    // if accessToken provided, verify and revoke all for that user
    const payload = require('../utils/token').verifyAccessToken(accessToken)
    const user = await require('../db/user.repo').findById(payload.userId)
    if (!user) return res.status(401).json({ message: 'User not found' })
    await require('../db/token.repo').deleteAllForUser(user.id)
    return res.json({ message: 'Signed out from all sessions (by access token)' })
  } catch (err) {
    console.error('signoutWithToken ERROR', err)
    return res.status(err.status || 500).json({ message: err.message || 'Server error' })
  }
}


