'use strict';

/**
 * extensions/notification.registry.js
 *
 * Extension registry for notification providers.
 *
 * Any plugin (Slack, Telegram, Email, etc.) registers here
 * and will be invoked whenever a support event they subscribe
 * to is emitted.
 *
 * Usage:
 *   notificationRegistry.registerProvider(slackProvider)
 */

class NotificationRegistry {
  constructor() {
    /** @type {Map<string, NotificationProvider>} */
    this._providers = new Map();
  }

  /**
   * Register a notification provider.
   *
   * NotificationProvider shape:
   * {
   *   id:          string           // e.g. 'slack'
   *   name:        string           // human-readable
   *   events:      string[]         // SUPPORT_EVENTS to handle
   *   enabled:     boolean
   *   send: async (event, payload, config) => void
   * }
   *
   * @param {NotificationProvider} provider
   */
  registerProvider(provider) {
    if (!provider.id || !provider.events || typeof provider.send !== 'function') {
      throw new Error('Provider must have id, events[], and send()');
    }
    this._providers.set(provider.id, { enabled: true, ...provider });
    console.log(`[NotificationRegistry] Registered provider: ${provider.id}`);
    return this;
  }

  unregisterProvider(id) {
    this._providers.delete(id);
  }

  enableProvider(id)  { this._setEnabled(id, true);  }
  disableProvider(id) { this._setEnabled(id, false); }

  /**
   * Called by the Support module's event listeners.
   * Dispatch an event to all subscribed, enabled providers.
   *
   * @param {string} event    - SUPPORT_EVENTS constant
   * @param {object} payload
   */
  async dispatch(event, payload) {
    const providers = [...this._providers.values()].filter(
      p => p.enabled && p.events.includes(event),
    );

    await Promise.allSettled(
      providers.map(async p => {
        try {
          await p.send(event, payload);
        } catch (err) {
          console.error(`[NotificationRegistry] Provider "${p.id}" failed on ${event}:`, err.message);
        }
      }),
    );
  }

  list() {
    return [...this._providers.values()].map(({ id, name, events, enabled }) => ({
      id, name, events, enabled,
    }));
  }

  _setEnabled(id, enabled) {
    const p = this._providers.get(id);
    if (p) p.enabled = enabled;
  }
}

// ----------------------------------------------------------------
// EVENT BUS BRIDGE
// Connects the platform event bus to this registry automatically.
// ----------------------------------------------------------------

/**
 * Wire all SUPPORT_EVENTS into the notification registry.
 *
 * @param {object} eventBus
 * @param {NotificationRegistry} notificationRegistry
 * @param {string[]} events  - SUPPORT_EVENTS values to bridge
 */
function bridgeEventBus(eventBus, notificationRegistry, events) {
  for (const event of events) {
    eventBus.on(event, (payload) => {
      notificationRegistry.dispatch(event, payload).catch(console.error);
    });
  }
}

module.exports = { NotificationRegistry, bridgeEventBus };
