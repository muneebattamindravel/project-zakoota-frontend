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

export async function assignDevice(deviceId: string, body: { username?: string; userId?: string }) {
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
};

export async function getUserConfig(deviceId: string) {
    const { data } = await api.post('/config/user-config', { deviceId });
    return data?.data ?? data;
}

export async function updateConfig(body: ConfigPayload) {
    const { data } = await api.post('/config', body);
    return data?.data ?? data;
}
