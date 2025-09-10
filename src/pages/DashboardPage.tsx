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

  // overall summary
  const sumQ = useQuery({
    queryKey: ['summary', deviceIds.join(','), from, to],
    enabled: deviceIds.length > 0,
    queryFn: async () => {
      const fromISO = new Date(from).toISOString();
      const toISO = new Date(to).toISOString();
      const results = await Promise.all(deviceIds.map(id => logsSummary(id, fromISO, toISO)));
      return results.reduce(
        (a: any, s: any) => ({
          activeTime: (a.activeTime || 0) + (s?.activeTime || 0),
          idleTime: (a.idleTime || 0) + (s?.idleTime || 0),
          mouseMovements: (a.mouseMovements || 0) + (s?.mouseMovements || 0),
          mouseScrolls: (a.mouseScrolls || 0) + (s?.mouseScrolls || 0),
          mouseClicks: (a.mouseClicks || 0) + (s?.mouseClicks || 0),
          keysPressed: (a.keysPressed || 0) + (s?.keysPressed || 0),
          chunks: (a.chunks || 0) + (s?.chunks || 0),
        }),
        {}
      );
    },
  });

  // top apps
  const appsQ = useQuery({
    queryKey: ['apps-top', deviceIds.join(','), from, to],
    enabled: deviceIds.length > 0,
    queryFn: async () => {
      const fromISO = new Date(from).toISOString();
      const toISO = new Date(to).toISOString();
      const per = await Promise.all(deviceIds.map(id => logsApps(id, fromISO, toISO, 5)));
      const merged = new Map<string, number>();
      per.flat().forEach(a => merged.set(a.appName, (merged.get(a.appName) || 0) + (a.activeTime || 0)));
      return Array.from(merged.entries()).map(([k, v]) => ({ name: k, activeTime: v }));
    },
  });

  const s = sumQ.data ?? {};
  const total = (s.activeTime ?? 0) + (s.idleTime ?? 0);

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

      {/* Filters */}
      <div className="card">
        <div className="card-body grid md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <label className="block text-sm mb-1">Devices (multi-select)</label>
            <select
              multiple
              value={deviceIds}
              onChange={e => setDeviceIds(Array.from(e.target.selectedOptions).map(o => o.value))}
              className="h-28"
            >
              {((devicesQ.data ?? []) as any[]).map((d: any) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.deviceId}
                  {d.username ? ` — @${d.username}` : ''}
                </option>
              ))}
            </select>
            <div className="text-xs text-slate-500 mt-1">Hold Ctrl/Cmd to select multiple</div>
          </div>
          <div>
            <label className="block text-sm mb-1">From</label>
            <input type="datetime-local" value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">To</label>
            <input type="datetime-local" value={to} onChange={e => setTo(e.target.value)} />
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid md:grid-cols-4 gap-3">
        <div className="kpi">
          <div className="kpi-title">Active Time</div>
          <div className="kpi-value">{fmtHMS(s.activeTime ?? 0)}</div>
        </div>
        <div className="kpi">
          <div className="kpi-title">Idle Time</div>
          <div className="kpi-value">{fmtHMS(s.idleTime ?? 0)}</div>
        </div>
        <div className="kpi">
          <div className="kpi-title">Activity Ratio</div>
          <div className="kpi-value">{total ? ((s.activeTime ?? 0) * 100 / total).toFixed(1) : '0.0'}%</div>
        </div>
        <div className="kpi">
          <div className="kpi-title">Chunks</div>
          <div className="kpi-value">{s.chunks ?? 0}</div>
        </div>
        <div className="kpi">
          <div className="kpi-title">Mouse Movements</div>
          <div className="kpi-value">{s.mouseMovements ?? 0}</div>
        </div>
        <div className="kpi">
          <div className="kpi-title">Mouse Scrolls</div>
          <div className="kpi-value">{s.mouseScrolls ?? 0}</div>
        </div>
        <div className="kpi">
          <div className="kpi-title">Mouse Clicks</div>
          <div className="kpi-value">{s.mouseClicks ?? 0}</div>
        </div>
        <div className="kpi">
          <div className="kpi-title">Keys Pressed</div>
          <div className="kpi-value">{s.keysPressed ?? 0}</div>
        </div>
      </div>

      {/* Top Apps */}
      <div className="card">
        <div className="card-header">Top Apps (by Active Time)</div>
        <div className="card-body" style={{ height: 360 }}>
          {appsQ.isLoading
            ? 'Loading...'
            : appsQ.error
            ? String((appsQ.error as any)?.message ?? appsQ.error)
            : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={appsQ.data ?? []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-20} textAnchor="end" height={80} />
                  <YAxis tickFormatter={(v) => fmtHMS(Number(v))} />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="activeTime" name="Active" stroke="#3b82f6" fill="#93c5fd" />
                </AreaChart>
              </ResponsiveContainer>
            )}
        </div>
      </div>
    </div>
  );
}
