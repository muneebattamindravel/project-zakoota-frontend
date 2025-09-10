import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { listDevices, logsApps, logsSummary, getUserConfig } from '../utils/api';
import { fmtHMS } from '../utils/format';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { getDeviceStatuses } from '../utils/status';

function toLocalInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export default function DashboardPage() {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const [from, setFrom] = useState(
    toLocalInputValue(new Date(now.getTime() - 24 * 60 * 60 * 1000))
  );
  const [to, setTo] = useState(toLocalInputValue(now));
  const [deviceIds, setDeviceIds] = useState<string[]>([]);

  const devicesQ = useQuery({ queryKey: ['devices'], queryFn: listDevices });
  const configQ = useQuery({
    queryKey: ['config'],
    queryFn: () => getUserConfig('DASHBOARD-PLACEHOLDER'),
  });

  // auto-select first device
  useEffect(() => {
    if (!devicesQ.isLoading && (devicesQ.data ?? []).length && deviceIds.length === 0) {
      setDeviceIds([(devicesQ.data as any[])[0].deviceId]);
    }
  }, [devicesQ.isLoading, devicesQ.data]);

  // device summaries for today
  const deviceSummariesQ = useQuery({
    queryKey: ['device-summaries-today'],
    enabled: !!devicesQ.data,
    queryFn: async () => {
      const fromISO = startOfDay.toISOString();
      const toISO = now.toISOString();

      const devices = devicesQ.data ?? [];
      const results = await Promise.all(
        devices.map(async (d: any) => {
          const summary = await logsSummary(d.deviceId, fromISO, toISO);
          return {
            deviceId: d.deviceId,
            username: d.username,
            lastClientHeartbeat: d.lastClientHeartbeat,
            lastServiceHeartbeat: d.lastServiceHeartbeat,
            activeTime: summary?.activeTime ?? 0,
            idleTime: summary?.idleTime ?? 0,
          };
        })
      );
      return results;
    },
  });

  const sumQ = useQuery({ ... }); // unchanged
  const appsQ = useQuery({ ... }); // unchanged

  const clientDelay = configQ.data?.clientHeartbeatDelay ?? 60;
  const serviceDelay = configQ.data?.serviceHeartbeatDelay ?? 120;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Overview</h1>

      <div className="card">
        <div className="card-header">Devices Overview (Today)</div>
        <div className="card-body overflow-auto">
          {deviceSummariesQ.isLoading ? (
            'Loading devices...'
          ) : deviceSummariesQ.error ? (
            <div className="text-red-600">
              {String((deviceSummariesQ.error as any)?.message ?? deviceSummariesQ.error)}
            </div>
          ) : (
            <table className="text-sm w-full">
              <thead>
                <tr>
                  <th>Device ID</th>
                  <th>User</th>
                  <th>Client Status</th>
                  <th>Service Status</th>
                  <th>Active Time</th>
                  <th>Idle Time</th>
                </tr>
              </thead>
              <tbody>
                {(deviceSummariesQ.data ?? []).map((d, i) => {
                  const { clientStatus, serviceStatus } = getDeviceStatuses(
                    d.lastClientHeartbeat,
                    d.lastServiceHeartbeat,
                    clientDelay,
                    serviceDelay
                  );
                  return (
                    <tr key={i} className="border-t">
                      <td>{d.deviceId}</td>
                      <td>{d.username ?? '-'}</td>
                      <td className={clientStatus === 'online' ? 'text-green-600' : 'text-gray-500'}>
                        {clientStatus}
                      </td>
                      <td className={serviceStatus === 'online' ? 'text-green-600' : 'text-gray-500'}>
                        {serviceStatus}
                      </td>
                      <td className="text-green-600 font-semibold">{fmtHMS(d.activeTime)}</td>
                      <td className="text-yellow-600 font-semibold">{fmtHMS(d.idleTime)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* existing filters, KPIs, and Top Apps sections remain unchanged */}
    </div>
  );
}
