/**
 * Event Emitter
 * ============================================================
 * Manages event lifecycle and workflow triggering
 *
 * Responsibilities:
 *  - Record events in database
 *  - Find matching trigger rules
 *  - Execute triggered workflows
 *  - Handle event filtering
 */

class EventEmitter {
  constructor(options = {}) {
    this.prisma = options.prisma;
    this.workflowService = options.workflowService;
    this.logger = options.logger || console;
    this.audit = options.audit;

    if (!this.prisma) {
      throw new Error("EventEmitter requires prisma");
    }
  }

  /**
   * Emit an event and trigger matching workflows
   */
  async emit(eventType, eventData = {}, metadata = {}) {
    try {
      this.logger.info(`[EVENT] ${eventType} emitted`, {
        source: metadata.source || 'internal'
      });

      // Record event in database if model exists
      let event = { id: null };
      if (this.prisma.workflowEvent) {
        event = await this.prisma.workflowEvent.create({
          data: {
            type: eventType,
            source: metadata.source || 'internal',
            data: eventData,
            metadata,
          },
        });
      }

      // Find trigger rules — support both model names
      const triggerModel = this.prisma.workflowTrigger || this.prisma.workflowTriggerRule;
      if (!triggerModel || !this.workflowService) {
        return { eventId: event.id, eventType, triggered: 0, results: [] };
      }

      const triggers = await triggerModel.findMany({
        where: { eventType, deletedAt: null },
        include: {
          workflow: {
            select: { id: true, name: true, definition: true, enabled: true },
          },
        },
      });

      this.logger.debug(`Found ${triggers.length} trigger rules for ${eventType}`);

      const results = [];
      for (const trigger of triggers) {
        try {
          if (!trigger.workflow?.enabled) continue;
          if (trigger.filter && !this._matchesFilter(eventData, trigger.filter)) continue;

          const result = await this.workflowService.executeWorkflow(
            trigger.workflow.id,
            trigger.workflow.definition,
            { ...eventData, _event: { type: eventType, id: event.id, triggeredAt: new Date() } },
            { triggeredBy: 'event', triggeredByEventId: event.id }
          );

          results.push({
            workflowId: trigger.workflow.id,
            workflowName: trigger.workflow.name,
            status: result.status,
            runId: result.runId,
          });

          if (this.audit) {
            await this.audit.system("workflow.triggered_by_event", {
              entity: "AutomationWorkflow",
              entityId: trigger.workflow.id,
              data: { eventType, eventId: event.id, triggerId: trigger.id },
            });
          }
        } catch (workflowError) {
          this.logger.error(`Failed to execute workflow ${trigger.workflow?.name}:`, workflowError);
          results.push({
            workflowId: trigger.workflow?.id,
            workflowName: trigger.workflow?.name,
            status: 'failed',
            error: workflowError.message,
          });
        }
      }

      return { eventId: event.id, eventType, triggered: results.length, results };
    } catch (error) {
      // Never crash the caller — just log
      this.logger.error(`Failed to emit event ${eventType}:`, error);
      return { eventId: null, eventType, triggered: 0, error: error.message };
    }
  }

  /**
   * Check if event data matches filter conditions
   */
  _matchesFilter(eventData, filter) {
    try {
      if (!filter) return true;

      // Simple key-value matching
      for (const [key, value] of Object.entries(filter)) {
        if (eventData[key] !== value) {
          return false;
        }
      }

      return true;
    } catch (error) {
      this.logger.error("Error evaluating filter:", error);
      return false;
    }
  }

  /**
   * Subscribe to event type (convenience method for testing)
   */
  async subscribe(eventType, callback) {
    // This is just for testing/development
    // In production, use trigger rules in database
    this.logger.warn("Subscribe method is for development only. Use trigger rules instead.");
  }

  /**
   * Unsubscribe from event (development only)
   */
  async unsubscribe(eventType) {
    this.logger.warn("Unsubscribe method is for development only.");
  }
}

module.exports = EventEmitter;