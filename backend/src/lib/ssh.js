const { Client } = require("ssh2");

function runSSH(command) {
  return new Promise((resolve, reject) => {
    const host = process.env.SSH_HOST;
    const username = process.env.SSH_USER;
    const password = process.env.SSH_PASS;

    if (!host || !username || !password) {
      return reject(
        new Error("Missing SSH configuration: SSH_HOST, SSH_USER, SSH_PASS")
      );
    }

    const conn = new Client();
    let stdout = "";
    let stderr = "";
    let completed = false;

    const done = (err, result) => {
      if (completed) return;
      completed = true;
      conn.end();
      if (err) return reject(err);
      return resolve(result);
    };

    conn
      .on("ready", () => {
        conn.exec(command, (err, stream) => {
          if (err) return done(err);

          stream.on("data", (chunk) => {
            stdout += chunk.toString();
          });

          stream.stderr.on("data", (chunk) => {
            stderr += chunk.toString();
          });

          stream.on("close", (code) => {
            if (code !== 0) {
              return done(
                new Error(
                  `SSH command failed with exit code ${code}: ${stderr || stdout}`
                )
              );
            }

            return done(null, {
              stdout: stdout.trim(),
              stderr: stderr.trim(),
            });
          });
        });
      })
      .on("error", (error) => {
        done(new Error(`SSH connection failed: ${error.message}`));
      })
      .connect({
        host,
        port: 22,
        username,
        password,
      });
  });
}

module.exports = { runSSH };
