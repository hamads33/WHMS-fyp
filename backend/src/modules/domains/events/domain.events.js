const EventEmitter = require("events");
const emitter = new EventEmitter();

// Registered
function emitDomainRegistered(domain) {
  emitter.emit("domain.registered", domain);
}
function onDomainRegistered(handler) {
  emitter.on("domain.registered", handler);
}

// Deleted
function emitDomainDeleted(domain) {
  emitter.emit("domain.deleted", domain);
}
function onDomainDeleted(handler) {
  emitter.on("domain.deleted", handler);
}

module.exports = {
  emitter,
  emitDomainRegistered,
  onDomainRegistered,
  emitDomainDeleted,
  onDomainDeleted
};
