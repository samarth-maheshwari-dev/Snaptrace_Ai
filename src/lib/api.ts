import type {
  AdminStats, Category, ClaimWithItem, Descriptor, Item, Match, MyClaim, PublicItem, SessionUser,
} from '../types';

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

/** Session is an httpOnly cookie; the custom header is our CSRF guard (server/security.ts csrfGuard). */
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set('Content-Type', 'application/json');
  headers.set('X-Requested-With', 'snaptrace');
  let res: Response;
  try {
    res = await fetch(path, { ...init, headers, credentials: 'same-origin' });
  } catch {
    throw new ApiError('Network error — is the server running?', 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) window.dispatchEvent(new Event('snaptrace:signed-out'));
    throw new ApiError(data.error ?? `Request failed (${res.status})`, res.status);
  }
  return data as T;
}

const json = (body: unknown) => JSON.stringify(body);

export interface ListFilters {
  type?: 'lost' | 'found';
  category?: Category;
  status?: 'open' | 'claimed' | 'resolved';
  q?: string;
  mine?: '1';
}

export interface UploadResult {
  imageId: string;
  descriptor: Descriptor | null;
  aiError: string | null;
}

export interface NewItemInput {
  type: 'lost' | 'found';
  title: string;
  category: Category;
  location: string;
  date_occurred: string;
  description?: string;
  image_id?: string;
}

export const api = {
  health: () => request<{ ok: boolean; ai: boolean; model: string | null; auth: boolean }>('/api/health'),

  auth: {
    me: () => request<{ user: SessionUser | null; googleClientId: string | null; devLogin: boolean }>('/api/auth/me'),
    google: (credential: string) => request<{ user: SessionUser }>('/api/auth/google', { method: 'POST', body: json({ credential }) }),
    dev: (email: string) => request<{ user: SessionUser }>('/api/auth/dev', { method: 'POST', body: json({ email }) }),
    logout: () => request<{ ok: true }>('/api/auth/logout', { method: 'POST' }),
  },
  myClaims: () => request<MyClaim[]>('/api/claims/mine'),

  listItems: (f: ListFilters = {}) => {
    const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v) as [string, string][]);
    return request<PublicItem[]>(`/api/items?${qs}`);
  },
  getItem: (id: string) => request<{ item: PublicItem; matches: Match[] }>(`/api/items/${encodeURIComponent(id)}`),
  uploadImage: (base64: string) => request<UploadResult>('/api/images', { method: 'POST', body: json({ base64 }) }),
  createItem: (input: NewItemInput) =>
    request<{ item: PublicItem; matches: Match[] }>('/api/items', { method: 'POST', body: json(input) }),
  search: (imageId: string) =>
    request<{ descriptor: Descriptor; matches: Match[] }>('/api/search', { method: 'POST', body: json({ image_id: imageId }) }),
  createClaim: (input: { item_id: string; student_id: string; phone?: string; proof_text: string }) => request<{ ok: true }>('/api/claims', { method: 'POST', body: json(input) }),

  admin: {
    stats: () => request<AdminStats>('/api/admin/stats', {}),
    items: () => request<Item[]>('/api/admin/items', {}),
    claims: () => request<ClaimWithItem[]>('/api/admin/claims', {}),
    setStatus: (id: string, status: Item['status']) =>
      request<{ ok: true }>(`/api/admin/items/${id}`, { method: 'PATCH', body: json({ status }) }),
    deleteItem: (id: string) => request<{ ok: true }>(`/api/admin/items/${id}`, { method: 'DELETE' }),
    decide: (claimId: string, decision: 'approve' | 'reject') =>
      request<{ ok: true }>(`/api/admin/claims/${claimId}/${decision}`, { method: 'POST' }),
  },
};
