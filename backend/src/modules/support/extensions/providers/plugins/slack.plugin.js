'use strict';

/**
 * extensions/plugins/slack.plugin.js
 *
 * Example plugin: Slack notifications for support events.
 *
 * Register via:
 *   const slackPlugin = require('./extensions/plugins/slack.plugin');
 *   notificationRegistry.registerProvider(slackPlugin.createProvider(config));
 *
 * The platform plugin system can auto-load this from the plugin
 * manifest and inject the config from the database.
 */

const https = require('https');
const { SUPPORT_EVENTS } = require('../support.events');

// ----------------------------------------------------------------
// PLUGIN MANIFEST (read by the plugin loader)
// ----------------------------------------------------------------

const MANIFEST = {
  id:          'slack-support-notifications',
  name:        'Slack Support Notifications',
  version:     '1.0.0',
  description: 'Posts ticket and chat events to a Slack channel.',
  author:      'Platform Core',
  configSchema: {
    webhookUrl: { type: 'string', required: true, label: 'Slack Webhook URL' },
    channel:    { type: 'string', required: false, label: 'Channel override (#channel)' },
    events: {
      type: 'multiselect',
      options: Object.values(SUPPORT_EVENTS),
      default: [
        SUPPORT_EVENTS.TICKET_CREATED,
        SUPPORT_EVENTS.TICKET_CLOSED,
        SUPPORT_EVENTS.TICKET_SLA_BREACHED,
        SUPPORT_EVENTS.CHAT_STARTED,
        SUPPORT_EVENTS.CHAT_MISSED,
      ],
    },
  },
};

// ----------------------------------------------------------------
// PROVIDER FACTORY
// ----------------------------------------------------------------

/**
 * @param {{ webhookUrl: string, channel?: string, events?: string[] }} config
 */
function createProvider(config) {
  const subscribedEvents = config.events || [
    SUPPORT_EVENTS.TICKET_CREATED,
    SUPPORT_EVENTS.TICKET_CLOSED,
    SUPPORT_EVENTS.TICKET_SLA_BREACHED,
    SUPPORT_EVENTS.CHAT_STARTED,
    SUPPORT_EVENTS.CHAT_MISSED,
  ];

  return {
    id:      'slack',
    name:    'Slack',
    events:  subscribedEvents,
    enabled: true,

    async send(event, payload) {
      const blocks = formatMessage(event, payload, config.channel);
      if (!blocks) return; // unknown event, skip

      await postToSlack(config.webhookUrl, blocks);
    },
  };
}

// ----------------------------------------------------------------
// MESSAGE FORMATTERS
// ----------------------------------------------------------------

function formatMessage(event, payload, channel) {
  const base = channel ? { channel } : {};

  switch (event) {
    case SUPPORT_EVENTS.TICKET_CREATED:
      return {
        ...base,
        text: `🎫 New ticket: *${payload.ticket.ticketNumber}*`,
        blocks: [
          section(`🎫 *New Ticket Created*`),
          fields([
            [`Ticket`, `<${ticketUrl(payload.ticket.id)}|${payload.ticket.ticketNumber}>`],
            [`Subject`, payload.ticket.subject],
            [`Client`,  payload.client?.email || 'Unknown'],
            [`Dept`,    payload.department?.name || '-'],
            [`Priority`,payload.ticket.priority.toUpperCase()],
          ]),
        ],
      };

    case SUPPORT_EVENTS.TICKET_CLOSED:
      return {
        ...base,
        text: `✅ Ticket closed: ${payload.ticket.ticketNumber}`,
        blocks: [
          section(`✅ *Ticket Closed* — ${payload.ticket.ticketNumber}`),
          fields([
            [`Subject`,    payload.ticket.subject],
            [`Closed by`,  payload.closedBy?.email || 'System'],
            [`Resolution`, payload.resolutionNote || '-'],
          ]),
        ],
      };

    case SUPPORT_EVENTS.TICKET_SLA_BREACHED:
      return {
        ...base,
        text: `🚨 SLA Breached: ${payload.ticket.ticketNumber}`,
        blocks: [
          section(`🚨 *SLA Breached* — ${payload.slaType} SLA missed`),
          fields([
            [`Ticket`,   `<${ticketUrl(payload.ticket.id)}|${payload.ticket.ticketNumber}>`],
            [`Subject`,  payload.ticket.subject],
            [`Priority`, payload.ticket.priority.toUpperCase()],
            [`Breached at`, payload.breachedAt.toISOString()],
          ]),
        ],
      };

    case SUPPORT_EVENTS.CHAT_STARTED:
      return {
        ...base,
        text: `💬 New chat: ${payload.session.sessionCode}`,
        blocks: [
          section(`💬 *New Chat Session Started*`),
          fields([
            [`Session`, payload.session.sessionCode],
            [`Client`,  payload.client?.email || 'Unknown'],
            [`Dept`,    payload.department?.name || 'General'],
          ]),
        ],
      };

    case SUPPORT_EVENTS.CHAT_MISSED:
      return {
        ...base,
        text: `⚠️ Missed chat: ${payload.session.sessionCode}`,
        blocks: [
          section(`⚠️ *Missed Chat* — no agent responded`),
          fields([
            [`Session`,  payload.session.sessionCode],
            [`Client`,   payload.session.client?.email || 'Unknown'],
            [`Waited`,   `${payload.waitedSeconds}s`],
          ]),
        ],
      };

    default:
      return null;
  }
}

// Slack Block Kit helpers
const section = (text) => ({ type: 'section', text: { type: 'mrkdwn', text } });
const fields  = (pairs) => ({
  type: 'section',
  fields: pairs.map(([label, value]) => ({
    type: 'mrkdwn',
    text: `*${label}*\n${value}`,
  })),
});

function ticketUrl(ticketId) {
  return `${process.env.APP_URL || 'https://app.example.com'}/support/tickets/${ticketId}`;
}

// ----------------------------------------------------------------
// HTTP DELIVERY
// ----------------------------------------------------------------

function postToSlack(webhookUrl, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const url = new URL(webhookUrl);

    const req = https.request(
      {
        hostname: url.hostname,
        path:     url.pathname,
        method:   'POST',
        headers: {
          'Content-Type':   'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        res.resume();
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve();
        } else {
          reject(new Error(`Slack returned ${res.statusCode}`));
        }
      },
    );

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

module.exports = { MANIFEST, createProvider };
