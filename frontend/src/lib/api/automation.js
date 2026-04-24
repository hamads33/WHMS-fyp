import { apiFetch } from "@/lib/api/client";

const BASE = "/automation";

/**
 * AutomationAPI - Fixed version with correct method signatures
 * 
 * FIXES APPLIED:
 * ✅ deleteTask(profileId, taskId) - requires profileId parameter
 * ✅ updateTask(profileId, taskId, payload) - requires profileId parameter
 * ✅ All other methods aligned with backend API
 */

export const AutomationAPI = {
  /* =====================================================
     PROFILES
  ===================================================== */

  // GET /api/automation/profiles
  listProfiles() {
    return apiFetch(`${BASE}/profiles`);
  },

  // POST /api/automation/profiles
  createProfile(payload) {
    return apiFetch(`${BASE}/profiles`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // GET /api/automation/profiles/:profileId
  getProfile(profileId) {
    return apiFetch(`${BASE}/profiles/${profileId}`);
  },

  // PUT /api/automation/profiles/:profileId
  updateProfile(profileId, payload) {
    return apiFetch(`${BASE}/profiles/${profileId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  // DELETE /api/automation/profiles/:profileId
  deleteProfile(profileId) {
    return apiFetch(`${BASE}/profiles/${profileId}`, {
      method: "DELETE",
    });
  },

  // POST /api/automation/profiles/:profileId/enable
  enableProfile(profileId) {
    return apiFetch(`${BASE}/profiles/${profileId}/enable`, {
      method: "POST",
    });
  },

  // POST /api/automation/profiles/:profileId/disable
  disableProfile(profileId) {
    return apiFetch(`${BASE}/profiles/${profileId}/disable`, {
      method: "POST",
    });
  },

  // POST /api/automation/profiles/:profileId/run
  runProfile(profileId) {
    if (!profileId) throw new Error("profileId is required");
    return apiFetch(`${BASE}/profiles/${Number(profileId)}/run`, { method: "POST" });
  },

  // GET /api/automation/profiles/:profileId/runs
  listProfileRuns(profileId, params = {}) {
    if (!profileId) throw new Error("profileId is required");
    const q = new URLSearchParams(params).toString();
    return apiFetch(`${BASE}/profiles/${profileId}/runs${q ? `?${q}` : ""}`);
  },
  /* =====================================================
     TASKS (FIXED SIGNATURES)
  ===================================================== */

  // GET /api/automation/profiles/:profileId/tasks
  listTasks(profileId) {
    if (!profileId) {
      throw new Error("profileId is required");
    }
    return apiFetch(`${BASE}/profiles/${profileId}/tasks`);
  },

  // POST /api/automation/profiles/:profileId/tasks
  createTask(profileId, payload) {
    if (!profileId) {
      throw new Error("profileId is required");
    }
    return apiFetch(`${BASE}/profiles/${profileId}/tasks`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // GET /api/automation/profiles/:profileId/tasks/:taskId
  getTask(profileId, taskId) {
    if (!profileId || !taskId) {
      throw new Error("profileId and taskId are required");
    }
    return apiFetch(`${BASE}/profiles/${profileId}/tasks/${taskId}`);
  },

  // PUT /api/automation/profiles/:profileId/tasks/:taskId
  // ✅ FIXED: Now requires profileId parameter
  updateTask(profileId, taskId, payload) {
    if (!profileId || !taskId) {
      throw new Error("profileId and taskId are required");
    }
    return apiFetch(`${BASE}/profiles/${profileId}/tasks/${taskId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  // DELETE /api/automation/profiles/:profileId/tasks/:taskId
  // ✅ FIXED: Now requires profileId parameter
  deleteTask(profileId, taskId) {
    if (!profileId || !taskId) {
      throw new Error("profileId and taskId are required");
    }
    return apiFetch(`${BASE}/profiles/${profileId}/tasks/${taskId}`, {
      method: "DELETE",
    });
  },

  // POST /api/automation/tasks/:taskId/run
  runTask(taskId) {
    if (!taskId) {
      throw new Error("taskId is required");
    }
    return apiFetch(`${BASE}/tasks/${taskId}/run`, {
      method: "POST",
    });
  },

  /* =====================================================
     EXECUTION (RUNS)
  ===================================================== */

  // GET /api/automation/runs/:runId
  getRun(runId) {
    if (!runId) {
      throw new Error("runId is required");
    }
    return apiFetch(`${BASE}/runs/${runId}`);
  },

  /* =====================================================
     AUDIT LOGS (READ-ONLY)
  ===================================================== */

  /**
   * GET /api/automation/audit/logs
   * Optional query params:
   *  - source=automation|system
   *  - action=task.failed
   *  - limit=50
   *  - offset=0
   */
  listAuditLogs(params = {}) {
    const q = new URLSearchParams(params).toString();
    return apiFetch(`${BASE}/audit/logs${q ? `?${q}` : ""}`);
  },

  /**
   * GET /api/automation/audit/logs/count
   * Optional query params:
   *  - source
   *  - action
   */
  getAuditLogsCount(params = {}) {
    const q = new URLSearchParams(params).toString();
    return apiFetch(`${BASE}/audit/logs/count${q ? `?${q}` : ""}`);
  },

  /**
   * GET /api/automation/audit/profiles/:profileId/logs
   * Optional query params:
   *  - limit=50
   *  - offset=0
   */
  listProfileAuditLogs(profileId, params = {}) {
    if (!profileId) {
      throw new Error("profileId is required");
    }

    const q = new URLSearchParams(params).toString();
    return apiFetch(
      `${BASE}/audit/profiles/${profileId}/logs${q ? `?${q}` : ""}`
    );
  },

  /**
   * GET /api/automation/audit/profiles/:profileId/logs/count
   */
  getProfileAuditLogsCount(profileId) {
    if (!profileId) {
      throw new Error("profileId is required");
    }

    return apiFetch(`${BASE}/audit/profiles/${profileId}/logs/count`);
  },

  /* =====================================================
     ACTIONS (Built-in + Plugin)
  ===================================================== */

  // GET /api/automation/actions
  listActions() {
    return apiFetch(`${BASE}/actions`);
  },

  // GET /api/automation/actions/:actionType
  getAction(actionType) {
    if (!actionType) {
      throw new Error("actionType is required");
    }
    return apiFetch(`${BASE}/actions/${actionType}`);
  },

  /* =====================================================
     TEMPLATES (Preset Automations)
  ===================================================== */

  // GET /api/automation/templates
  listTemplates() {
    return apiFetch(`${BASE}/templates`);
  },

  // GET /api/automation/templates/:templateId
  getTemplate(templateId) {
    if (!templateId) {
      throw new Error("templateId is required");
    }
    return apiFetch(`${BASE}/templates/${templateId}`);
  },

  // POST /api/automation/templates/:templateId/install
  installTemplate(templateId) {
    if (!templateId) {
      throw new Error("templateId is required");
    }
    return apiFetch(`${BASE}/templates/${templateId}/install`, {
      method: "POST",
    });
  },

  listProfileTemplates() {
    return apiFetch(`${BASE}/profile-templates`);
  },

  getProfileTemplate(templateId) {
    if (!templateId) {
      throw new Error("templateId is required");
    }
    return apiFetch(`${BASE}/profile-templates/${templateId}`);
  },

  installProfileTemplate(templateId) {
    if (!templateId) {
      throw new Error("templateId is required");
    }
    return apiFetch(`${BASE}/profile-templates/${templateId}/install`, {
      method: "POST",
    });
  },

  /* =====================================================
     WORKFLOWS (Event-Driven)
  ===================================================== */

  // GET /api/automation/workflows
  listWorkflows() {
    return apiFetch(`${BASE}/workflows`);
  },

  // GET /api/automation/workflows/:workflowId/history
  listWorkflowRuns(workflowId, params = {}) {
    if (!workflowId) {
      throw new Error("workflowId is required");
    }
    const q = new URLSearchParams(params).toString();
    return apiFetch(`${BASE}/workflows/${workflowId}/history${q ? `?${q}` : ""}`);
  },

  // GET /api/automation/workflows/:workflowId
  getWorkflow(workflowId) {
    if (!workflowId) {
      throw new Error("workflowId is required");
    }
    return apiFetch(`${BASE}/workflows/${workflowId}`);
  },

  // POST /api/automation/workflows/:workflowId/run
  runWorkflow(workflowId) {
    if (!workflowId) {
      throw new Error("workflowId is required");
    }
    return apiFetch(`${BASE}/workflows/${workflowId}/run`, {
      method: "POST",
    });
  },
};
