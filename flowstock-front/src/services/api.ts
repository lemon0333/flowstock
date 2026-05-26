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
      const detail =
        error.message ||
        error.errorMessage ||
        error.errorCode ||
        (typeof error === 'string' ? error : '');
      throw new Error(
        detail
          ? `${detail} (HTTP ${response.status})`
          : `요청 실패 (HTTP ${response.status})`
      );
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
  updateProfile: (body: { nickname: string; profileImageUrl?: string }) =>
    api.patch<ApiResponse<{ id: number; email: string; nickname: string; profileImageUrl?: string; isProfileCompleted: boolean }>>(
      '/members/me/profile/setup',
      body,
    ),
};

// Stock APIs
export const stockApi = {
  getAll: () => api.get<ApiResponse<any[]>>('/stocks'),
  getById: (id: string) => api.get<ApiResponse<any>>(`/stocks/${id}`),
  getOhlcv: (id: string, days = 180) =>
    api.get<ApiResponse<any[]>>(`/stocks/${id}/ohlcv?days=${days}`),
};

// News APIs
export interface GlobalNewsItem {
  id: string;
  title_en: string;
  title_ko: string;
  summary_en: string;
  summary_ko: string;
  link: string;
  source: string;
  published_at: string;
}
export const newsApi = {
  getLatest: (limit = 30) =>
    api.get<ApiResponse<any>>(`/news?limit=${limit}`),
  getGraph: (newsId: string) =>
    api.get<ApiResponse<any>>(`/news/${newsId}/graph`),
  getGlobal: (limit = 20) =>
    api.get<ApiResponse<GlobalNewsItem[]>>(`/news/global?limit=${limit}`),
  search: (keyword: string, from?: string, to?: string, limit = 10) => {
    const p = new URLSearchParams({ keyword, limit: String(limit) });
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    return api.get<ApiResponse<any[]>>(`/news/search?${p.toString()}`);
  },
};

// Market APIs
export const marketApi = {
  getIndices: () => api.get<ApiResponse<any[]>>('/market'),
};

// Economy APIs (경제 대시보드)
export const economyApi = {
  getDashboard: () => api.get<ApiResponse<any>>('/economy/dashboard'),
  getCorrelation: (market = 'KOSPI', top = 10, days = 60) =>
    api.get<ApiResponse<{ tickers: string[]; names: string[]; matrix: number[][] }>>(
      `/economy/correlation?market=${market}&top=${top}&days=${days}`,
    ),
};

// Review (거래 복기) APIs
export interface ReviewAnalyzeRequest {
  stockName: string;
  action: "buy" | "sell";
  price: number;
  quantity: number;
  total: number;
  at: string; // ISO
  memo?: string;
  avgBuyPrice?: number;
  returnPct?: number;
}
export interface ReviewAnalyzeResult {
  good: string;
  concern: string;
  lesson: string;
}
export const reviewApi = {
  analyze: (req: ReviewAnalyzeRequest) =>
    api.post<ApiResponse<ReviewAnalyzeResult>>("/review/analyze", req),
};

// Portfolio APIs
export const portfolioApi = {
  getHoldings: () => api.get<ApiResponse<any[]>>('/portfolio'),
  addHolding: (holding: any) => api.post<ApiResponse<any>>('/portfolio', holding),
  removeHolding: (stockId: string) => api.delete<ApiResponse<void>>(`/portfolio/${stockId}`),
  getSectors: () => api.get<ApiResponse<any[]>>('/portfolio/sectors'),
};

// Admin APIs (Member.role == ADMIN 사용자만)
export type UserRole = "USER" | "ADMIN";
export interface AdminCountStat {
  total: number;
  last24h: number;
}
export interface AdminStats {
  members: AdminCountStat;
  trades: AdminCountStat;
  articles: AdminCountStat;
  comments: AdminCountStat;
  publicTrades: number;
  totalRealizedPnl: number;
  generatedAt: string;
}
export interface MemberSummary {
  memberId: number;
  email: string;
  nickname: string;
  role: UserRole;
  provider: string | null;
  createdAt: string;
}
export const adminApi = {
  getStats: () => api.get<ApiResponse<AdminStats>>("/admin/stats"),
  listMembers: (page = 0, size = 30) =>
    api.get<ApiResponse<MemberSummary[]>>(`/admin/members?page=${page}&size=${size}`),
  grantRole: (memberId: number, role: UserRole) =>
    api.patch<ApiResponse<MemberSummary>>(`/admin/members/${memberId}/role`, { role }),
};

// Trade (공개 거래 + leaderboard) APIs
export type TradeAction = "BUY" | "SELL";
export interface TradeRecord {
  id: number;
  memberId: number;
  nickname: string;
  stockCode: string;
  stockName: string;
  action: TradeAction;
  price: number;
  quantity: number;
  realizedPnl: number | null;
  memo: string | null;
  isPublic: boolean;
  createdAt: string;
}
export interface LeaderboardEntry {
  rank: number;
  memberId: number;
  nickname: string;
  totalPnl: number;
  tradeCount: number;
}
export interface TradeCreateBody {
  stockCode: string;
  stockName: string;
  action: TradeAction;
  price: number;
  quantity: number;
  realizedPnl?: number | null;
  memo?: string;
  isPublic?: boolean;
}
export const tradeApi = {
  create: (body: TradeCreateBody) => api.post<ApiResponse<TradeRecord>>("/trades", body),
  listPublic: (page = 0, size = 20) =>
    api.get<ApiResponse<TradeRecord[]>>(`/trades/public?page=${page}&size=${size}`),
  listMine: (page = 0, size = 50) =>
    api.get<ApiResponse<TradeRecord[]>>(`/trades/me?page=${page}&size=${size}`),
  leaderboard: (limit = 20) =>
    api.get<ApiResponse<LeaderboardEntry[]>>(`/trades/leaderboard?limit=${limit}`),
};

// DART (재무제표/밸류에이션)
export interface FinancialStatement {
  year: number;
  revenue: number;
  operatingProfit: number;
  netIncome: number;
}
export interface ValuationItem {
  year: number;
  per: number | null;
  pbr: number | null;
}
export interface SegmentItem {
  name: string;
  revenue: number;
}
export interface FinancialResponse {
  ticker: string;
  source: 'dart' | 'mock';
  statements: FinancialStatement[];
  valuation: ValuationItem[];
  segments: SegmentItem[];
  sharesOutstanding?: number;
}
export interface EarningsEvent {
  ticker: string;
  name: string;
  date: string;
  type: '잠정실적' | '확정실적' | '예정';
  quarter: string;
}
export const dartApi = {
  getFinancials: (ticker: string) =>
    api.get<ApiResponse<FinancialResponse>>(`/dart/financials/${ticker}`),
  getEarningsCalendar: (year: number, quarter: number) =>
    api.get<ApiResponse<EarningsEvent[]>>(`/dart/earnings?year=${year}&quarter=${quarter}`),
};

// Sector (섹터 등락률)
export interface SectorRow {
  code: string;
  name: string;
  changeRate: number;
  count: number;
  topStocks?: Array<{ ticker: string; name: string; changeRate: number }>;
}
export const sectorApi = {
  getSectors: (market = 'KOSPI') =>
    api.get<ApiResponse<SectorRow[]>>(`/sectors?market=${market}`),
};

// Articles (커뮤니티)
export type ArticleCategory = 'GENERAL' | 'ANALYSIS' | 'NEWS' | 'QUESTION' | 'REVIEW';

export interface ArticleSummary {
  id: number;
  title: string;
  category: ArticleCategory;
  authorId: number;
  authorName: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  createdAt: string;
}

export interface CommentDto {
  id: number;
  authorId: number;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface ArticleDetail {
  id: number;
  title: string;
  content: string;
  category: ArticleCategory;
  authorId: number;
  authorName: string;
  viewCount: number;
  likeCount: number;
  likedByMe: boolean;
  createdAt: string;
  updatedAt: string;
  comments: CommentDto[];
}

export interface ArticleListResponse {
  content: ArticleSummary[];
  page: number;
  size: number;
  totalPages: number;
  totalElements: number;
}

export const articleApi = {
  list: (category?: ArticleCategory, page = 0, size = 20) => {
    const p = new URLSearchParams({ page: String(page), size: String(size) });
    if (category) p.set('category', category);
    return api.get<ApiResponse<ArticleListResponse>>(`/articles?${p.toString()}`);
  },
  get: (id: number) => api.get<ApiResponse<ArticleDetail>>(`/articles/${id}`),
  create: (body: { title: string; content: string; category: ArticleCategory }) =>
    api.post<ApiResponse<{ id: number }>>('/articles', body),
  update: (id: number, body: { title: string; content: string; category: ArticleCategory }) =>
    api.put<ApiResponse<ArticleDetail>>(`/articles/${id}`, body),
  remove: (id: number) => api.delete<ApiResponse<{ deleted: boolean }>>(`/articles/${id}`),
  addComment: (id: number, content: string) =>
    api.post<ApiResponse<CommentDto>>(`/articles/${id}/comments`, { content }),
  removeComment: (commentId: number) =>
    api.delete<ApiResponse<{ deleted: boolean }>>(`/articles/comments/${commentId}`),
  toggleLike: (id: number) => api.post<ApiResponse<{ liked: boolean }>>(`/articles/${id}/like`),
};

// Macro (ECOS 거시지표)
export interface MacroSeries {
  code: string;
  name: string;
  unit: string;
  series: Array<{ date: string; value: number }>;
}
export const macroApi = {
  getDashboard: () =>
    api.get<ApiResponse<{ source: 'ecos' | 'mock'; series: MacroSeries[] }>>(`/macro/dashboard`),
};

// Feedback (서비스 개선 제안)
export type FeedbackStatus = 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'REJECTED';
export interface FeedbackItem {
  id: number;
  title: string;
  content: string;
  status: FeedbackStatus;
  likeCount: number;
  likedByMe: boolean;
  authorMasked: string;
  isMine: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface FeedbackListResponse {
  content: FeedbackItem[];
  page: number;
  size: number;
  totalPages: number;
  totalElements: number;
}
export const feedbackApi = {
  list: (status?: FeedbackStatus, page = 0, size = 20) => {
    const p = new URLSearchParams({ page: String(page), size: String(size) });
    if (status) p.set('status', status);
    return api.get<ApiResponse<FeedbackListResponse>>(`/feedback?${p.toString()}`);
  },
  get: (id: number) => api.get<ApiResponse<FeedbackItem>>(`/feedback/${id}`),
  create: (body: { title: string; content: string }) =>
    api.post<ApiResponse<FeedbackItem>>('/feedback', body),
  update: (id: number, body: { title: string; content: string }) =>
    api.put<ApiResponse<FeedbackItem>>(`/feedback/${id}`, body),
  remove: (id: number) =>
    api.delete<ApiResponse<{ deleted: number }>>(`/feedback/${id}`),
  toggleLike: (id: number) =>
    api.post<ApiResponse<FeedbackItem>>(`/feedback/${id}/like`),
  updateStatus: (id: number, status: FeedbackStatus) =>
    api.patch<ApiResponse<FeedbackItem>>(`/feedback/${id}/status`, { status }),
};
