const DEFAULT_API_URL = 'http://localhost:8787/api/v1';
const API_URL = import.meta.env.VITE_API_URL || DEFAULT_API_URL;

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

export async function apiFetch<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const url = `${API_URL}${endpoint}`;
  const headers = new Headers(options.headers || {});
  
  if (!options.skipAuth) {
    const token = localStorage.getItem('accessToken');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401 && !options.skipAuth) {
    // Try to refresh token
    const refreshed = await attemptTokenRefresh();
    if (refreshed) {
      // Retry request with new token
      const newToken = localStorage.getItem('accessToken');
      headers.set('Authorization', `Bearer ${newToken}`);
      const retryResponse = await fetch(url, {
        ...options,
        headers,
      });
      return handleResponse<T>(retryResponse);
    } else {
      // Logout and redirect if needed
      logoutUser();
      throw new Error('Sessão expirada. Faça login novamente.');
    }
  }

  return handleResponse<T>(response);
}

async function handleResponse<T>(response: Response): Promise<T> {
  let data: any;
  const text = await response.text();
  try {
    data = text ? JSON.parse(text) : {};
  } catch (err) {
    data = { message: text || 'Erro de comunicação com o servidor' };
  }

  if (!response.ok) {
    const errorMsg = data.error?.message || data.message || `Erro ${response.status}: ${response.statusText}`;
    throw new Error(errorMsg);
  }

  return data;
}

async function attemptTokenRefresh(): Promise<boolean> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) return false;

    const data = await res.json();
    if (data.data && data.data.accessToken) {
      localStorage.setItem('accessToken', data.data.accessToken);
      if (data.data.refreshToken) {
        localStorage.setItem('refreshToken', data.data.refreshToken);
      }
      return true;
    }
    return false;
  } catch (err) {
    return false;
  }
}

export function logoutUser() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  window.dispatchEvent(new Event('auth-change'));
}
