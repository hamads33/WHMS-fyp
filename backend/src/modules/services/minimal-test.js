/**
 * Minimal Test - Just check if endpoints work
 * Run: node minimal-test.js
 */

const http = require("http");

function request(method, path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "localhost",
      port: 4000,
      path: path,
      method: method,
      headers: { "Content-Type": "application/json" },
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        resolve({
          status: res.statusCode,
          body: data,
        });
      });
    });

    req.on("error", reject);
    req.end();
  });
}

async function test() {
  console.log("\n🧪 MINIMAL TEST\n");

  const endpoints = [
    { name: "Health Check", method: "GET", path: "/health" },
    { name: "List Services (Admin)", method: "GET", path: "/api/admin/services" },
    { name: "List Services (Client)", method: "GET", path: "/api/client/services" },
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`Testing: ${endpoint.name}`);
      console.log(`  ${endpoint.method} ${endpoint.path}`);

      const res = await request(endpoint.method, endpoint.path);

      console.log(`  Status: ${res.status}`);
      console.log(`  Response: ${res.body.substring(0, 100)}...`);
      console.log("");
    } catch (err) {
      console.log(`  ❌ Error: ${err.message}\n`);
    }
  }
}

test();