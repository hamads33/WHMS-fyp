/**
 * Notification / System Actions
 * ------------------------------------------------------------------
 * Actions for sending notifications and controlling workflow flow.
 */

module.exports = [
  // ----------------------------------------------------------------
  // notify.send_webhook
  // ----------------------------------------------------------------
  {
    name: "Send Webhook",
    type: "builtin",
    actionType: "notify.webhook",
    module: "notify",
    description: "POST a JSON payload to an external webhook URL",
    schema: {
      type: "object",
      required: ["url"],
      properties: {
        url: { type: "string", title: "Webhook URL" },
        payload: { type: "object", title: "Payload", description: "JSON object to send as request body" },
        headers: { type: "object", title: "Custom Headers", additionalProperties: { type: "string" } },
        secret: { type: "string", title: "HMAC Secret", description: "Signs the payload with X-Signature header" },
      },
    },
    async execute(meta, context) {
      const { logger } = context;
      const params = meta.input ?? meta;
      const { url, payload = {}, headers = {}, secret } = params;

      if (!url) throw new Error("url is required");

      const axios = require("axios");
      const sendHeaders = { "Content-Type": "application/json", ...headers };

      if (secret) {
        const crypto = require("crypto");
        const sig = crypto.createHmac("sha256", secret).update(JSON.stringify(payload)).digest("hex");
        sendHeaders["X-Signature"] = `sha256=${sig}`;
      }

      const res = await axios.post(url, payload, { headers: sendHeaders, timeout: 15000 });

      logger.info({ msg: "[notify.webhook] Sent", url, status: res.status });
      return { success: true, url, status: res.status, response: res.data };
    },
  },

  // ----------------------------------------------------------------
  // notify.send_slack
  // ----------------------------------------------------------------
  {
    name: "Send Slack Message",
    type: "builtin",
    actionType: "notify.slack",
    module: "notify",
    description: "Post a message to a Slack channel via Incoming Webhook",
    schema: {
      type: "object",
      required: ["webhookUrl", "text"],
      properties: {
        webhookUrl: { type: "string", title: "Slack Webhook URL" },
        text: { type: "string", title: "Message Text" },
        username: { type: "string", title: "Bot Username", default: "WHMS Bot" },
        iconEmoji: { type: "string", title: "Icon Emoji", default: ":robot_face:" },
        channel: { type: "string", title: "Override Channel", description: "Optional — overrides webhook default" },
      },
    },
    async execute(meta, context) {
      const { logger } = context;
      const params = meta.input ?? meta;
      const { webhookUrl, text, username = "WHMS Bot", iconEmoji = ":robot_face:", channel } = params;

      if (!webhookUrl) throw new Error("webhookUrl is required");
      if (!text) throw new Error("text is required");

      const axios = require("axios");
      const body = { text, username, icon_emoji: iconEmoji };
      if (channel) body.channel = channel;

      await axios.post(webhookUrl, body, { timeout: 10000 });
      logger.info({ msg: "[notify.slack] Sent", text: text.substring(0, 50) });
      return { success: true, channel: channel || "default" };
    },
  },

  // ----------------------------------------------------------------
  // notify.email
  // ----------------------------------------------------------------
  {
    name: "Send Email",
    type: "builtin",
    actionType: "notify.email",
    module: "notify",
    description: "Send an email to any address (not tied to a specific client)",
    schema: {
      type: "object",
      required: ["to", "subject", "body"],
      properties: {
        to:      { type: "string", title: "To Address" },
        cc:      { type: "string", title: "CC Address" },
        subject: { type: "string", title: "Subject" },
        body:    { type: "string", title: "Body (HTML or plain text)" },
        from:    { type: "string", title: "From Address", description: "Defaults to system sender" },
      },
    },
    async execute(meta, context) {
      const { prisma, logger, app } = context;
      const params = meta.input ?? meta;
      const { to, cc, subject, body, from } = params;

      if (!to)      throw new Error("to is required");
      if (!subject) throw new Error("subject is required");
      if (!body)    throw new Error("body is required");

      const emailService = app?.locals?.emailService || app?.get?.("emailService");
      if (emailService?.send) {
        await emailService.send({
          to,
          ...(cc && { cc }),
          from: from || process.env.SMTP_FROM || "noreply@system.local",
          subject,
          html: body,
        });
      } else {
        logger.warn({ msg: "[notify.email] Email service unavailable — logging", to, subject });
        await prisma.auditLog.create({
          data: {
            source: "automation", action: "notify.email_sent", actor: "automation",
            level: "INFO", entity: null, entityId: null,
            data: { to, cc, subject, preview: body.substring(0, 200) },
          },
        });
      }

      logger.info({ msg: "[notify.email] Sent", to, subject });
      return { success: true, to, subject };
    },
  },

  // ----------------------------------------------------------------
  // notify.discord
  // ----------------------------------------------------------------
  {
    name: "Send Discord Message",
    type: "builtin",
    actionType: "notify.discord",
    module: "notify",
    description: "Post a message to a Discord channel via Webhook",
    schema: {
      type: "object",
      required: ["webhookUrl", "content"],
      properties: {
        webhookUrl: { type: "string", title: "Discord Webhook URL" },
        content:    { type: "string", title: "Message Content" },
        username:   { type: "string", title: "Bot Username", default: "WHMS" },
        avatarUrl:  { type: "string", title: "Avatar URL" },
        embedTitle: { type: "string", title: "Embed Title", description: "Optional — adds a rich embed" },
        embedColor: { type: "number", title: "Embed Color (decimal)", description: "e.g. 5763719 for green" },
      },
    },
    async execute(meta, context) {
      const { logger } = context;
      const params = meta.input ?? meta;
      const { webhookUrl, content, username = "WHMS", avatarUrl, embedTitle, embedColor } = params;

      if (!webhookUrl) throw new Error("webhookUrl is required");
      if (!content)    throw new Error("content is required");

      const axios = require("axios");
      const body = { content, username };
      if (avatarUrl) body.avatar_url = avatarUrl;
      if (embedTitle) {
        body.embeds = [{ title: embedTitle, description: content, color: embedColor || 5763719 }];
        body.content = undefined;
      }

      await axios.post(webhookUrl, body, { timeout: 10000 });
      logger.info({ msg: "[notify.discord] Sent", username });
      return { success: true, username };
    },
  },

  // ----------------------------------------------------------------
  // system.wait
  // ----------------------------------------------------------------
  {
    name: "Wait / Delay",
    type: "builtin",
    actionType: "system.wait",
    module: "system",
    description: "Pause workflow execution for a specified duration",
    schema: {
      type: "object",
      required: ["duration"],
      properties: {
        duration: { type: "number", title: "Duration (ms)", description: "Milliseconds to wait", minimum: 100, maximum: 300000 },
      },
    },
    async execute(meta, context) {
      const { logger } = context;
      const params = meta.input ?? meta;
      const { duration } = params;

      if (!duration || isNaN(duration)) throw new Error("duration is required (milliseconds)");
      const ms = Math.min(Math.max(Number(duration), 100), 300000);

      await new Promise((r) => setTimeout(r, ms));
      logger.info({ msg: "[system.wait] Waited", ms });
      return { success: true, waited: ms };
    },
  },

  // ----------------------------------------------------------------
  // system.log
  // ----------------------------------------------------------------
  {
    name: "Write Audit Log",
    type: "builtin",
    actionType: "system.audit_log",
    module: "system",
    description: "Write a structured entry to the system audit log",
    schema: {
      type: "object",
      required: ["message"],
      properties: {
        message: { type: "string", title: "Message" },
        level: { type: "string", enum: ["INFO", "WARN", "ERROR"], default: "INFO", title: "Log Level" },
        entity: { type: "string", title: "Entity Type (e.g. order, client)" },
        entityId: { type: "string", title: "Entity ID" },
        data: { type: "object", title: "Extra Data" },
      },
    },
    async execute(meta, context) {
      const { prisma, logger } = context;
      const params = meta.input ?? meta;
      const { message, level = "INFO", entity, entityId, data } = params;

      if (!message) throw new Error("message is required");

      await prisma.auditLog.create({
        data: {
          source: "automation",
          action: "automation.log",
          actor: "automation",
          level,
          entity: entity || null,
          entityId: entityId ? String(entityId) : null,
          data: data || { message },
        },
      });

      logger.info({ msg: "[system.audit_log] Written", level, message });
      return { success: true, level, message };
    },
  },
];
