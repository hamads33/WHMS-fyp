"use strict";

function resolveApp(appOrReq) {
  if (!appOrReq) return null;
  if (appOrReq.app?.locals) return appOrReq.app;
  if (appOrReq.locals) return appOrReq;
  return null;
}

function getEmitter(appOrReq) {
  const app = resolveApp(appOrReq);
  return app?.locals?.eventEmitter || app?.locals?.automationEventEmitter || null;
}

async function emitAutomationEvent(appOrReq, eventType, payload = {}, metadata = {}) {
  const emitter = getEmitter(appOrReq);
  if (!emitter?.emit || !eventType) return null;
  return emitter.emit(eventType, payload, metadata);
}

module.exports = {
  getEmitter,
  emitAutomationEvent,
};
