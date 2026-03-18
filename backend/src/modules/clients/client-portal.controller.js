// src/modules/clients/client-portal.controller.js
const prisma = require("../../../prisma/index");
const bcrypt = require("bcrypt");
const AuditService = require("../auth/services/audit.service");

const SALT_ROUNDS = 12;

const ClientPortalController = {
  // GET /api/client/profile
  // Get current client's profile information
  async getMyProfile(req, res) {
    try {
      const userId = req.user.id;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          email: true,
          clientProfile: true,
        },
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const profile = user.clientProfile || {};

      return res.json({
        email: user.email,
        firstName: profile.firstName || "",
        lastName: profile.lastName || "",
        company: profile.company || "",
        phone: profile.phone || "",
        address: profile.address || "",
        city: profile.city || "",
        country: profile.country || "",
        postal: profile.postal || "",
      });
    } catch (err) {
      console.error("GET PROFILE ERROR:", err);
      return res.status(500).json({ error: "Failed to load profile" });
    }
  },

  // PUT /api/client/profile
  // Update current client's profile information
  async updateMyProfile(req, res) {
    try {
      const userId = req.user.id;
      const { firstName, lastName, company, phone, address, city, country, postal } = req.body;

      // Validate required fields
      if (!firstName || !lastName) {
        return res.status(400).json({ error: "First name and last name are required" });
      }

      const profile = await prisma.clientProfile.upsert({
        where: { userId },
        update: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          company: company?.trim() || null,
          phone: phone?.trim() || null,
          address: address?.trim() || null,
          city: city?.trim() || null,
          country: country?.trim() || null,
          postal: postal?.trim() || null,
        },
        create: {
          userId,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          company: company?.trim() || null,
          phone: phone?.trim() || null,
          address: address?.trim() || null,
          city: city?.trim() || null,
          country: country?.trim() || null,
          postal: postal?.trim() || null,
        },
      });

      await AuditService.log({
        userId,
        action: "client.update_profile",
        entity: "clientProfile",
        entityId: profile.id,
      });

      return res.json({
        success: true,
        profile: {
          email: req.user.email,
          firstName: profile.firstName,
          lastName: profile.lastName,
          company: profile.company,
          phone: profile.phone,
          address: profile.address,
          city: profile.city,
          country: profile.country,
          postal: profile.postal,
        },
      });
    } catch (err) {
      console.error("UPDATE PROFILE ERROR:", err);
      return res.status(500).json({ error: "Failed to update profile" });
    }
  },

  // POST /api/client/profile/change-password
  // Change password for authenticated client
  async changePassword(req, res) {
    try {
      const userId = req.user.id;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Current password and new password are required" });
      }

      if (currentPassword === newPassword) {
        return res.status(400).json({ error: "New password must be different from current password" });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters long" });
      }

      // Get current password hash
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { passwordHash: true },
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Verify current password
      const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isMatch) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash: newPasswordHash },
      });

      await AuditService.log({
        userId,
        action: "client.change_password",
        entity: "user",
        entityId: userId,
      });

      return res.json({ success: true, message: "Password changed successfully" });
    } catch (err) {
      console.error("CHANGE PASSWORD ERROR:", err);
      return res.status(500).json({ error: "Failed to change password" });
    }
  },
};

module.exports = ClientPortalController;
