function assertNumber(v, name) {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw new Error(`${name} must be a positive integer`);
  return n;
}

function isPlainObject(o) {
  return o && typeof o === 'object' && !Array.isArray(o);
}

module.exports = { assertNumber, isPlainObject };
