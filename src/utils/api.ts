// src/utils/api.ts
import axios, { AxiosInstance } from 'axios';

/**
 * Base URL rules:
 * - Set VITE_API_BASE env to the full API root, e.g.:
 *   VITE_API_BASE=https://zakoota.mindravel.com/zakoota-api
 * - Do NOT include a trailing slash.
 */
const BASE_URL =
  (import.meta as any)?.env?.VITE_API_BASE ||
  (typeof window !== 'undefined'
    ? `${window.location.origin}/zakoota-api`
    : 'http://localhost:6666/zakoota-api');

function createClient(): AxiosInstance {
  const api = axios.create({
    baseURL: BASE_URL,
    withCredentials: false,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Attach token from localStorage if present
  api.interceptors.request.use((config) => {
    const token = localStorage.getItem('zakoota_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  return api;
}

export const api = createClient();

/** Auth helpers */
export function setAuthToken(token: string | null) {
  if (token) localStorage.setItem('zakoota_token', token);
  else localStorage.removeItem('zakoota_token');
}

export async function login(username: string, password: string) {
  const { data } = await api.post('/auth/login', { username, password });
  // Expecting { ok?, data: { token, user } } or { token, user }
  const token = data?.data?.token ?? data?.token;
  const user = data?.data?.user ?? data?.user;
  if (token) setAuthToken(token);
  return { token, user, raw: data };
}

/* =========================
   Devices & Config
   ========================= */
export async function listDevices(params?: Record<string, any>) {
  const { data } = await api.get('/devices', { params });
  return data?.data ?? data;
}

export async function assignDevice(deviceId: string, payload: any) {
  const { data } = await api.post(`/devices/${encodeURIComponent(deviceId)}/assign`, payload);
  return data?.data ?? data;
}

export async function deviceHeartbeat(body: { deviceId: string; type: 'client' | 'service' }) {
  const { data } = await api.post('/devices/heartbeat', body);
  return data?.data ?? data;
}

export async function getUserConfig(deviceId?: string) {
  const { data } = await api.post('/config/user', { deviceId });
  return data?.data ?? data;
}

/* =========================
   Errors (FIXED PATH)
   ========================= */
export async function listErrors(params?: {
  deviceId?: string;
  errorType?: string;
  page?: number;
  limit?: number;
}) {
  const { data } = await api.get('/errors/list', { params });
  return data?.data ?? data;
}

export async function logDeviceError(deviceId: string, payload: {
  errorType: string; message: string; stack?: string; context?: any;
}) {
  const { data } = await api.post(`/errors/${encodeURIComponent(deviceId)}`, payload);
  return data?.data ?? data;
}

/* =========================
   Commands (aligned to your backend)
   ========================= */
export async function createCommand(deviceId: string, type: 'restart_logger' | 'show_message' | 'restart_service', payload?: any) {
  const { data } = await api.post('/commands/create', { deviceId, type, payload });
  return data?.data ?? data;
}

/** Return pending commands for a device (NO ACK) — use in heartbeat flow */
export async function getPendingCommands(deviceId: string) {
  const { data } = await api.get(`/commands/pending/${encodeURIComponent(deviceId)}`);
  return data?.data ?? data; // array of commands or []
}

/** Explicitly ACK a command */
export async function acknowledgeCommand(id: string) {
  const { data } = await api.patch(`/commands/${encodeURIComponent(id)}/acknowledge`);
  return data?.data ?? data;
}

/** Mark command complete */
export async function completeCommand(id: string) {
  const { data } = await api.patch(`/commands/${encodeURIComponent(id)}/complete`);
  return data?.data ?? data;
}

/** List commands with filters; no side-effects */
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
  return data?.data ?? data;
}

/** Danger: delete all commands */
export async function deleteAllCommands() {
  const { data } = await api.delete('/commands/deleteAll');
  return data?.data ?? data;
}

/* =========================
   Logs
   ========================= */
export async function listLogs(params: {
  deviceId: string;
  from?: string | number | Date;
  to?: string | number | Date;
  limit?: number;
  skip?: number;
}) {
  const { data } = await api.get('/logs', { params });
  return data?.data ?? data;
}

export async function logsSummary(params: { deviceId: string; from?: string | number | Date; to?: string | number | Date; }) {
  const { data } = await api.get('/logs/aggregate/summary', { params });
  return data?.data ?? data;
}

export async function logsApps(params: { deviceId: string; from?: string | number | Date; to?: string | number | Date; top?: number; }) {
  const { data } = await api.get('/logs/aggregate/apps', { params });
  return data?.data ?? data;
}

export async function logsTitles(params: { deviceId: string; appName: string; from?: string | number | Date; to?: string | number | Date; top?: number; }) {
  const { data } = await api.get('/logs/aggregate/titles', { params });
  return data?.data ?? data;
}

export async function logsMissing(params: { deviceId: string; from?: string | number | Date; to?: string | number | Date; }) {
  const { data } = await api.get('/logs/missing', { params });
  return data?.data ?? data;
}

/* =========================
   Utilities
   ========================= */
export function getApiBase(): string {
  return BASE_URL;
}
