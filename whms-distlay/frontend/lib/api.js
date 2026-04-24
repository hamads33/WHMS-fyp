class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl || process.env.NEXT_PUBLIC_API_URL;
  }

  getToken() {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token');
  }

  setToken(token) {
    if (typeof window === 'undefined') return;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  async request(method, path, body = null, options = {}) {
    const url = `${this.baseUrl}${path}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const token = this.getToken();
    if (token && !options.useAgentToken) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (options.agentToken) {
      headers['x-agent-token'] = options.agentToken;
    }

    const config = {
      method,
      headers,
    };

    if (body) {
      config.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, config);

      // Handle 401 - clear token and redirect to login
      if (response.status === 401) {
        this.setToken(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_role');
          window.location.href = '/login';
        }
        throw new Error('Unauthorized');
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`[ApiClient] Error: ${method} ${path}`, error);
      throw error;
    }
  }

  get(path, options) {
    return this.request('GET', path, null, options);
  }

  post(path, body, options) {
    return this.request('POST', path, body, options);
  }

  patch(path, body, options) {
    return this.request('PATCH', path, body, options);
  }

  delete(path, body, options) {
    return this.request('DELETE', path, body, options);
  }
}

export const apiClient = new ApiClient();
