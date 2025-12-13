export type User = {
  id?: string;
  _id?: string;
  username: string;
  role: string;
};

export type DeviceActivityToday = {
  activeSeconds?: number;
  idleSeconds?: number;
  // Future-friendly fields (optional – fine if backend doesn't send them yet)
  firstChunkAt?: string | null;
  lastChunkAt?: string | null;
  lastActivityAt?: string | null;
  activityState?: "active" | "idle" | "offline" | "unknown";
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

  commandsSummary?: CommandsSummary;

  activityToday?: DeviceActivityToday | null;
};

export type CommandRow = {
  _id?: string;
  command?: string;
  target?: "client" | "service";
  status?: "pending" | "acknowledged" | "completed";
  payload?: any;
  createdAt?: string;
  acknowledgedAt?: string | null;
  completedAt?: string | null;
};

export type CommandsSummary = {
  lastAck?: CommandRow | null;
  lastPending?: CommandRow | null;
  counts?: {
    pending?: number;
    acknowledged?: number;
    completed?: number;
  };
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
  startAt?: string;
  endAt?: string;
  createdAt?: string;
  updatedAt?: string;
  activeSeconds?: number;
  idleSeconds?: number;
  topApp?: string;           // legacy single best app
  topTitle?: string;         // legacy single best title
  top3Titles?: TopTitleItem[]; // NEW
  top3Apps?: TopAppItem[];     // NEW
};

export type TopTitleItem = {
  title: string;
  activeSeconds: number; // seconds
};

export type TopAppItem = {
  app: string;            // appName or processName
  activeSeconds: number;  // seconds
};

export type LogsListResponse = {
  items: LogsListItem[];
  meta: ListMeta;
};

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
