const express = require("express");
const prisma = require("../../../../prisma");
const { runSSH } = require("../../../lib/ssh");

const router = express.Router();

const MOCK_USER_ID = "1";

const DOMAIN_REGEX =
  /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[A-Za-z]{2,}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function shellEscape(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

async function ensureMockUser() {
  await prisma.user.upsert({
    where: { id: MOCK_USER_ID },
    update: {},
    create: {
      id: MOCK_USER_ID,
      email: "mock-user@local.test",
      passwordHash: "mock-password-hash",
    },
  });
}

router.post("/create", async (req, res) => {
  const { domain, email } = req.body || {};

  if (!domain || !DOMAIN_REGEX.test(domain)) {
    return res.status(400).json({ error: "Invalid domain" });
  }

  if (!email || !EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: "Invalid email" });
  }

  try {
    await ensureMockUser();

    const website = await prisma.website.create({
      data: {
        domain,
        status: "pending",
        userId: MOCK_USER_ID,
      },
    });

    const command = `cyberpanel createWebsite --domain ${shellEscape(
      domain
    )} --email ${shellEscape(email)}`;

    try {
      const sshResult = await runSSH(command);

      const activeWebsite = await prisma.website.update({
        where: { id: website.id },
        data: { status: "active" },
      });

      return res.status(200).json({
        success: true,
        website: activeWebsite,
        output: sshResult.stdout,
      });
    } catch (sshError) {
      const failedWebsite = await prisma.website.update({
        where: { id: website.id },
        data: { status: "failed" },
      });

      return res.status(500).json({
        success: false,
        website: failedWebsite,
        error: sshError.message,
      });
    }
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/", async (_req, res) => {
  try {
    const websites = await prisma.website.findMany({
      where: { userId: MOCK_USER_ID },
      select: {
        id: true,
        domain: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json(websites);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
