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

exports.signout = async (req, res) => {
  try {
    // Accept either { refreshToken } or authenticated user to revoke all tokens
    const { refreshToken } = req.body
    const userId = req.user?.id
    const result = await authService.signout({ refreshToken, userId })
    res.json(result)
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Server error' })
  }
}
