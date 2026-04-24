/**
 * Service Structure Check - Verify all files exist and are loadable
 * Run: node service-structure-check.js
 */

const fs = require("fs");
const path = require("path");

console.log("\n📁 SERVICES MODULE STRUCTURE CHECK\n");

const basePath = path.join(process.cwd(), "src", "modules", "services");

const requiredFiles = [
  "index.js",
  "dtos.js",
  "controllers/service.controller.js",
  "controllers/service-plan.controller.js",
  "controllers/service-pricing.controller.js",
  "services/service.service.js",
  "services/service-plan.service.js",
  "services/service-pricing.service.js",
  "services/service-snapshot.service.js",
  "routes/admin.services.routes.js",
  "routes/client.services.routes.js",
  "middleware/validation.middleware.js",
];

let allExist = true;
let filesChecked = 0;

console.log(`Checking files in: ${basePath}\n`);

requiredFiles.forEach((file) => {
  const filePath = path.join(basePath, file);
  const exists = fs.existsSync(filePath);
  const status = exists ? "✅" : "❌";

  console.log(`${status} ${file}`);

  if (exists) {
    filesChecked++;
    const stats = fs.statSync(filePath);
    console.log(`   Size: ${stats.size} bytes`);
  } else {
    allExist = false;
    console.log(`   MISSING!`);
  }
});

console.log("\n" + "═".repeat(60));

if (allExist) {
  console.log("\n✅ All required files exist!\n");

  // Now try to load them
  console.log("Attempting to load modules...\n");

  try {
    const servicesModule = require("./src/modules/services");
    console.log("✅ Services module loaded successfully");

    if (servicesModule.adminRoutes) {
      console.log("✅ adminRoutes exported");
    } else {
      console.log("❌ adminRoutes NOT exported");
    }

    if (servicesModule.clientRoutes) {
      console.log("✅ clientRoutes exported");
    } else {
      console.log("❌ clientRoutes NOT exported");
    }

    console.log("\n📋 Module exports:");
    console.log(Object.keys(servicesModule));

  } catch (err) {
    console.log(`❌ Error loading module: ${err.message}`);
    console.log("\nStack trace:");
    console.log(err.stack);
  }
} else {
  console.log("\n❌ Some files are missing!\n");
  console.log("Create the missing files or check your file structure.\n");

  console.log("Expected structure:");
  console.log(`
src/modules/services/
├── index.js
├── dtos.js
├── controllers/
│   ├── service.controller.js
│   ├── service-plan.controller.js
│   └── service-pricing.controller.js
├── services/
│   ├── service.service.js
│   ├── service-plan.service.js
│   ├── service-pricing.service.js
│   └── service-snapshot.service.js
├── routes/
│   ├── admin.services.routes.js
│   └── client.services.routes.js
├── middleware/
│   └── validation.middleware.js
└── policies/
    └── service-policy.service.js
  `);
}

console.log("\n");