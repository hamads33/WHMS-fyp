/**
 * Standalone auth flow test
 * Tests: login → session creation → session lookup
 */

const http = require("http");
const url = require("url");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const API_URL = "http://localhost:4000";

async function test() {
  console.log("\n=== AUTH FLOW TEST ===\n");

  try {
    // 1. LOGIN
    console.log("1️⃣ Testing login endpoint...");
    const loginResponse = await new Promise((resolve, reject) => {
      const postData = JSON.stringify({
        email: "superadmin@example.com",
        password: "SuperAdmin123!",
      });

      const options = {
        hostname: "localhost",
        port: 4000,
        path: "/api/auth/login",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": postData.length,
        },
      };

      const req = http.request(options, (res) => {
        let data = "";
        let cookies = res.headers["set-cookie"] || [];

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          const body = JSON.parse(data);
          resolve({ status: res.statusCode, body, cookies });
        });
      });

      req.on("error", reject);
      req.write(postData);
      req.end();
    });

    console.log(`   Status: ${loginResponse.status}`);
    console.log(`   User: ${loginResponse.body.user.email}`);
    console.log(`   Roles: ${loginResponse.body.user.roles.join(", ")}`);
    console.log(`   Cookies set: ${loginResponse.cookies.length}`);
    console.log(`   AccessToken: ${loginResponse.body.accessToken.slice(0, 20)}...`);

    if (loginResponse.status !== 200) {
      throw new Error(`Login failed with status ${loginResponse.status}`);
    }

    // Extract token and cookies
    const token = loginResponse.body.accessToken;
    const accessTokenCookie = loginResponse.cookies
      .find((c) => c.startsWith("access_token="))
      .split(";")[0];

    console.log(`\n2️⃣ Checking session in database...\n`);

    // 2. CHECK SESSION IN DB
    const session = await prisma.session.findUnique({
      where: { token },
      select: { id: true, userId: true, expiresAt: true },
    });

    if (!session) {
      throw new Error("Session not found in database!");
    }

    console.log(`   Session ID: ${session.id}`);
    console.log(`   User ID: ${session.userId}`);
    console.log(`   Expires: ${session.expiresAt}`);

    // 3. TEST SESSION ENDPOINT
    console.log(`\n3️⃣ Testing /auth/sessions/current endpoint...\n`);

    const sessionResponse = await new Promise((resolve, reject) => {
      const options = {
        hostname: "localhost",
        port: 4000,
        path: "/api/auth/sessions/current",
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Cookie: accessTokenCookie,
        },
      };

      const req = http.request(options, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          const body = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, body });
        });
      });

      req.on("error", reject);
      req.end();
    });

    console.log(`   Status: ${sessionResponse.status}`);
    if (sessionResponse.status === 200) {
      console.log(`   User: ${sessionResponse.body.user.email}`);
      console.log(`   Portal: ${sessionResponse.body.portal}`);
      console.log(`   Roles: ${sessionResponse.body.user.roles.join(", ")}`);
      console.log(`\n✅ AUTH FLOW WORKS!\n`);
    } else {
      console.error(`   Error: ${sessionResponse.body.error}`);
      throw new Error(`Session endpoint returned ${sessionResponse.status}`);
    }
  } catch (err) {
    console.error("\n❌ TEST FAILED:", err.message, "\n");
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

test();
