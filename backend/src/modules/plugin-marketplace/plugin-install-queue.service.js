/**
 * plugin-install-queue.service.js
 * ------------------------------------------------------------------
 * Lightweight in-memory job queue for async plugin installation.
 * No Redis required — suitable for development and small-to-medium deployments.
 *
 * Features:
 *   • Job enqueuing with auto UUID generation
 *   • SSE streaming for real-time progress
 *   • Automatic cleanup after completion (30s TTL)
 *   • Polling fallback via getJob()
 *
 * Design:
 *   Jobs run sequentially per slug (prevent concurrent installs of same plugin).
 *   Multiple slugs can install in parallel.
 *   SSE clients subscribe per-job and receive typed events.
 */

const { v4: uuid } = require("uuid");

class PluginInstallQueue {
  /**
   * @param {object} opts
   * @param {object} opts.installerService  - PluginInstallerService instance
   * @param {object} opts.pluginStateService - PluginStateService instance
   * @param {object} [opts.logger]
   */
  constructor({ installerService, pluginStateService, logger = console } = {}) {
    this.installer      = installerService;
    this.pluginState    = pluginStateService;
    this.logger         = logger;

    // Map<jobId, jobRecord>
    // jobRecord: { jobId, slug, status, step, progress, error, createdAt, completedAt }
    this._jobs = new Map();

    // Map<jobId, Set<response>>  — SSE client connections
    this._sseClients = new Map();

    // Map<slug, jobId>  — track current job per slug (prevent concurrent installs)
    this._activeJobsBySlug = new Map();
  }

  /**
   * enqueue
   * Enqueue a new plugin installation job with atomic check-and-set.
   * Returns immediately with jobId. Actual install runs in background.
   * Prevents race condition where multiple requests could enqueue duplicate installs.
   *
   * @param  {string} slug
   * @returns {{ jobId: string }}
   */
  enqueue(slug) {
    // Atomic check-and-set: use _enqueueAtomically to prevent race conditions
    return this._enqueueAtomically(slug);
  }

  /**
   * _enqueueAtomically
   * Private method that performs atomic check-and-set for job enqueuing.
   * Ensures only one job per slug can be enqueued at a time.
   *
   * @private
   */
  _enqueueAtomically(slug) {
    // Check if this slug is already installing
    const existingJobId = this._activeJobsBySlug.get(slug);
    if (existingJobId) {
      const existingJob = this._jobs.get(existingJobId);
      if (existingJob && !["completed", "failed"].includes(existingJob.status)) {
        this.logger.warn(`[Queue] Slug "${slug}" is already installing (jobId: ${existingJobId})`);
        return { jobId: existingJobId };
      }
    }

    // Create new job (atomically set before running to prevent duplicate enqueuing)
    const jobId = uuid();
    const jobRecord = {
      jobId,
      slug,
      status    : "queued",    // queued | running | completed | failed
      step      : "queued",    // downloading | extracting | validating | booting | completed | failed
      progress  : 0,
      error     : null,
      createdAt : new Date().toISOString(),
      completedAt: null,
    };

    // Atomic: set in both maps before starting the job
    this._jobs.set(jobId, jobRecord);
    this._activeJobsBySlug.set(slug, jobId);
    this._sseClients.set(jobId, new Set());

    this.logger.info(`[Queue] Job enqueued: ${jobId} (${slug})`);

    // Run job in background (fire and forget with error logging)
    setImmediate(() => this._run(jobId).catch(err => {
      this.logger.error(`[Queue] Job ${jobId} failed with unhandled error: ${err.message}`);
    }));

    return { jobId };
  }

  /**
   * getJob
   * Polling fallback — get current job status without SSE.
   *
   * @param  {string} jobId
   * @returns {object|null}
   */
  getJob(jobId) {
    return this._jobs.get(jobId) || null;
  }

  /**
   * subscribe
   * Register an SSE client for job event streaming.
   *
   * @param {string} jobId
   * @param {object} res  - Express response object
   */
  subscribe(jobId, res) {
    const job = this._jobs.get(jobId);
    if (!job) {
      res.status(404).json({ error: "Job not found" });
      return;
    }

    // Setup SSE response headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering
    res.flushHeaders();

    // Register this response as an SSE client
    const clients = this._sseClients.get(jobId) || new Set();
    clients.add(res);
    this._sseClients.set(jobId, clients);

    // Send current state immediately
    this._emitJobEvent(jobId, {
      type: "status",
      step: job.step,
      progress: job.progress,
      status: job.status,
      error: job.error,
    });

    // Send "done" comment to keep connection alive
    res.write(": keep-alive\n\n");

    // Cleanup on disconnect
    res.on("close", () => {
      const cs = this._sseClients.get(jobId);
      if (cs) {
        cs.delete(res);
        if (cs.size === 0) {
          this._sseClients.delete(jobId);
        }
      }
    });

    res.on("error", (err) => {
      this.logger.warn(`[Queue] SSE error for job ${jobId}: ${err.message}`);
      const cs = this._sseClients.get(jobId);
      if (cs) {
        cs.delete(res);
        if (cs.size === 0) {
          this._sseClients.delete(jobId);
        }
      }
    });
  }

  // ================================================================
  // Private
  // ================================================================

  /**
   * _run
   * Internal: execute the installation job.
   *
   * @private
   */
  async _run(jobId) {
    const job = this._jobs.get(jobId);
    if (!job) return;

    job.status = "running";
    this.pluginState.setState(job.slug, "downloading");

    try {
      // Call installer with progress callback
      const onProgress = (step, progress) => {
        job.step = step;
        job.progress = progress;

        // Update plugin state
        if (step === "downloading") this.pluginState.setState(job.slug, "downloading");
        else if (step === "extracting") this.pluginState.setState(job.slug, "extracting");
        else if (step === "validating") this.pluginState.setState(job.slug, "validating");
        else if (step === "booting") this.pluginState.setState(job.slug, "booting");

        // Emit event to SSE clients
        this._emitJobEvent(jobId, {
          type: "progress",
          step,
          progress,
        });

        this.logger.debug(`[Queue] Job ${jobId}: ${step} ${progress}%`);
      };

      const result = await this.installer.installPlugin(job.slug, onProgress);

      // Success
      job.status = "completed";
      job.step = "completed";
      job.progress = 100;
      job.completedAt = new Date().toISOString();
      this.pluginState.setState(job.slug, "active");

      this._emitJobEvent(jobId, {
        type: "completed",
        result,
      });

      this.logger.info(`[Queue] Job ${jobId} completed successfully`);

      // Cleanup after 30 seconds
      this._scheduleCleanup(jobId, 30000);
    } catch (err) {
      // Failure
      job.status = "failed";
      job.error = err.message;
      job.progress = 0;
      job.completedAt = new Date().toISOString();
      this.pluginState.setState(job.slug, "failed");

      this._emitJobEvent(jobId, {
        type: "error",
        error: err.message,
      });

      this.logger.error(`[Queue] Job ${jobId} failed: ${err.message}`);

      // Cleanup after 30 seconds
      this._scheduleCleanup(jobId, 30000);
    } finally {
      // Clear active job reference
      this._activeJobsBySlug.delete(job.slug);
    }
  }

  /**
   * _emitJobEvent
   * Send SSE event to all subscribed clients for a job.
   *
   * @private
   */
  _emitJobEvent(jobId, event) {
    const clients = this._sseClients.get(jobId);
    if (!clients || clients.size === 0) return;

    const data = JSON.stringify(event);
    const sseMessage = `data: ${data}\n\n`;

    for (const res of clients) {
      res.write(sseMessage);
    }
  }

  /**
   * _scheduleCleanup
   * Close SSE connections and clean up job record after delay.
   *
   * @private
   */
  _scheduleCleanup(jobId, delayMs = 30000) {
    setTimeout(() => {
      // Close all SSE clients
      const clients = this._sseClients.get(jobId);
      if (clients) {
        for (const res of clients) {
          res.end();
        }
        this._sseClients.delete(jobId);
      }

      // Keep job record for a bit longer for audit/debugging
      // (optional: delete after 5 minutes)
      setTimeout(() => {
        if (this._jobs.has(jobId)) {
          this._jobs.delete(jobId);
          this.logger.debug(`[Queue] Job ${jobId} cleaned up`);
        }
      }, 5 * 60 * 1000);
    }, delayMs);
  }

  /**
   * listJobs
   * Return all jobs (useful for admin dashboard).
   * Only used for debugging/monitoring.
   *
   * @returns {object[]}
   */
  listJobs() {
    return [...this._jobs.values()];
  }
}

module.exports = PluginInstallQueue;
