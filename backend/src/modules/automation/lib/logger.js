// src/modules/automation/lib/logger.js

const { createLogger, format, transports } = require("winston");
const path = require("path");
const fs = require("fs");

// Ensure logs folder exists
const logDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const automationLogger = createLogger({
  level: process.env.AUTOMATION_LOG_LEVEL || "info",
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  transports: [
    new transports.Console({}),
    new transports.File({
      filename: path.join(logDir, "automation.log"),
      maxsize: 5 * 1024 * 1024, // 5mb
      maxFiles: 5,
    })
  ],
  exitOnError: false
});

module.exports = automationLogger;
