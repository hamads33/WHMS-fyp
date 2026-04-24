require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('./index');
const logger = require('../common/utils/logger');

const MIGRATIONS = [
  '001_initial.sql',
  '002_plans_extend.sql',
];

async function migrate() {
  try {
    for (const file of MIGRATIONS) {
      const sqlPath = path.join(__dirname, 'migrations', file);
      const sql = fs.readFileSync(sqlPath, 'utf8');
      await pool.query(sql);
      logger.info(`Applied migration: ${file}`);
    }
    logger.info('All migrations completed successfully');
  } catch (err) {
    logger.error('Migration failed', { error: err.message });
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
