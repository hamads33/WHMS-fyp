import { apiFetch } from "@/lib/api/client";

const BASE = "/api/automation";

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

  /* =====================================================
     TASKS
  ===================================================== */

  // GET /api/automation/profiles/:profileId/tasks
  listTasks(profileId) {
    return apiFetch(`${BASE}/profiles/${profileId}/tasks`);
  },

  // POST /api/automation/profiles/:profileId/tasks
  createTask(profileId, payload) {
    return apiFetch(`${BASE}/profiles/${profileId}/tasks`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // PUT /api/automation/tasks/:taskId
  updateTask(taskId, payload) {
    return apiFetch(`${BASE}/tasks/${taskId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  // DELETE /api/automation/tasks/:taskId
  deleteTask(taskId) {
    return apiFetch(`${BASE}/tasks/${taskId}`, {
      method: "DELETE",
    });
  },

  // POST /api/automation/tasks/:taskId/run
  runTask(taskId) {
    return apiFetch(`${BASE}/tasks/${taskId}/run`, {
      method: "POST",
    });
  },

  /* =====================================================
     EXECUTION (RUNS)
  ===================================================== */

  // POST /api/automation/run/:profileId
  runProfile(profileId) {
    return apiFetch(`${BASE}/run/${profileId}`, {
      method: "POST",
    });
  },

  // GET /api/automation/runs?profileId=
  listRuns(profileId) {
    const q = profileId ? `?profileId=${profileId}` : "";
    return apiFetch(`${BASE}/runs${q}`);
  },

  // GET /api/automation/runs/:runId
  getRun(runId) {
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
  return apiFetch(
    `/api/automation/audit/logs${q ? `?${q}` : ""}`
  );
},

/**
 * GET /api/automation/audit/logs/count
 * Optional query params:
 *  - source
 *  - action
 */
getAuditLogsCount(params = {}) {
  const q = new URLSearchParams(params).toString();
  return apiFetch(
    `/api/automation/audit/logs/count${q ? `?${q}` : ""}`
  );
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
    `/api/automation/audit/profiles/${profileId}/logs${q ? `?${q}` : ""}`
  );
},

/**
 * GET /api/automation/audit/profiles/:profileId/logs/count
 */
getProfileAuditLogsCount(profileId) {
  if (!profileId) {
    throw new Error("profileId is required");
  }

  return apiFetch(
    `/api/automation/audit/profiles/${profileId}/logs/count`
  );
},

  /* =====================================================
     ACTIONS (Built-in + Plugin)
  ===================================================== */

  // GET /api/automation/actions
  listActions() {
    return apiFetch(`${BASE}/actions`);
  },
};
