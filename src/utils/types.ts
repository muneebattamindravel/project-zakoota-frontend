export type User = {
  id?: string;
  _id?: string;
  username: string;
};

export type Device = {
  deviceId: string;
  name?: string;
  type?: string;
  status?: string;
  lastSeen?: string;
  clientStatus?: string;
  serviceStatus?: string;

  userId?: string | null;
  username?: string | null;

  // 🔹 New fields for assigned user info
  profileURL?: string | null;
  designation?: string | null;
  checkInTime?: string | null;

  meta?: Record<string, any>;

  lastClientHeartbeat?: string;
  lastServiceHeartbeat?: string;
};

export type ChunkDetail = {
  processName: string;
  appName?: string;
  title?: string;
  activeTime: number;
  idleTime: number;
  mouseMovements: number;
  mouseScrolls: number;
  mouseClicks: number;
  keysPressed: number;
};

export type Chunk = {
  deviceId: string;
  startAt: string;
  endAt: string;
  activeTime: number;
  idleTime: number;
  mouseMovements: number;
  mouseScrolls: number;
  mouseClicks: number;
  keysPressed: number;
  logTotals?: Partial<{
    activeTime: number;
    idleTime: number;
    mouseMovements: number;
    mouseScrolls: number;
    mouseClicks: number;
    keysPressed: number;
  }>;
  logDetails: ChunkDetail[];
  userRef?: { userId?: string; username?: string };
};

// --- Add near the bottom (or wherever you keep list shapes) ---

export type ListMeta = {
  total: number;
  skip: number;
  limit: number;
};

// Generic paginated response
export type Paginated<T> = {
  items: T[];
  meta: ListMeta;
};

// LOGS (activity/chunk summary rows)
// Kept flexible to accommodate both ActivityChunk and any existing rollups.
export type LogsListItem = {
  _id?: string;
  startAt?: string | Date;
  endAt?: string | Date;
  startedAt?: string | Date;
  endedAt?: string | Date;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  // Totals / durations (seconds)
  logTotals?: { activeTime?: number; idleTime?: number };
  activeSeconds?: number;
  idleSeconds?: number;
  active?: number;
  idle?: number;
  // Top signals
  topApp?: string;
  topTitle?: string;
  app?: string;
  title?: string;
  top?: { app?: string; title?: string };
};

export type LogsListResponse = Paginated<LogsListItem>;

// APPS
export type AppsListItem = {
  _id?: string;
  app?: string;   // normalized app name
  name?: string;  // some backends return 'name' instead of 'app'
  activeSeconds?: number;
  idleSeconds?: number;
  active?: number;
  idle?: number;
  launches?: number;
  count?: number;
  occurrences?: number;
};

export type AppsListResponse = Paginated<AppsListItem>;

// TITLES
export type TitlesListItem = {
  _id?: string;
  title?: string;
  name?: string; // some backends use 'name'
  activeSeconds?: number;
  idleSeconds?: number;
  active?: number;
  idle?: number;
  occurrences?: number;
  count?: number;
};

export type TitlesListResponse = Paginated<TitlesListItem>;
