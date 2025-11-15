const mock = require('./mock');
const namecheap = require('./namecheap');

/**
 * Returns the correct provider object by name.
 * Adds default cancelDomainWithAPI if missing.
 */
function getProvider(name = 'mock') {
  let client;

  switch ((name || '').toLowerCase()) {
    case 'namecheap':
      client = namecheap;
      break;
    case 'mock':
    default:
      client = mock;
      break;
  }

  // Ensure cancelDomainWithAPI exists
  if (!client.cancelDomainWithAPI) {
    client.cancelDomainWithAPI = async () => ({ success: true });
  }

  return client;
}

module.exports = getProvider;
