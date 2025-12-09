// src/modules/backup/db/pgDumpStream.js
const { spawn } = require("child_process");
const zlib = require("zlib");
const stream = require("stream");

/**
 * Returns: Readable stream containing gzipped SQL dump
 * opts = { host, port, user, password, database, pgDumpPath }
 */
function pgDumpToGzipStream(opts = {}) {
  const {
    host = "127.0.0.1",
    port = 5432,
    user,
    password,
    database,
    pgDumpPath = "pg_dump",
    extraArgs = []
  } = opts;

  if (!database) throw new Error("database is required for pg_dump");

  const env = { ...process.env };
  if (password) env.PGPASSWORD = password;

  // Build args array (no shell interpolation)
  const args = [
    "-h", host,
    "-p", String(port),
    "-U", user,
    "-F", "p",     // plain SQL so it's portable
    "-f", "-",     // write to stdout (pg_dump supports '-' as stdout)
    ...extraArgs,
    database
  ];

  // spawn pg_dump
  const child = spawn(pgDumpPath, args, { env });

  // If pg_dump writes to stdout, child.stdout is the SQL stream
  // pipe through gzip
  const gzip = zlib.createGzip({ level: 6 });

  // propagate errors cleanly
  child.stderr.on("data", (d) => {
    // optional: collect stderr for logs
    // console.error("pg_dump stderr:", d.toString());
  });

  // When pg_dump exits with non-zero, emit error on gzip stream
  child.on("close", (code) => {
    if (code !== 0) {
      gzip.destroy(new Error(`pg_dump exited with code ${code}`));
    }
  });

  // Ensure errors forward
  child.stdout.on("error", (err) => gzip.destroy(err));
  child.on("error", (err) => gzip.destroy(err));

  // Return a Node readable stream: pg_dump stdout -> gzip
  return child.stdout.pipe(gzip);
}

module.exports = { pgDumpToGzipStream };
