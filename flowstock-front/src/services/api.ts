const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errorCode?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options?.headers,
      },
    });

    if (response.status === 401) {
      // 토큰을 갖고 있다가 만료 등으로 401이면 로그인 페이지로 이동
      // 비로그인 사용자가 보호된 API에 접근한 경우는 호출 측이 처리하도록 throw만
      const hadToken = !!localStorage.getItem('token');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (hadToken) {
        window.location.href = '/login';
      }
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'API request failed');
    }

    return response.json();
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'GET' });
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'DELETE' });
  }
}

export const api = new ApiClient(API_BASE_URL);

// Auth APIs
export const authApi = {
  oauthLogin: (provider: string, token: string) =>
    api.post<ApiResponse<{ accessToken: string; refreshToken: string; member: any }>>(`/members/oauth/${provider}`, { token }),
  naverCallback: (code: string, state: string) =>
    api.get<ApiResponse<{ accessToken: string; refreshToken: string; member: any }>>(`/members/oauth/naver/callback?code=${code}&state=${state}`),
  refreshToken: (refreshToken: string) =>
    api.post<ApiResponse<{ accessToken: string; refreshToken: string }>>('/members/token/refresh', { refreshToken }),
  getMe: () => api.get<ApiResponse<any>>('/members/me'),
  logout: () => api.post<ApiResponse<void>>('/members/logout'),
};

// Stock APIs
export const stockApi = {
  getAll: () => api.get<ApiResponse<any[]>>('/stocks'),
  getById: (id: string) => api.get<ApiResponse<any>>(`/stocks/${id}`),
  getOhlcv: (id: string, days = 180) =>
    api.get<ApiResponse<any[]>>(`/stocks/${id}/ohlcv?days=${days}`),
};

// News APIs
export const newsApi = {
  getLatest: (page = 0, size = 10) =>
    api.get<ApiResponse<any>>(`/news?page=${page}&size=${size}`),
  getGraph: (newsId: string) =>
    api.get<ApiResponse<any>>(`/news/${newsId}/graph`),
};

// Market APIs
export const marketApi = {
  getIndices: () => api.get<ApiResponse<any[]>>('/market'),
};

// Economy APIs (경제 대시보드)
export const economyApi = {
  getDashboard: () => api.get<ApiResponse<any>>('/economy/dashboard'),
};

// Portfolio APIs
export const portfolioApi = {
  getHoldings: () => api.get<ApiResponse<any[]>>('/portfolio'),
  addHolding: (holding: any) => api.post<ApiResponse<any>>('/portfolio', holding),
  removeHolding: (stockId: string) => api.delete<ApiResponse<void>>(`/portfolio/${stockId}`),
  getSectors: () => api.get<ApiResponse<any[]>>('/portfolio/sectors'),
};
