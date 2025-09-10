/**
 * Compute whether client and service are online or offline
 * based on last heartbeat timestamps and config delays.
 *
 * @param lastClientHeartbeat - ISO string of last client heartbeat
 * @param lastServiceHeartbeat - ISO string of last service heartbeat
 * @param clientDelaySec - delay (seconds) from config
 * @param serviceDelaySec - delay (seconds) from config
 */
export function getDeviceStatuses(
  lastClientHeartbeat?: string,
  lastServiceHeartbeat?: string,
  clientDelaySec: number = 60,
  serviceDelaySec: number = 60
): { clientStatus: 'online' | 'offline'; serviceStatus: 'online' | 'offline' } {
  const now = Date.now();

  // Client status
  let clientStatus: 'online' | 'offline' = 'offline';
  if (lastClientHeartbeat) {
    const diffMs = now - new Date(lastClientHeartbeat).getTime();
    if (diffMs <= clientDelaySec * 1500) {
      // 1.5x the clientHeartbeatDelay
      clientStatus = 'online';
    }
  }

  // Service status
  let serviceStatus: 'online' | 'offline' = 'offline';
  if (lastServiceHeartbeat) {
    const diffMs = now - new Date(lastServiceHeartbeat).getTime();
    if (diffMs <= serviceDelaySec * 2500) {
      // 2.5x the serviceHeartbeatDelay
      serviceStatus = 'online';
    }
  }

  return { clientStatus, serviceStatus };
}
