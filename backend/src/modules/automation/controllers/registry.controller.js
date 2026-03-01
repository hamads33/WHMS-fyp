/**
 * Registry Controller
 * ------------------------------------------------------------------
 * Exposes the full events + actions catalogue to the frontend
 * so the workflow builder can populate its trigger/action pickers.
 *
 * GET /api/automation/registry/events  → grouped events by module
 * GET /api/automation/registry/actions → grouped actions by module
 * GET /api/automation/registry         → both in one call
 */

const { EVENTS_REGISTRY, getAllEvents } = require('../registry/events.registry');

class RegistryController {
  constructor({ actionRegistry, logger }) {
    this.actionRegistry = actionRegistry;
    this.logger = logger;
  }

  // ----------------------------------------------------------------
  // GET /api/automation/registry/events
  // ----------------------------------------------------------------
  getEvents(req, res) {
    const search = (req.query.search || '').toLowerCase();

    if (search) {
      const flat = getAllEvents().filter(
        (e) =>
          e.type.includes(search) ||
          e.label.toLowerCase().includes(search) ||
          e.description.toLowerCase().includes(search) ||
          e.module.includes(search)
      );
      return res.success({ events: flat, total: flat.length });
    }

    return res.success({ events: EVENTS_REGISTRY });
  }

  // ----------------------------------------------------------------
  // GET /api/automation/registry/actions
  // ----------------------------------------------------------------
  getActions(req, res) {
    const all = this.actionRegistry.list ? this.actionRegistry.list() : [...this.actionRegistry.actionMap.entries()].map(([key, a]) => ({
      key,
      name: a.name,
      type: a.type || 'builtin',
      actionType: a.actionType || key,
      module: a.module || 'core',
      description: a.description,
      schema: a.schema || null,
    }));

    const search = (req.query.search || '').toLowerCase();
    const filtered = search
      ? all.filter(
          (a) =>
            a.name?.toLowerCase().includes(search) ||
            a.description?.toLowerCase().includes(search) ||
            a.module?.toLowerCase().includes(search) ||
            (a.key || a.actionType)?.includes(search)
        )
      : all;

    // Group by module
    const grouped = {};
    for (const action of filtered) {
      const mod = action.module || 'core';
      if (!grouped[mod]) grouped[mod] = [];
      grouped[mod].push(action);
    }

    return res.success({ actions: grouped, flat: filtered, total: filtered.length });
  }

  // ----------------------------------------------------------------
  // GET /api/automation/registry
  // ----------------------------------------------------------------
  getAll(req, res) {
    const all = this.actionRegistry.list ? this.actionRegistry.list() : [...this.actionRegistry.actionMap.entries()].map(([key, a]) => ({
      key,
      name: a.name,
      type: a.type || 'builtin',
      actionType: a.actionType || key,
      module: a.module || 'core',
      description: a.description,
      schema: a.schema || null,
    }));

    const grouped = {};
    for (const action of all) {
      const mod = action.module || 'core';
      if (!grouped[mod]) grouped[mod] = [];
      grouped[mod].push(action);
    }

    return res.success({
      events: EVENTS_REGISTRY,
      actions: grouped,
      meta: {
        totalEvents: getAllEvents().length,
        totalActions: all.length,
        modules: Object.keys(EVENTS_REGISTRY),
      },
    });
  }
}

module.exports = RegistryController;
