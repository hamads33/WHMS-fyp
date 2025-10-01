const express = require('express')
const router = express.Router()
const prisma = require('../db/prisma')
const bcrypt = require('bcryptjs')
const { signToken } = require('../utils/token')

router.post('/login', async (req, res) => {
  const { email, password } = req.body
  try {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return res.status(401).json({ message: 'Invalid credentials' })
    const ok = await bcrypt.compare(password, user.password)
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' })
    const token = signToken({ userId: user.id, role: user.role }, '1h')
    res.json({ token })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
})


module.exports = router
