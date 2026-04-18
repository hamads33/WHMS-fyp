const serverService = require("../services/server.service");
const monitorService = require("../services/server-monitor.service");
const quotaService = require("../services/account-quota.service");
const prisma = require("../../../../prisma");

function _formatUptime(seconds) {
  if (!seconds || seconds <= 0) return "0d 0h";
  const days  = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  return `${days}d ${hours}h`;
}

exports.list = async (req, res) => {
  try {
    const { groupId, status, type } = req.query;
    const servers = await serverService.listServers({ groupId, status, type });
    res.json({ data: servers, total: servers.length });
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: e.message });
  }
};

exports.getOne = async (req, res) => {
  try {
    const server = await serverService.getServer(req.params.id);
    res.json(server);
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: e.message });
  }
};

exports.create = async (req, res) => {
  try {
    const server = await serverService.createServer(req.body);
    res.status(201).json(server);
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: e.message });
  }
};

exports.update = async (req, res) => {
  try {
    const server = await serverService.updateServer(req.params.id, req.body);
    res.json(server);
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: e.message });
  }
};

exports.remove = async (req, res) => {
  try {
    await serverService.deleteServer(req.params.id);
    res.status(204).send();
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: e.message });
  }
};

exports.testConnection = async (req, res) => {
  try {
    const result = await serverService.testConnection(req.params.id);
    res.json(result);
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: e.message });
  }
};

exports.getMetrics = async (req, res) => {
  try {
    const metrics = await serverService.getMetrics(req.params.id);
    res.json(metrics);
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: e.message });
  }
};

exports.setMaintenance = async (req, res) => {
  try {
    const server = await serverService.setMaintenanceMode(
      req.params.id,
      req.body.enabled
    );
    res.json(server);
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: e.message });
  }
};

exports.getCapabilities = async (req, res) => {
  try {
    const result = await serverService.getCapabilities(req.params.id);
    res.json(result);
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: e.message });
  }
};

exports.getMetricsHistory = async (req, res) => {
  try {
    const { range } = req.query;
    const history = await monitorService.getMetricsHistory(req.params.id, range);
    res.json({ data: history, total: history.length, range: range || "24h" });
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: e.message });
  }
};

exports.getAccountUsage = async (req, res) => {
  try {
    const usage = await quotaService.getUsage(req.params.accountId);
    res.json(usage);
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: e.message });
  }
};

exports.updateAccountQuotas = async (req, res) => {
  try {
    const account = await quotaService.updateQuotas(req.params.accountId, req.body);
    res.json(account);
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: e.message });
  }
};

// GET /servers/dashboard — servers enriched with latest metrics + sparkline history
exports.getDashboard = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const skip  = Math.max(parseInt(req.query.skip)  || 0, 0);
    const sparkPoints = Math.min(parseInt(req.query.points) || 12, 24);

    const [servers, totalCount] = await Promise.all([
      prisma.server.findMany({
        include: {
          group: true,
          _count: { select: { accounts: true } },
          metricsHistory: {
            orderBy: { recordedAt: "desc" },
            take: sparkPoints,
            select: { cpuUsage: true, ramUsage: true, diskUsage: true, latency: true, uptime: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip,
      }),
      prisma.server.count(),
    ]);

    const enriched = servers.map((server) => {
      const history = [...server.metricsHistory].reverse(); // chronological
      const latest  = history[history.length - 1];
      return {
        id:           server.id,
        name:         server.name,
        hostname:     server.hostname,
        ipAddress:    server.ipAddress,
        type:         server.type,
        status:       server.status,
        tags:         server.tags,
        isDefault:    server.isDefault,
        groupId:      server.groupId,
        capabilities: server.capabilities,
        createdAt:    server.createdAt,
        group:        server.group,
        accountCount: server._count.accounts,
        cpu:          latest?.cpuUsage  ?? 0,
        ram:          latest?.ramUsage  ?? 0,
        disk:         latest?.diskUsage ?? 0,
        latency:      latest?.latency   ?? 0,
        uptime:       _formatUptime(latest?.uptime ?? 0),
        cpuHistory:     history.map((m) => m.cpuUsage),
        ramHistory:     history.map((m) => m.ramUsage),
        diskHistory:    history.map((m) => m.diskUsage),
        latencyHistory: history.map((m) => m.latency),
      };
    });

    const online      = enriched.filter((s) => s.status === "active").length;
    const offline     = enriched.filter((s) => s.status === "offline").length;
    const maintenance = enriched.filter((s) => s.status === "maintenance").length;
    const total       = enriched.length;
    const avgCpu  = total ? Math.round(enriched.reduce((a, s) => a + s.cpu,  0) / total) : 0;
    const avgRam  = total ? Math.round(enriched.reduce((a, s) => a + s.ram,  0) / total) : 0;
    const avgDisk = total ? Math.round(enriched.reduce((a, s) => a + s.disk, 0) / total) : 0;

    res.json({
      data:  enriched,
      stats: { total, online, offline, maintenance, avgCpu, avgRam, avgDisk },
      pagination: { total: totalCount, limit, skip },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// GET /servers/accounts — all managed accounts across all servers
exports.getAllAccounts = async (req, res) => {
  try {
    const { serverId, status } = req.query;
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);
    const skip  = Math.max(parseInt(req.query.skip)  || 0, 0);

    const where = {
      ...(serverId && { serverId }),
      ...(status   && { status }),
    };

    const [accounts, total] = await Promise.all([
      prisma.serverManagedAccount.findMany({
        where,
        include: { server: { select: { id: true, name: true, hostname: true } } },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip,
      }),
      prisma.serverManagedAccount.count({ where }),
    ]);

    res.json({ data: accounts, total, pagination: { limit, skip } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
