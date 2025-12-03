const BuildLogService = require('../services/buildLog.service');

module.exports = {
  // GET /marketplace/admin/build-logs/submission/:submissionId
  async listForSubmission(req, res) {
    try {
      const submissionId = req.params.submissionId;
      const skip = Number(req.query.skip || 0);
      const take = Math.min(Number(req.query.take || 100), 1000);
      const rows = await BuildLogService.listForSubmission(submissionId, { skip, take });
      return res.json({ ok: true, data: rows });
    } catch (err) {
      return res.status(500).json({ ok: false, message: err.message });
    }
  },

  // GET /marketplace/seller/build-logs/product/:productId
  async listForProduct(req, res) {
    try {
      const productId = req.params.productId;
      const skip = Number(req.query.skip || 0);
      const take = Math.min(Number(req.query.take || 100), 1000);
      const rows = await BuildLogService.listForProduct(productId, { skip, take });
      return res.json({ ok: true, data: rows });
    } catch (err) {
      return res.status(500).json({ ok: false, message: err.message });
    }
  },

  // GET /marketplace/submissions/:submissionId/logs/tail?after=TIMESTAMP
  // SSE optional: stream new logs
  async tail(req, res) {
    try {
      const submissionId = req.params.submissionId;
      const after = req.query.after || null;

      // If client accepts text/event-stream, use SSE
      const accept = req.headers.accept || '';
      if (accept.includes('text/event-stream')) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders && res.flushHeaders();

        // Initial batch
        const rows = await BuildLogService.tail(submissionId, after);
        for (const r of rows) {
          res.write(`data: ${JSON.stringify(r)}\n\n`);
        }

        // Keep connection open — NOTE: simple polling fallback inside server not implemented.
        // For production use a pub/sub to push new logs (e.g. Redis pubsub).
        // Here we just keep socket open; caller should reconnect frequently.
        // To avoid infinite connection, set a timeout to end after 5 minutes.
        const timeout = setTimeout(() => {
          res.write(': end\n\n');
          res.end();
        }, 5 * 60 * 1000);

        req.on('close', () => {
          clearTimeout(timeout);
        });

        return;
      }

      // Normal JSON tail
      const rowsJson = await BuildLogService.tail(submissionId, after);
      return res.json({ ok: true, data: rowsJson });
    } catch (err) {
      return res.status(500).json({ ok: false, message: err.message });
    }
  },

  // GET /marketplace/build-logs/:id
  async get(req, res) {
    try {
      const id = req.params.id;
      const row = await BuildLogService.get(id);
      if (!row) return res.status(404).json({ ok: false, message: 'Not found' });
      return res.json({ ok: true, data: row });
    } catch (err) {
      return res.status(500).json({ ok: false, message: err.message });
    }
  }
};
