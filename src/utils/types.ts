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
