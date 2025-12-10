const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

// ==================== Types ====================

export interface AutomationProfile {
  id: string
  name: string
  description?: string
  cron: string
  enabled: boolean
  createdAt?: string
  updatedAt?: string
}

export interface AutomationTask {
  id: string
  profileId: string
  actionType: string
  actionMeta: Record<string, unknown>
  order: number
  createdAt?: string
  updatedAt?: string
}

export interface BuiltInAction {
  id: string
  name: string
  description?: string
  schema?: Record<string, unknown>
}

export interface CreateProfilePayload {
  name: string
  description?: string
  cron: string
}

export interface UpdateProfilePayload {
  name?: string
  description?: string
  cron?: string
}

export interface CreateTaskPayload {
  actionType: string
  actionMeta: Record<string, unknown>
  order?: number
}

export interface UpdateTaskPayload {
  actionType?: string
  actionMeta?: Record<string, unknown>
  order?: number
}

export interface ApiResponse<T> {
  data?: T
  error?: string
  success: boolean
}

// ==================== Helper ====================

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: errorData.message || errorData.error || `HTTP ${response.status}`,
      }
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    }
  }
}

// ==================== Profiles API ====================

export async function listProfiles(): Promise<ApiResponse<AutomationProfile[]>> {
  return apiRequest<AutomationProfile[]>("/api/automation/profiles")
}

export async function getProfile(id: string): Promise<ApiResponse<AutomationProfile>> {
  return apiRequest<AutomationProfile>(`/api/automation/profiles/${id}`)
}

export async function createProfile(payload: CreateProfilePayload): Promise<ApiResponse<AutomationProfile>> {
  return apiRequest<AutomationProfile>("/api/automation/profiles", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function updateProfile(
  id: string,
  payload: UpdateProfilePayload,
): Promise<ApiResponse<AutomationProfile>> {
  return apiRequest<AutomationProfile>(`/api/automation/profiles/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
}

export async function deleteProfile(id: string): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/api/automation/profiles/${id}`, {
    method: "DELETE",
  })
}

export async function enableProfile(id: string): Promise<ApiResponse<AutomationProfile>> {
  return apiRequest<AutomationProfile>(`/api/automation/profiles/${id}/enable`, {
    method: "POST",
  })
}

export async function disableProfile(id: string): Promise<ApiResponse<AutomationProfile>> {
  return apiRequest<AutomationProfile>(`/api/automation/profiles/${id}/disable`, {
    method: "POST",
  })
}

export async function runProfile(id: string): Promise<ApiResponse<{ message: string }>> {
  return apiRequest<{ message: string }>(`/api/automation/run/${id}`, {
    method: "POST",
  })
}

// ==================== Tasks API ====================

export async function listTasks(profileId: string): Promise<ApiResponse<AutomationTask[]>> {
  return apiRequest<AutomationTask[]>(`/api/automation/profiles/${profileId}/tasks`)
}

export async function getTask(taskId: string): Promise<ApiResponse<AutomationTask>> {
  return apiRequest<AutomationTask>(`/api/automation/tasks/${taskId}`)
}

export async function createTask(profileId: string, payload: CreateTaskPayload): Promise<ApiResponse<AutomationTask>> {
  return apiRequest<AutomationTask>(`/api/automation/profiles/${profileId}/tasks`, {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function updateTask(taskId: string, payload: UpdateTaskPayload): Promise<ApiResponse<AutomationTask>> {
  return apiRequest<AutomationTask>(`/api/automation/tasks/${taskId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
}

export async function deleteTask(taskId: string): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/api/automation/tasks/${taskId}`, {
    method: "DELETE",
  })
}

export async function runTask(taskId: string): Promise<ApiResponse<{ message: string; result?: unknown }>> {
  return apiRequest<{ message: string; result?: unknown }>(`/api/automation/tasks/${taskId}/run`, {
    method: "POST",
  })
}

// ==================== Actions API ====================

export async function listBuiltInActions(): Promise<ApiResponse<BuiltInAction[]>> {
  return apiRequest<BuiltInAction[]>("/api/automation/actions")
}
