/**
 * Provisioning Socket.io Events
 * Path: src/modules/provisioning/socket/provisioning.socket.js
 *
 * Real-time updates for provisioning jobs
 * Emits:
 * - provisioning:started
 * - provisioning:progress
 * - provisioning:completed
 * - provisioning:failed
 */

function setupProvisioningSocket(io) {
  io.on('connection', (socket) => {
    // Join provisioning namespace
    socket.on('provisioning:watch', (jobId) => {
      socket.join(`provisioning:${jobId}`);
      console.log(`[socket] Client watching job: ${jobId}`);
    });

    socket.on('provisioning:unwatch', (jobId) => {
      socket.leave(`provisioning:${jobId}`);
      console.log(`[socket] Client unwatching job: ${jobId}`);
    });
  });

  // Store io instance globally for worker to emit events
  global.io = io;
}

/**
 * Emit provisioning started event
 */
function emitProvisioningStarted(io, jobId, data) {
  io.to(`provisioning:${jobId}`).emit('provisioning:started', {
    jobId,
    ...data,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Emit provisioning progress
 */
function emitProvisioningProgress(io, jobId, progress, data = {}) {
  io.to(`provisioning:${jobId}`).emit('provisioning:progress', {
    jobId,
    progress,
    ...data,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Emit provisioning completed
 */
function emitProvisioningCompleted(io, jobId, result) {
  io.to(`provisioning:${jobId}`).emit('provisioning:completed', {
    jobId,
    result,
    status: 'completed',
    timestamp: new Date().toISOString(),
  });
}

/**
 * Emit provisioning failed
 */
function emitProvisioningFailed(io, jobId, error, attemptsMade) {
  io.to(`provisioning:${jobId}`).emit('provisioning:failed', {
    jobId,
    error,
    status: 'failed',
    attemptsMade,
    timestamp: new Date().toISOString(),
  });
}

module.exports = {
  setupProvisioningSocket,
  emitProvisioningStarted,
  emitProvisioningProgress,
  emitProvisioningCompleted,
  emitProvisioningFailed,
};
