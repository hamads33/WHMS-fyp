// ======================================================
// AUTOMATION MODULE — FULL API CLIENT (Profiles + Tasks)
// ======================================================

// --------------------------------------
// Shared response handler
// --------------------------------------
async function handleResponse(res: Response) {
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// --------------------------------------
// TYPES
// --------------------------------------
export interface Profile {
  id: number;
  name: string;
  timezone: string;
  enabled: boolean;
}

export interface Task {
  id: number;
  profileId: number;
  cron: string;
  actionType: string;
  actionMeta: any;
  enabled: boolean;
}

// ======================================================
// PROFILES API
// ======================================================

// GET /profiles
export async function listProfiles(): Promise<{ data: Profile[] }> {
  return handleResponse(
    await fetch("http://localhost:4000/api/automation/profiles")
  );
}

// POST /profiles
export async function createProfile(body: { name: string; timezone: string }) {
  return handleResponse(
    await fetch("http://localhost:4000/api/automation/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );
}

// PUT /profiles/:id
export async function updateProfile(
  id: number,
  body: { name: string; timezone: string }
) {
  return handleResponse(
    await fetch(`http://localhost:4000/api/automation/profiles/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );
}

// DELETE /profiles/:id
export async function deleteProfile(id: number) {
  return handleResponse(
    await fetch(`http://localhost:4000/api/automation/profiles/${id}`, {
      method: "DELETE",
    })
  );
}

// POST /profiles/:id/enable
export async function enableProfile(id: number) {
  return handleResponse(
    await fetch(`http://localhost:4000/api/automation/profiles/${id}/enable`, {
      method: "POST",
    })
  );
}

// POST /profiles/:id/disable
export async function disableProfile(id: number) {
  return handleResponse(
    await fetch(`http://localhost:4000/api/automation/profiles/${id}/disable`, {
      method: "POST",
    })
  );
}

// ======================================================
// TASKS API
// ======================================================

// GET /profiles/:profileId/tasks
export async function listTasks(
  profileId: number
): Promise<{ data: Task[] }> {
  return handleResponse(
    await fetch(
      `http://localhost:4000/api/automation/profiles/${profileId}/tasks`
    )
  );
}

// GET /tasks/:taskId
export async function getTask(taskId: number): Promise<{ data: Task }> {
  return handleResponse(
    await fetch(`http://localhost:4000/api/automation/tasks/${taskId}`)
  );
}

// POST /profiles/:profileId/tasks
export async function createTask(
  profileId: number,
  body: { cron: string; actionType: string; actionMeta: any }
) {
  return handleResponse(
    await fetch(
      `http://localhost:4000/api/automation/profiles/${profileId}/tasks`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    )
  );
}

// PUT /tasks/:taskId
export async function updateTask(
  taskId: number,
  body: { cron: string; actionType: string; actionMeta: any }
) {
  return handleResponse(
    await fetch(`http://localhost:4000/api/automation/tasks/${taskId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );
}

// DELETE /tasks/:taskId
export async function deleteTask(taskId: number) {
  return handleResponse(
    await fetch(`http://localhost:4000/api/automation/tasks/${taskId}`, {
      method: "DELETE",
    })
  );
}

// POST /tasks/:taskId/run
export async function runTask(taskId: number) {
  return handleResponse(
    await fetch(`http://localhost:4000/api/automation/tasks/${taskId}/run`, {
      method: "POST",
    })
  );
}

// POST /run/:profileId
export async function runProfile(profileId: number) {
  return handleResponse(
    await fetch(`http://localhost:4000/api/automation/run/${profileId}`, {
      method: "POST",
    })
  );
}
