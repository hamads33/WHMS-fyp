/**
 * Automation Profile Templates Controller
 * ------------------------------------------------------------------
 * Provides installable cron profile templates for real system jobs.
 */

const PROFILE_TEMPLATES = [
  {
    id: "nightly-domain-sync",
    name: "Nightly Domain Registrar Sync",
    description: "Syncs registrar expiry/status changes into WHMS every night and emits domain change events for downstream workflows.",
    category: "domains",
    icon: "Globe",
    color: "blue",
    cron: "30 1 * * *",
    tasks: [
      {
        actionType: "domain.sync_all",
        order: 1,
        actionMeta: {
          source: "cron.domain_sync",
        },
      },
    ],
  },
  {
    id: "quarter-hour-server-health",
    name: "Quarter-Hour Server Health Sweep",
    description: "Runs the infrastructure health sweep every 15 minutes so server status and alert workflows stay current.",
    category: "infrastructure",
    icon: "Server",
    color: "orange",
    cron: "*/15 * * * *",
    tasks: [
      {
        actionType: "server.run_health_check",
        order: 1,
        actionMeta: {},
      },
    ],
  },
  {
    id: "daily-backup-retention",
    name: "Daily Backup Retention Sweep",
    description: "Queues a retention cleanup job each morning to remove expired backups and free storage.",
    category: "backup",
    icon: "HardDrive",
    color: "green",
    cron: "15 4 * * *",
    tasks: [
      {
        actionType: "backup.run_retention",
        order: 1,
        actionMeta: {
          reason: "daily retention sweep",
        },
      },
    ],
  },
];

class ProfileTemplatesController {
  constructor({ prisma, logger, scheduler }) {
    this.prisma = prisma;
    this.logger = logger;
    this.scheduler = scheduler;
  }

  list(req, res) {
    return res.success(
      PROFILE_TEMPLATES.map(({ tasks, ...template }) => ({
        ...template,
        taskCount: tasks.length,
      }))
    );
  }

  get(req, res) {
    const template = PROFILE_TEMPLATES.find((item) => item.id === req.params.templateId);
    if (!template) {
      return res.fail("Template not found", 404, "template_not_found");
    }
    return res.success(template);
  }

  async install(req, res) {
    try {
      const template = PROFILE_TEMPLATES.find((item) => item.id === req.params.templateId);
      if (!template) {
        return res.fail("Template not found", 404, "template_not_found");
      }

      const existing = await this.prisma.automationProfile.findFirst({
        where: { name: template.name },
      });

      if (existing) {
        return res.fail(
          `Automation profile "${template.name}" already exists`,
          409,
          "profile_already_exists",
          { existingProfileId: existing.id }
        );
      }

      const profile = await this.prisma.automationProfile.create({
        data: {
          name: template.name,
          description: template.description,
          cron: template.cron,
          enabled: true,
          tasks: {
            create: template.tasks.map((task) => ({
              actionType: task.actionType,
              order: task.order,
              actionMeta: task.actionMeta || {},
            })),
          },
        },
        include: {
          tasks: {
            orderBy: { order: "asc" },
          },
        },
      });

      if (this.scheduler) {
        this.scheduler.scheduleProfile(profile);
      }

      this.logger?.info?.("Installed automation profile template", {
        templateId: template.id,
        profileId: profile.id,
      });

      return res.success({ profile }, "Installed", 201);
    } catch (err) {
      this.logger?.error?.("Profile template install error:", err);
      return res.error(err, 500);
    }
  }
}

module.exports = {
  ProfileTemplatesController,
  PROFILE_TEMPLATES,
};
