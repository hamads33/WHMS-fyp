const { Redis } = require('ioredis');
const config = require('./index');

const redisConnection = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  maxRetriesPerRequest: null,
});

redisConnection.on('error', (err) => {
  require('../common/utils/logger').error('Redis connection error', { error: err.message });
});

module.exports = redisConnection;
