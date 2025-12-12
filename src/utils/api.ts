import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE || 'http://localhost:6666/zakoota-api';
const withCreds = (import.meta.env.VITE_WITH_CREDENTIALS || 'false') === 'true';

export const api = axios.create({
  baseURL,
  timeout: 30000,
  withCredentials: withCreds,
});

export function setAuthToken(token: string | null) {
  if (token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  else delete api.defaults.headers.common['Authorization'];
}

// ---- Auth helpers ----
export async function loginApi(username: string, password: string) {
  const { data } = await api.post('/auth/login', { username, password });
  return data as { token: string; user: { username: string; role?: string } };
}

// Auto-logout on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      // Clear local storage + auth header, then redirect to login
      try {
        localStorage.removeItem('mf_auth');
      } catch { }
      setAuthToken(null);
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);


export async function login(username: string, password: string) {
  const { data } = await api.post('/auth/login', { username, password });
  const user = data?.data?.user ?? data?.user ?? { username };
  const token = data?.data?.token ?? data?.token ?? null;
  return { ok: data?.ok ?? true, user, token, raw: data };
}

export async function getMe() {
  try {
    const { data } = await api.get('/auth/me');
    return data;
  } catch {
    return null;
  }
}

export async function getHealth() {
  const { data } = await api.get('/health');
  return data;
}

export async function listDevices() {
  const { data } = await api.get('/devices');
  return data?.data?.devices ?? data?.devices ?? data?.data ?? data ?? [];
}

// Returns: Array<{
//   _id, deviceId, name, username, designation, profileURL, createdAt,
//   clientStatus, lastSeen,
//   commandsSummary: { lastPending?, lastAck?, totals? },
//   activityToday?: { activeSeconds: number; idleSeconds: number } | null
// }>
export async function getDevicesOptimized(date?: string) {
  const params: any = {};
  if (date) {
    params.date = date; // "YYYY-MM-DD"
  }

  const { data } = await api.get("/devices/list-optimized", { params });
  return Array.isArray(data?.data) ? data.data : [];
}


export async function assignDevice(
  deviceId: string,
  body: {
    username?: string;
    userId?: string;
    name?: string;
    designation?: string;
    profileURL?: string;
    checkInTime?: string;
  }
) {
  const { data } = await api.patch(`/devices/${encodeURIComponent(deviceId)}`, body);
  return data;
}

export async function deleteAllDevices() {
  const { data } = await api.delete('/devices');
  return data;
}

export type LogsQuery = { deviceId: string; from?: string; to?: string; limit?: number; skip?: number };

export async function listLogs(q: LogsQuery) {
  const { data } = await api.get('/logs', { params: q });
  const chunks = data?.data?.chunks ?? data?.chunks ?? data?.data ?? data ?? [];
  const meta = data?.meta ?? {
    total: Array.isArray(chunks) ? chunks.length : 0,
    limit: q.limit ?? 50,
    skip: q.skip ?? 0,
  };
  return { chunks, meta };
}

export async function logsSummary(deviceId: string, from?: string, to?: string) {
  const { data } = await api.get('/logs/aggregate/summary', { params: { deviceId, from, to } });
  return data?.data?.summary ?? data?.summary ?? data?.data ?? data ?? {};
}

export async function logsApps(deviceId: string, from?: string, to?: string, top: number = 20) {
  const { data } = await api.get('/logs/aggregate/apps', { params: { deviceId, from, to, top } });
  const arr = data?.data?.apps ?? data?.apps ?? data?.data ?? data ?? [];
  return arr.map((r: { appName?: string; _id?: string; activeTime?: number; idleTime?: number }) => ({
    appName: r.appName ?? r._id ?? 'Unknown',
    activeTime: r.activeTime ?? 0,
    idleTime: r.idleTime ?? 0,
  }));
}

export async function logsTitles(deviceId: string, appName: string, from?: string, to?: string, top: number = 20) {
  const { data } = await api.get('/logs/aggregate/titles', { params: { deviceId, appName, from, to, top } });
  const arr = data?.data?.titles ?? data?.titles ?? data?.data ?? data ?? [];
  return arr.map((r: { title?: string; _id?: string; activeTime?: number; idleTime?: number }) => ({
    title: r.title ?? r._id ?? 'Unknown',
    activeTime: r.activeTime ?? 0,
    idleTime: r.idleTime ?? 0,
  }));
}

export async function logsMissing(deviceId: string, from?: string, to?: string) {
  const { data } = await api.get('/logs/missing', { params: { deviceId, from, to } });
  return data?.data?.have ?? data?.have ?? [];
}

export type ConfigPayload = {
  chunkTime?: number;
  idleThresholdPerChunk?: number;
  isZaiminaarEnabled?: boolean;
  clientHeartbeatDelay?: number;
  serviceHeartbeatDelay?: number;
  allowQuit?: boolean;
};

export async function getUserConfig(deviceId: string) {
  const { data } = await api.post('/config/user-config', { deviceId });
  return data?.data ?? data;
}

export async function updateConfig(body: ConfigPayload) {
  const { data } = await api.post('/config', body);
  return data?.data ?? data;
}

export async function createCommand(body: {
  deviceId: string;
  target: 'client' | 'service';
  type: string;
  payload?: any;
}) {
  const { data } = await api.post('/commands/create', body);
  return data?.data ?? data;
}

// broadcast to all devices
export async function broadcastCommand(body: {
  target: 'client' | 'service';
  type: string;
  payload?: any;
}) {
  const { data } = await api.post('/commands/broadcast', body);
  return data?.data ?? data;
}

export async function completeCommand(commandId: string) {
  const { data } = await api.patch(`/commands/${commandId}/complete`);
  return data?.data ?? data;
}

export async function acknowledgeCommand(commandId: string) {
  const { data } = await api.patch('/commands/acknowledge', { commandId });
  return data?.data ?? data;
}

export async function getPendingCommands(deviceId: string) {
  const { data } = await api.get(`/commands/pending/${deviceId}`);
  return data?.data ?? data;
}

export async function listErrors(params?: {
  deviceId?: string;
  errorType?: string;
  page?: number;
  limit?: number;
}) {
  const { data } = await api.get('/errors/list', { params });
  const items = data?.data ?? data?.items ?? [];
  const meta = data?.meta ?? { page: 1, total: Array.isArray(items) ? items.length : 0 };
  return { items: Array.isArray(items) ? items : [], meta };
}

// List commands with filters; no side-effects
export async function listCommands(params?: {
  deviceId?: string;
  status?: 'pending' | 'acknowledged' | 'completed';
  type?: 'restart_logger' | 'show_message' | 'restart_service';
  from?: string | number | Date;
  to?: string | number | Date;
  skip?: number;
  limit?: number;
  sort?: 'asc' | 'desc';
}) {
  const { data } = await api.get('/commands/list', { params });
  // Backend responds with { ok, data: [], meta } 
  const items = data?.data ?? [];
  const meta = data?.meta ?? {
    total: Array.isArray(items) ? items.length : 0,
    skip: Number(params?.skip ?? 0),
    limit: Number(params?.limit ?? 50),
  };
  return { items: Array.isArray(items) ? items : [], meta };
}

// utils/api.ts
export async function getCommandSummaries(deviceIds: string[]) {
  const { data } = await api.post('/commands/summary', { deviceIds });
  return data?.data?.map ?? {}; // returns { [deviceId]: { lastPending, lastAck, ... } }
}

import type {
  LogsListResponse,
  AppsListResponse,
  TitlesListResponse,
  LogsListItem,
  AppsListItem,
  TitlesListItem,
  ListMeta,
} from "./types";

// --- Add below your other API helpers ---

export async function getDeviceLogs(params: {
  deviceId: string;
  from?: string; // ISO
  to?: string;   // ISO
  skip?: number;
  limit?: number;
}): Promise<LogsListResponse> {
  if (!params?.deviceId) {
    return { items: [], meta: { total: 0, limit: Number(params?.limit ?? 50), skip: Number(params?.skip ?? 0) } };
  }

  const { data } = await api.get("/logs", {
    params: {
      deviceId: params.deviceId,
      from: params.from,
      to: params.to,
      skip: Number(params?.skip ?? 0),
      limit: Number(params?.limit ?? 50),
    },
  });

  // Accept both shapes:
  //  A) { ok, data: { chunks: [...] }, meta }
  //  B) { ok, data: [...] , meta }
  const rawChunks: any[] = Array.isArray(data?.data?.chunks)
    ? data.data.chunks
    : Array.isArray(data?.data)
      ? data.data
      : [];

  const items: LogsListItem[] = rawChunks.map((c: any) => {
    const details: any[] = Array.isArray(c?.logDetails) ? c.logDetails : [];

    // Legacy best app/title (single-pass)
    let bestTitle: string | undefined;
    let bestApp: string | undefined;
    let bestActive = -1;

    // Aggregations for Top 3
    const byTitle = new Map<string, number>();
    const byApp = new Map<string, number>();

    for (const d of details) {
      const active = Number(d?.activeTime || 0);
      const title = (d?.title || "").trim();
      const app = (d?.appName || d?.processName || "").trim();

      if (active > bestActive) {
        bestActive = active;
        bestTitle = title || bestTitle;
        bestApp = app || bestApp;
      }

      if (title) byTitle.set(title, (byTitle.get(title) || 0) + active);
      if (app) byApp.set(app, (byApp.get(app) || 0) + active);
    }

    const top3Titles =
      byTitle.size > 0
        ? [...byTitle.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([title, sec]) => ({ title, activeSeconds: sec }))
        : [];

    const top3Apps =
      byApp.size > 0
        ? [...byApp.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([app, sec]) => ({ app, activeSeconds: sec }))
        : [];

    return {
      _id: c?._id,
      startAt: c?.startAt || c?.startedAt || c?.createdAt,
      endAt: c?.endAt || c?.endedAt || c?.updatedAt,
      createdAt: c?.createdAt,
      updatedAt: c?.updatedAt,
      activeSeconds: Number(c?.logTotals?.activeTime ?? c?.activeSeconds ?? c?.active ?? 0),
      idleSeconds: Number(c?.logTotals?.idleTime ?? c?.idleSeconds ?? c?.idle ?? 0),
      topApp: bestApp,
      topTitle: bestTitle,
      top3Titles,
      top3Apps,
    };
  });

  const meta: ListMeta =
    data?.meta ?? {
      total: items.length,
      skip: Number(params?.skip ?? 0),
      limit: Number(params?.limit ?? 50),
    };

  return { items, meta };
}


export async function getDeviceApps(params: {
  deviceId: string;
  from?: string;
  to?: string;
  skip?: number;
  limit?: number;
}): Promise<AppsListResponse> {
  // If your route is '/reports/apps/list', change it here.
  const { data } = await api.get("/reports/apps", { params });
  const items: AppsListItem[] = Array.isArray(data?.data) ? data.data : [];
  const meta: ListMeta = data?.meta ?? {
    total: items.length,
    skip: Number(params?.skip ?? 0),
    limit: Number(params?.limit ?? 100),
  };
  return { items, meta };
}

export async function getDeviceTitles(params: {
  deviceId: string;
  from?: string;
  to?: string;
  skip?: number;
  limit?: number;
}): Promise<TitlesListResponse> {
  const { data } = await api.get("/reports/titles", { params });
  const items: TitlesListItem[] = Array.isArray(data?.data) ? data.data : [];
  const meta: ListMeta = data?.meta ?? {
    total: items.length,
    skip: Number(params?.skip ?? 0),
    limit: Number(params?.limit ?? 100),
  };
  return { items, meta };
}

