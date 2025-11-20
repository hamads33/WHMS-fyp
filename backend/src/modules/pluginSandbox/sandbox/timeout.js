function setExecutionTimeout(cb, ms) {
  return setTimeout(cb, ms).unref();
}

module.exports = { setExecutionTimeout };
