const {
  CyberPanelProvider,
} = require("../providers/cyberpanel/cyberpanel.provider");

function createPrismaMock() {
  return {
    website: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: "website-1" }),
      update: jest.fn().mockResolvedValue({ id: "website-1" }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    hostingDomain: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: "domain-1" }),
      update: jest.fn().mockResolvedValue({ id: "domain-1" }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    hostingDatabase: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: "db-1" }),
    },
    serverManagedAccount: {
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({}),
    },
  };
}

function createProvider(overrides = {}) {
  const prisma = createPrismaMock();
  return {
    prisma,
    provider: new CyberPanelProvider({
      provisioningModule: {
        execute: jest.fn().mockResolvedValue({ stdout: "successfully created", code: 0 }),
      },
      prismaClient: prisma,
      serverLogRepo: {
        create: jest.fn().mockResolvedValue({}),
      },
      auditLogger: {
        log: jest.fn().mockResolvedValue({}),
      },
      logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      },
      ...overrides,
    }),
  };
}

describe("CyberPanelProvider", () => {
  test("createSite maps to CyberPanel createWebsite command and persists state", async () => {
    const { provider, prisma } = createProvider();

    const result = await provider.createSite({
      serverId: "server-1",
      domain: "example.com",
      email: "ops@example.com",
      userId: "user-1",
      hostingAccountId: "acct-1",
      phpVersion: "8.2",
    });

    expect(result.success).toBe(true);
    expect(provider.provisioningModule.execute).toHaveBeenCalledWith(
      "server-1",
      expect.stringContaining("cyberpanel createWebsite")
    );
    expect(prisma.website.create).toHaveBeenCalled();
    expect(prisma.hostingDomain.create).toHaveBeenCalled();
  });

  test("deployApp builds node deployment commands through execute()", async () => {
    const { provider } = createProvider();

    const result = await provider.deployApp({
      serverId: "server-1",
      domain: "example.com",
      type: "node",
      repositoryUrl: "https://github.com/acme/app.git",
      branch: "main",
      startCommand: "node server.js",
      env: {
        NODE_ENV: "production",
      },
    });

    expect(result.status).toBe("deployed");
    expect(provider.provisioningModule.execute).toHaveBeenCalledWith(
      "server-1",
      expect.stringContaining("pm2 start")
    );
  });

  test("syncCyberPanelState reports drift", async () => {
    const prisma = createPrismaMock();
    prisma.website.findMany.mockResolvedValue([{ id: "w-1", domain: "missing.com" }]);
    prisma.serverManagedAccount.findMany.mockResolvedValue([{ id: "a-1", domain: "missing.com" }]);

    const provider = new CyberPanelProvider({
      provisioningModule: {
        execute: jest.fn().mockResolvedValue({
          stdout: JSON.stringify([{ domain: "present.com" }]),
          code: 0,
        }),
      },
      prismaClient: prisma,
      serverLogRepo: {
        create: jest.fn().mockResolvedValue({}),
      },
      auditLogger: {
        log: jest.fn().mockResolvedValue({}),
      },
      logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      },
    });

    const report = await provider.syncCyberPanelState("server-1");

    expect(report.driftDetected).toBe(true);
    expect(report.missingOnServer).toEqual(["missing.com"]);
    expect(report.missingInWhms).toEqual(["present.com"]);
  });
});
