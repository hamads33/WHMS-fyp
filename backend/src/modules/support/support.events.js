'use strict';

/**
 * support.events.js
 *
 * Canonical event name registry for the Support module.
 * All modules, plugins and the automation engine subscribe
 * to these strings — never hard-code them elsewhere.
 *
 * Payload shapes are documented inline so consumers know
 * exactly what fields to expect on each event.
 */

// ----------------------------------------------------------------
// EVENT CONSTANTS
// ----------------------------------------------------------------

const SUPPORT_EVENTS = {
  // ── Ticket lifecycle ──────────────────────────────────────────
  TICKET_CREATED: 'ticket.created',
  // payload: { ticket, client, department }

  TICKET_REPLY_ADDED: 'ticket.reply_added',
  // payload: { ticket, reply, author, isInternal }

  TICKET_STATUS_CHANGED: 'ticket.status_changed',
  // payload: { ticket, fromStatus, toStatus, changedBy }

  TICKET_PRIORITY_CHANGED: 'ticket.priority_changed',
  // payload: { ticket, fromPriority, toPriority, changedBy }

  TICKET_ASSIGNED: 'ticket.assigned',
  // payload: { ticket, assignedTo, assignedBy }

  TICKET_TRANSFERRED: 'ticket.transferred',
  // payload: { ticket, fromDepartment, toDepartment, transferredBy }

  TICKET_CLOSED: 'ticket.closed',
  // payload: { ticket, closedBy, resolutionNote }

  TICKET_REOPENED: 'ticket.reopened',
  // payload: { ticket, reopenedBy }

  TICKET_SLA_BREACHED: 'ticket.sla_breached',
  // payload: { ticket, slaType: 'response'|'resolution', breachedAt }

  // ── Chat lifecycle ────────────────────────────────────────────
  CHAT_STARTED: 'chat.started',
  // payload: { session, client, department }

  CHAT_AGENT_JOINED: 'chat.agent_joined',
  // payload: { session, agent }

  CHAT_AGENT_LEFT: 'chat.agent_left',
  // payload: { session, agent }

  CHAT_MESSAGE_SENT: 'chat.message_sent',
  // payload: { session, message, sender }

  CHAT_ENDED: 'chat.ended',
  // payload: { session, endedBy, duration }

  CHAT_CONVERTED_TO_TICKET: 'chat.converted_to_ticket',
  // payload: { session, ticket }

  CHAT_MISSED: 'chat.missed',
  // payload: { session, waitedSeconds }

  // ── Automation hooks ─────────────────────────────────────────
  AUTOMATION_RULE_TRIGGERED: 'support.automation.triggered',
  // payload: { ruleId, ruleName, ticket, action }
};

// ----------------------------------------------------------------
// EMITTER FACTORY
// Wraps the platform's global event bus with module-scoped helpers.
// ----------------------------------------------------------------

/**
 * @param {import('../../../core/event-bus')} eventBus  - platform event bus
 * @returns {SupportEmitter}
 */
function createSupportEmitter(eventBus) {
  return {
    // ── Ticket emitters ────────────────────────────────────────

    ticketCreated(ticket, client, department) {
      eventBus.emit(SUPPORT_EVENTS.TICKET_CREATED, { ticket, client, department });
    },

    ticketReplyAdded(ticket, reply, author) {
      eventBus.emit(SUPPORT_EVENTS.TICKET_REPLY_ADDED, {
        ticket,
        reply,
        author,
        isInternal: reply.type === 'internal',
      });
    },

    ticketStatusChanged(ticket, fromStatus, toStatus, changedBy) {
      eventBus.emit(SUPPORT_EVENTS.TICKET_STATUS_CHANGED, {
        ticket, fromStatus, toStatus, changedBy,
      });
    },

    ticketPriorityChanged(ticket, fromPriority, toPriority, changedBy) {
      eventBus.emit(SUPPORT_EVENTS.TICKET_PRIORITY_CHANGED, {
        ticket, fromPriority, toPriority, changedBy,
      });
    },

    ticketAssigned(ticket, assignedTo, assignedBy) {
      eventBus.emit(SUPPORT_EVENTS.TICKET_ASSIGNED, { ticket, assignedTo, assignedBy });
    },

    ticketTransferred(ticket, fromDepartment, toDepartment, transferredBy) {
      eventBus.emit(SUPPORT_EVENTS.TICKET_TRANSFERRED, {
        ticket, fromDepartment, toDepartment, transferredBy,
      });
    },

    ticketClosed(ticket, closedBy, resolutionNote = null) {
      eventBus.emit(SUPPORT_EVENTS.TICKET_CLOSED, { ticket, closedBy, resolutionNote });
    },

    ticketReopened(ticket, reopenedBy) {
      eventBus.emit(SUPPORT_EVENTS.TICKET_REOPENED, { ticket, reopenedBy });
    },

    ticketSlaBreached(ticket, slaType) {
      eventBus.emit(SUPPORT_EVENTS.TICKET_SLA_BREACHED, {
        ticket,
        slaType,
        breachedAt: new Date(),
      });
    },

    // ── Chat emitters ──────────────────────────────────────────

    chatStarted(session, client, department) {
      eventBus.emit(SUPPORT_EVENTS.CHAT_STARTED, { session, client, department });
    },

    chatAgentJoined(session, agent) {
      eventBus.emit(SUPPORT_EVENTS.CHAT_AGENT_JOINED, { session, agent });
    },

    chatAgentLeft(session, agent) {
      eventBus.emit(SUPPORT_EVENTS.CHAT_AGENT_LEFT, { session, agent });
    },

    chatMessageSent(session, message, sender) {
      eventBus.emit(SUPPORT_EVENTS.CHAT_MESSAGE_SENT, { session, message, sender });
    },

    chatEnded(session, endedBy) {
      const duration = session.endedAt
        ? Math.floor((new Date(session.endedAt) - new Date(session.startedAt)) / 1000)
        : 0;
      eventBus.emit(SUPPORT_EVENTS.CHAT_ENDED, { session, endedBy, duration });
    },

    chatConvertedToTicket(session, ticket) {
      eventBus.emit(SUPPORT_EVENTS.CHAT_CONVERTED_TO_TICKET, { session, ticket });
    },

    chatMissed(session) {
      const waitedSeconds = Math.floor(
        (Date.now() - new Date(session.startedAt).getTime()) / 1000,
      );
      eventBus.emit(SUPPORT_EVENTS.CHAT_MISSED, { session, waitedSeconds });
    },
  };
}

// ----------------------------------------------------------------
// SUBSCRIPTION HELPERS
// Make it easy for other modules/plugins to subscribe.
// ----------------------------------------------------------------

/**
 * Register a listener on the platform event bus for a support event.
 * @param {object} eventBus
 * @param {string} event  - one of SUPPORT_EVENTS.*
 * @param {Function} handler
 */
function onSupportEvent(eventBus, event, handler) {
  if (!Object.values(SUPPORT_EVENTS).includes(event)) {
    throw new Error(`Unknown support event: "${event}"`);
  }
  eventBus.on(event, handler);
}

/**
 * Register email trigger listeners for support events.
 * Call this during module initialization to wire support events to email notifications.
 * @param {object} eventBus - platform event bus
 */
function registerEmailTriggers(eventBus) {
  const emailTriggers = require('../email/triggers/email.triggers');

  // Ticket created notification
  eventBus.on(SUPPORT_EVENTS.TICKET_CREATED, async ({ ticket, client, department }) => {
    try {
      if (client) {
        await emailTriggers.fire('support.ticket_created', {
          clientEmail: client.email,
          clientName: client.name,
          ticketId: ticket.ticketNumber,
          subject: ticket.subject,
          department: department?.name || 'Support',
          priority: ticket.priority,
          message: ticket.description,
          ticketUrl: `${process.env.PORTAL_URL || 'https://portal.whms.local'}/support/tickets/${ticket.id}`,
        });
      }
    } catch (err) {
      console.error('[Support Events] Failed to send ticket_created email:', err.message);
    }
  });

  // Ticket reply notification
  eventBus.on(SUPPORT_EVENTS.TICKET_REPLY_ADDED, async ({ ticket, reply, author, isInternal }) => {
    try {
      if (ticket.client && !isInternal) {
        await emailTriggers.fire('support.ticket_reply', {
          clientEmail: ticket.client.email,
          clientName: ticket.client.name,
          ticketId: ticket.ticketNumber,
          subject: ticket.subject,
          status: ticket.status,
          replyAuthor: author?.name || 'Support Team',
          replyDate: reply.createdAt || new Date(),
          replyMessage: reply.message,
          ticketUrl: `${process.env.PORTAL_URL || 'https://portal.whms.local'}/support/tickets/${ticket.id}`,
        });
      }
    } catch (err) {
      console.error('[Support Events] Failed to send ticket_reply email:', err.message);
    }
  });

  // Ticket closed notification
  eventBus.on(SUPPORT_EVENTS.TICKET_CLOSED, async ({ ticket, closedBy, resolutionNote }) => {
    try {
      if (ticket.client) {
        await emailTriggers.fire('support.ticket_closed', {
          clientEmail: ticket.client.email,
          clientName: ticket.client.name,
          ticketId: ticket.ticketNumber,
          subject: ticket.subject,
          closedAt: new Date(),
          reason: resolutionNote || 'Ticket resolved',
          reopenDays: 7,
          ticketUrl: `${process.env.PORTAL_URL || 'https://portal.whms.local'}/support/tickets/${ticket.id}`,
          feedbackUrl: `${process.env.PORTAL_URL || 'https://portal.whms.local'}/support/tickets/${ticket.id}/feedback`,
        });
      }
    } catch (err) {
      console.error('[Support Events] Failed to send ticket_closed email:', err.message);
    }
  });

  console.log('[Support Events] Email trigger listeners registered');
}

module.exports = { SUPPORT_EVENTS, createSupportEmitter, onSupportEvent, registerEmailTriggers };
