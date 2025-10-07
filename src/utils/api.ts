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
