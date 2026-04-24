'use strict';

/**
 * extensions/plugins/ai-responder.plugin.js
 *
 * Example AI auto-responder plugin.
 * Registers an automation rule that generates a suggested reply
 * for new tickets using an LLM API.
 *
 * This is a reference implementation showing the full extension pattern.
 *
 * Registration:
 *   const aiPlugin = require('./extensions/plugins/ai-responder.plugin');
 *   aiPlugin.install(supportModule, { apiKey: '...' });
 */

const MANIFEST = {
  id:          'ai-ticket-responder',
  name:        'AI Ticket Auto-Responder',
  version:     '1.0.0',
  description: 'Uses an LLM to suggest a reply for new support tickets.',
  configSchema: {
    apiKey:       { type: 'string', required: true,  label: 'OpenAI API Key' },
    model:        { type: 'string', required: false, label: 'Model', default: 'gpt-4o-mini' },
    postAsInternal: { type: 'boolean', default: true, label: 'Post as internal note?' },
    minPriority:  {
      type: 'select',
      options: ['low', 'medium', 'high', 'urgent'],
      default: 'high',
      label: 'Only respond to tickets at or above this priority',
    },
  },
};

// Priority ranks for comparison
const PRIORITY_RANK = { low: 0, medium: 1, high: 2, urgent: 3 };

/**
 * Install the plugin into the support module.
 *
 * @param {object} supportModule   - return value of supportModule.register()
 * @param {object} config          - plugin config from DB
 */
function install(supportModule, config) {
  const { automationRegistry, ticketService } = supportModule;

  automationRegistry.register({
    id:       'ai-responder-on-ticket-created',
    name:     'AI: Auto-suggest reply for new tickets',
    trigger:  'ticket.created',
    priority: 150,

    // Only activate for high/urgent tickets by default
    async condition(payload) {
      const minRank = PRIORITY_RANK[config.minPriority || 'high'];
      const ticketRank = PRIORITY_RANK[payload.ticket.priority] ?? 0;
      return ticketRank >= minRank;
    },

    async action(payload) {
      const { ticket } = payload;

      // Fetch the opening message text
      const openingReply = ticket.replies?.[0];
      if (!openingReply) return;

      let suggestion;
      try {
        suggestion = await callLLM(config, ticket, openingReply.body);
      } catch (err) {
        console.error('[AI Responder] LLM call failed:', err.message);
        return;
      }

      // Post the suggestion as an internal note so staff can review before sending
      await ticketService.addReply({
        ticketId:       ticket.id,
        authorId:       'system',             // requires a system user in the DB
        body:           `🤖 **AI Suggested Reply:**\n\n${suggestion}`,
        type:           config.postAsInternal !== false ? 'internal' : 'public',
        requesterRoles: ['admin'],            // bypass staff check
      });

      console.log(`[AI Responder] Suggested reply posted for ticket ${ticket.ticketNumber}`);
    },
  });

  console.log('[AI Responder Plugin] Installed');
}

// ----------------------------------------------------------------
// LLM CALL (OpenAI-compatible)
// ----------------------------------------------------------------

async function callLLM(config, ticket, clientMessage) {
  const { default: fetch } = await import('node-fetch').catch(() => ({ default: global.fetch }));

  const systemPrompt = `You are a helpful customer support assistant.
Your job is to draft a professional, empathetic reply to a support ticket.
Keep replies concise and actionable. Do not promise things you cannot guarantee.
If you don't have enough context, ask a clarifying question.`;

  const userPrompt = `
Support Ticket:
- Number: ${ticket.ticketNumber}
- Subject: ${ticket.subject}
- Priority: ${ticket.priority}
- Department: ${ticket.department?.name || 'General'}

Client Message:
${clientMessage}

Draft a helpful support reply:`.trim();

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model:       config.model || 'gpt-4o-mini',
      max_tokens:  500,
      temperature: 0.4,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt },
      ],
    }),
  });

  if (!res.ok) throw new Error(`OpenAI API error: ${res.status}`);
  const data = await res.json();
  return data.choices[0].message.content.trim();
}

module.exports = { MANIFEST, install };
