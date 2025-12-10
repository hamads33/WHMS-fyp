const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

// ==================== Types ====================

export interface Plugin {
  id: string
  name: string
  version?: string
  description?: string
  author?: string
  enabled?: boolean
  hasUI?: boolean
}

export interface PluginAction {
  id: string
  name: string
  description?: string
  schema?: Record<string, unknown>
}

export interface TestRunPayload {
  pluginId: string
  action: string
  meta?: Record<string, unknown>
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

// ==================== Plugins API ====================

export async function listPlugins(): Promise<ApiResponse<Plugin[]>> {
  return apiRequest<Plugin[]>("/api/plugins")
}

export async function getPlugin(pluginId: string): Promise<ApiResponse<Plugin>> {
  return apiRequest<Plugin>(`/api/plugins/${pluginId}`)
}

export async function listPluginActions(pluginId: string): Promise<ApiResponse<PluginAction[]>> {
  return apiRequest<PluginAction[]>(`/api/plugins/${pluginId}/actions`)
}

export async function installPlugin(file: File): Promise<ApiResponse<Plugin>> {
  const formData = new FormData()
  formData.append("file", file)

  try {
    const response = await fetch(`${API_BASE}/api/plugins/install`, {
      method: "POST",
      body: formData,
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

export async function testRunPlugin(
  payload: TestRunPayload,
): Promise<ApiResponse<{ message: string; result?: unknown }>> {
  return apiRequest<{ message: string; result?: unknown }>("/api/plugins/test-run", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export function getPluginUIFrameUrl(pluginId: string): string {
  return `${API_BASE}/plugins/ui/${pluginId}/frame`
}
