'use strict';

/**
 * automation/automation.registry.js
 *
 * Extension registry for ticket automation rules.
 *
 * Rules are evaluated in priority order whenever a trigger event
 * fires inside the ticket sub-system.
 *
 * Example use-cases:
 *  - Auto-assign tickets by keyword
 *  - Auto-close tickets after N days of inactivity
 *  - Auto-reply with canned responses
 *  - SLA escalation rules
 *  - AI-powered responder plugin
 *
 * Plugins register rules via:
 *   automationRegistry.register({ ... })
 */

class AutomationRegistry {
  constructor() {
    /** @type {AutomationRule[]} */
    this._rules = [];
  }

  /**
   * Register an automation rule.
   *
   * @param {AutomationRule} rule
   *
   * AutomationRule shape:
   * {
   *   id:       string           // unique rule identifier
   *   name:     string           // human-readable
   *   trigger:  string           // event name, e.g. 'ticket.created'
   *   priority: number           // lower = runs first (default 100)
   *   enabled:  boolean
   *   condition: async (payload) => boolean   // optional filter
   *   action:   async (payload, context) => void
   * }
   */
  register(rule) {
    if (!rule.id || !rule.trigger || typeof rule.action !== 'function') {
      throw new Error('AutomationRule must have id, trigger, and action');
    }

    if (this._rules.find(r => r.id === rule.id)) {
      throw new Error(`Automation rule "${rule.id}" is already registered`);
    }

    this._rules.push({
      priority: 100,
      enabled: true,
      condition: null,
      ...rule,
    });

    // Keep sorted by priority
    this._rules.sort((a, b) => a.priority - b.priority);
    return this;
  }

  unregister(ruleId) {
    this._rules = this._rules.filter(r => r.id !== ruleId);
  }

  enable(ruleId)  { this._setEnabled(ruleId, true);  }
  disable(ruleId) { this._setEnabled(ruleId, false); }

  /**
   * Evaluate all matching rules for a given trigger event.
   *
   * @param {string}  trigger   - event name
   * @param {object}  payload   - event data
   * @param {object}  context   - { prisma, emitter, services, ... }
   */
  async evaluate(trigger, payload, context = {}) {
    const rules = this._rules.filter(r => r.trigger === trigger && r.enabled);

    for (const rule of rules) {
      try {
        // Evaluate condition guard if present
        if (rule.condition) {
          const matches = await rule.condition(payload);
          if (!matches) continue;
        }
        await rule.action(payload, context);
      } catch (err) {
        // Rules must never crash the request — log and continue
        console.error(`[AutomationRegistry] Rule "${rule.id}" failed:`, err.message);
      }
    }
  }

  listRules() {
    return this._rules.map(({ id, name, trigger, priority, enabled }) => ({
      id, name, trigger, priority, enabled,
    }));
  }

  _setEnabled(ruleId, enabled) {
    const rule = this._rules.find(r => r.id === ruleId);
    if (rule) rule.enabled = enabled;
  }
}

// ----------------------------------------------------------------
// BUILT-IN RULES (registered by default)
// ----------------------------------------------------------------

/**
 * Register the default platform rules.
 * @param {AutomationRegistry} registry
 * @param {{ ticketService, deptService, prisma }} services
 */
function registerDefaultRules(registry, { ticketService }) {

  // ── Auto-close stale tickets ────────────────────────────────────
  registry.register({
    id:       'auto-close-stale',
    name:     'Auto-close tickets waiting > 7 days without client reply',
    trigger:  'ticket.status_changed',    // re-evaluate on any status change
    priority: 200,
    async condition(payload) {
      if (payload.toStatus !== 'waiting_for_client') return false;
      const ticket = payload.ticket;
      const age = Date.now() - new Date(ticket.updatedAt).getTime();
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      return age > sevenDays;
    },
    async action(payload) {
      await ticketService.closeTicket(
        payload.ticket.id,
        'system',
        'Auto-closed: no client response in 7 days',
      );
    },
  });

  // ── Urgent escalation ───────────────────────────────────────────
  registry.register({
    id:       'urgent-escalation-notify',
    name:     'Emit alert when an urgent ticket has no first response in 30 min',
    trigger:  'ticket.created',
    priority: 50,
    async condition(payload) {
      return payload.ticket.priority === 'urgent';
    },
    async action(payload, { emitter }) {
      // Schedule check in 30 minutes via a delayed job (pseudo-code)
      // In real implementation, push to a job queue (BullMQ/pg-boss)
      console.warn(
        `[Automation] URGENT ticket ${payload.ticket.ticketNumber} created — SLA clock started`,
      );
    },
  });
}

module.exports = { AutomationRegistry, registerDefaultRules };
