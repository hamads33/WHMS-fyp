// module-local logger (simple, replaceable)
const util = require('util');
function log(...args) {
  console.log(new Date().toISOString(), ...args.map(a => typeof a === 'object' ? util.inspect(a, { depth: 2 }) : a));
}
function error(...args) {
  console.error(new Date().toISOString(), ...args.map(a => typeof a === 'object' ? util.inspect(a, { depth: 2 }) : a));
}
module.exports = { log, error };
