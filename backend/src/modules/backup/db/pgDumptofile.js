const { spawn } = require("child_process");
const fs = require("fs-extra");
const os = require("os");
const path = require("path");

/**
 * Parse DATABASE_URL into pg_dump compatible options
 */
function parseDatabaseUrl(url) {
  if (!url) return {};
  const u = new URL(url);
  return {
    host: u.hostname,
    port: Number(u.port || 5432),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace("/", ""),
  };
}

/**
 * Dump DB to a TEMP FILE and return file path
 */
async function pgDumpToTempFile(opts = {}) {
  const parsed = parseDatabaseUrl(process.env.DATABASE_URL);

  const {
    host = parsed.host || "127.0.0.1",
    port = parsed.port || 5432,
    user = opts.user || parsed.user,
    password = opts.password || parsed.password,
    database = opts.database || parsed.database,
    pgDumpPath = "pg_dump",
    extraArgs = [],
  } = opts;

  if (!database) throw new Error("database is required for pg_dump");
  if (!user) throw new Error("database user is required for pg_dump");

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "whms-db-"));
  const outFile = path.join(tmpDir, "db.sql");

  const env = { ...process.env };
  if (password) env.PGPASSWORD = password;

  const args = [
    "-h", host,
    "-p", String(port),
    "-U", user,
    "-F", "p",
    "-f", outFile,
    ...extraArgs,
    database,
  ];

  await new Promise((resolve, reject) => {
    const child = spawn(pgDumpPath, args, { env });

    let stderr = "";
    child.stderr.on("data", d => (stderr += d.toString()));

    child.on("close", code => {
      if (code === 0) resolve();
      else reject(new Error(`pg_dump failed: ${stderr}`));
    });

    child.on("error", reject);
  });

  return outFile;
}

module.exports = {
  pgDumpToTempFile, // ✅ ONLY export
};
