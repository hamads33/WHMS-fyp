require('dotenv').config();
const app = require('./src/app');
const { pool } = require('./src/database');
const logger = require('./src/common/utils/logger');
require('./src/queues/command.worker');

const PORT = process.env.PORT || 4000;

async function start() {
  try {
    await pool.query('SELECT 1');
    logger.info('Database connection established');

    app.listen(PORT, () => {
      logger.info(`WHMS Distlay backend running on port ${PORT} [${process.env.NODE_ENV}]`);
    });
  } catch (err) {
    logger.error('Startup failed', { error: err.message });
    process.exit(1);
  }
}

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason });
  process.exit(1);
});

start();
