const fs = require("fs-extra");
const archiver = require("archiver");
const path = require("path");
const { spawn } = require("child_process");

/**
 * Create a .tar.gz from multiple files/folders
 */
async function compressToTarGz(sources = [], outFilePath) {
  await fs.ensureDir(path.dirname(outFilePath));

  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outFilePath);
    const archive = archiver("tar", { gzip: true, gzipOptions: { level: 6 } });

    output.on("close", () => resolve(outFilePath));
    archive.on("error", reject);

    archive.on("warning", (err) => {
      if (err.code !== "ENOENT") reject(err);
    });

    archive.pipe(output);

    for (const src of sources) {
      const base = path.basename(src);
      const stat = fs.statSync(src);

      if (stat.isDirectory()) archive.directory(src, base);
      else archive.file(src, { name: base });
    }

    archive.finalize();
  });
}

/**
 * Run DB Dump (MySQL or PostgreSQL)
 * For PostgreSQL, pg_dump writes directly to -f
 * For MySQL, stdout → file stream
 */
async function runDbDump(options = {}) {
  const { engine, host, port, user, password, database, outFile } = options;

  if (!engine) throw new Error("runDbDump: engine is required (mysql|pg)");
  if (!outFile) throw new Error("runDbDump: outFile is missing");
  if (!database) throw new Error("runDbDump: database is missing");

  // -----------------------------
  // MYSQL (mysqldump)
  // -----------------------------
  if (engine === "mysql") {
    const args = [
      `-h${host || "127.0.0.1"}`,
      `-P${port || 3306}`,
      `-u${user}`,
      "--single-transaction",
      "--quick",
      database,
    ];

    return spawnToFile(
      "mysqldump",
      args,
      { env: { ...process.env, MYSQL_PWD: password || "" } },
      outFile,
      { pipeStdout: true }
    );
  }

  // -----------------------------
  // POSTGRESQL (pg_dump)
  // -----------------------------
  if (engine === "pg") {
    /**
     * IMPORTANT:
     * pg_dump -F p -f file.sql  DOES NOT USE STDOUT
     * It writes directly to the file.
     */
    const args = [
      "-h", host || "127.0.0.1",
      "-p", String(port || 5432),
      "-U", user,
      "-F", "p",              // plain SQL
      "-f", outFile,          // output file
      database,
    ];

    return spawnToFile(
      "pg_dump",
      args,
      { env: { ...process.env, PGPASSWORD: password || "" } },
      outFile,
      { pipeStdout: false }
    );
  }

  throw new Error(`Unsupported DB engine: ${engine}`);
}

/**
 * Spawn process → write to file if needed
 */
function spawnToFile(cmd, args, options, outFile, opts = { pipeStdout: false }) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, options);

    let fsStream = null;
    let stderr = "";

    // MySQL dumps via stdout
    if (opts.pipeStdout) {
      fsStream = fs.createWriteStream(outFile);
      child.stdout.pipe(fsStream);
    }

    child.stderr.on("data", (chunk) => (stderr += chunk.toString()));

    child.on("error", (err) => {
      if (fsStream) fsStream.end();
      reject(err);
    });

    child.on("close", (code) => {
      if (fsStream) {
        fsStream.end(() => {
          if (code === 0) resolve(outFile);
          else reject(new Error(`${cmd} exited with ${code}: ${stderr}`));
        });
      } else {
        if (code === 0) resolve(outFile);
        else reject(new Error(`${cmd} exited with ${code}: ${stderr}`));
      }
    });
  });
}

module.exports = {
  compressToTarGz,
  runDbDump,
};
