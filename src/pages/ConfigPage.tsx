import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getHealth, getUserConfig, updateConfig } from '../utils/api';
import { useState, useEffect, useMemo } from 'react';
import { Spinner } from '../components/ui';

export default function HealthPage() {
  const queryClient = useQueryClient();

  const healthQ = useQuery({
    queryKey: ['health'],
    queryFn: getHealth,
    refetchOnWindowFocus: false,
  });

  // Use DASHBOARD as special config ID
  const deviceId = 'DASHBOARD';

  const configQ = useQuery({
    queryKey: ['config', deviceId],
    queryFn: () => getUserConfig(deviceId),
    refetchOnWindowFocus: false,
  });

  const [chunkTime, setChunkTime] = useState(300);
  const [idleThreshold, setIdleThreshold] = useState(60);
  const [isZaiminaarEnabled, setIsZaiminaarEnabled] = useState(false);
  const [clientDelay, setClientDelay] = useState(60);
  const [serviceDelay, setServiceDelay] = useState(60);
  const [version, setVersion] = useState(1);
  const [userName, setUserName] = useState('');
  const [userProfileImageURL, setUserProfileImageURL] = useState('');
  const [allowQuit, setAllowQuit] = useState(false);

  useEffect(() => {
    if (configQ.data) {
      setChunkTime(configQ.data.chunkTime);
      setIdleThreshold(configQ.data.idleThresholdPerChunk);
      setIsZaiminaarEnabled(configQ.data.isZaiminaarEnabled);
      setClientDelay(configQ.data.clientHeartbeatDelay ?? 60);
      setServiceDelay(configQ.data.serviceHeartbeatDelay ?? 60);
      setUserName(configQ.data.name);
      setUserProfileImageURL(configQ.data.profileURL);
      setVersion(configQ.data.version);
      setAllowQuit(Boolean(configQ.data.allowQuit));
    }
  }, [configQ.data]);

  const mutation = useMutation({
    mutationFn: updateConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config', deviceId] });
    },
  });

  const handleSave = () => {
    mutation.mutate({
      chunkTime: Number(chunkTime),
      idleThresholdPerChunk: Number(idleThreshold),
      isZaiminaarEnabled,
      clientHeartbeatDelay: Number(clientDelay),
      serviceHeartbeatDelay: Number(serviceDelay),
      allowQuit,
    });
  };

  const healthSummary = useMemo(() => {
    const data = healthQ.data as any;
    if (!data) return null;

    const status =
      data.status || data.ok || data.health || 'unknown';

    const uptime =
      typeof data.uptime === 'number'
        ? `${Math.round(data.uptime / 60)} min`
        : data.uptime;

    const versionStr =
      data.version || data.appVersion || data.build || null;

    return {
      status,
      uptime,
      version: versionStr,
      raw: data,
    };
  }, [healthQ.data]);

  const statusColor = (status: string) => {
    const s = String(status).toLowerCase();
    if (s === 'ok' || s === 'healthy' || s === 'up') {
      return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    }
    if (s === 'degraded' || s === 'warn') {
      return 'bg-amber-50 text-amber-700 border-amber-100';
    }
    if (s === 'down' || s === 'error') {
      return 'bg-rose-50 text-rose-700 border-rose-100';
    }
    return 'bg-slate-50 text-slate-600 border-slate-200';
  };

  return (
    <div className="container main-wrap space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            System Health & Config
          </h1>
          <p className="text-xs text-slate-500">
            Backend heartbeat and global matrixFlow client settings.
          </p>
        </div>
      </div>

      {/* Health summary */}
      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm p-4 md:p-5 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Backend health
            </h2>
            <p className="text-[11px] text-slate-500">
              Live status of the brain / API server powering matrixFlow.
            </p>
          </div>
        </div>

        {healthQ.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Spinner /> Checking health…
          </div>
        ) : healthQ.error ? (
          <div className="text-sm text-rose-600">
            Error loading health:{" "}
            {String((healthQ.error as any)?.message ?? healthQ.error)}
          </div>
        ) : healthSummary ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Status */}
              <div className="rounded-2xl border px-3 py-2.5 bg-slate-50/80">
                <div className="text-[11px] font-medium text-slate-500">
                  Status
                </div>
                <div
                  className={
                    'mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ' +
                    statusColor(healthSummary.status)
                  }
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-current"
                    aria-hidden
                  />
                  {String(healthSummary.status)}
                </div>
              </div>

              {/* Uptime */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-2.5">
                <div className="text-[11px] font-medium text-slate-500">
                  Uptime
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {healthSummary.uptime ?? '—'}
                </div>
              </div>

              {/* Version */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-2.5">
                <div className="text-[11px] font-medium text-slate-500">
                  API version
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {healthSummary.version ?? '—'}
                </div>
              </div>
            </div>

            {/* Raw payload */}
            <div className="mt-3">
              <details className="text-xs text-slate-600">
                <summary className="cursor-pointer select-none text-[11px] font-medium mb-1">
                  Raw health payload
                </summary>
                <pre className="text-[11px] bg-slate-50 border border-slate-200 rounded-2xl p-2 overflow-auto max-h-64">
                  {JSON.stringify(healthSummary.raw, null, 2)}
                </pre>
              </details>
            </div>
          </>
        ) : (
          <div className="text-sm text-slate-500">No health data.</div>
        )}
      </section>

      {/* Config */}
      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm p-4 md:p-5 space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Global client config
            </h2>
            <p className="text-[11px] text-slate-500">
              These settings control how matrixFlow clients capture chunks and
              send heartbeats.
            </p>
          </div>
          <div className="text-[11px] text-slate-500">
            Config ID: <span className="font-mono">{deviceId}</span>
          </div>
        </div>

        {configQ.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Spinner /> Loading config…
          </div>
        ) : configQ.error ? (
          <div className="text-sm text-rose-600">
            Error loading config:{" "}
            {String((configQ.error as any)?.message ?? configQ.error)}
          </div>
        ) : (
          <>
            {/* User info */}
            <div className="flex items-center gap-3 mb-2">
              {userProfileImageURL && (
                <img
                  src={userProfileImageURL}
                  alt="profile"
                  className="w-10 h-10 rounded-full border object-cover"
                />
              )}
              <div className="flex flex-col">
                <span className="text-sm font-medium text-slate-900">
                  {userName || 'Dashboard Config'}
                </span>
                <span className="text-[11px] text-slate-500">
                  Current config version: <b>{version}</b>
                </span>
              </div>
            </div>

            {/* Form grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Chunk time */}
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  Chunk time (seconds)
                </label>
                <input
                  type="number"
                  value={chunkTime}
                  onChange={(e) => setChunkTime(Number(e.target.value))}
                  className="border rounded-xl px-3 py-2 text-xs sm:text-sm w-full bg-slate-50 focus:bg-white focus:border-slate-300"
                />
                <p className="mt-1 text-[10px] text-slate-400">
                  How long each activity chunk spans on the client.
                </p>
              </div>

              {/* Idle threshold */}
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  Idle threshold per chunk (seconds)
                </label>
                <input
                  type="number"
                  value={idleThreshold}
                  onChange={(e) =>
                    setIdleThreshold(Number(e.target.value))
                  }
                  className="border rounded-xl px-3 py-2 text-xs sm:text-sm w-full bg-slate-50 focus:bg-white focus:border-slate-300"
                />
                <p className="mt-1 text-[10px] text-slate-400">
                  Above this, the chunk is counted as idle.
                </p>
              </div>

              {/* Client heartbeat */}
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  Client heartbeat delay (seconds)
                </label>
                <input
                  type="number"
                  value={clientDelay}
                  onChange={(e) =>
                    setClientDelay(Number(e.target.value))
                  }
                  className="border rounded-xl px-3 py-2 text-xs sm:text-sm w-full bg-slate-50 focus:bg-white focus:border-slate-300"
                />
                <p className="mt-1 text-[10px] text-slate-400">
                  How often the UI client pings the server.
                </p>
              </div>

              {/* Service heartbeat */}
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  Service heartbeat delay (seconds)
                </label>
                <input
                  type="number"
                  value={serviceDelay}
                  onChange={(e) =>
                    setServiceDelay(Number(e.target.value))
                  }
                  className="border rounded-xl px-3 py-2 text-xs sm:text-sm w-full bg-slate-50 focus:bg-white focus:border-slate-300"
                />
                <p className="mt-1 text-[10px] text-slate-400">
                  How often the background service reports status.
                </p>
              </div>

              {/* Allow quit */}
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  Allow client quit
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="w-4 h-4"
                    checked={allowQuit}
                    onChange={(e) => setAllowQuit(e.target.checked)}
                  />
                  <span className="text-xs text-slate-700">
                    Allow the matrixFlow client to exit via UI.
                  </span>
                </div>
              </div>

              {/* Zaiminaar toggle */}
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  Zaiminaar enabled
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="w-4 h-4"
                    checked={isZaiminaarEnabled}
                    onChange={(e) =>
                      setIsZaiminaarEnabled(e.target.checked)
                    }
                  />
                  <span className="text-xs text-slate-700">
                    Enable Zaiminaar features on the client.
                  </span>
                </div>
              </div>
            </div>

            {/* Save button + messages */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                className="px-4 py-2 rounded-full bg-slate-900 text-white text-xs sm:text-sm font-medium hover:bg-slate-800 disabled:opacity-70 disabled:cursor-not-allowed"
                onClick={handleSave}
                disabled={mutation.isPending}
              >
                {mutation.isPending ? 'Saving…' : 'Save config'}
              </button>

              {mutation.error && (
                <div className="text-rose-600 text-xs">
                  Error:{' '}
                  {String(
                    (mutation.error as any)?.message ??
                    mutation.error
                  )}
                </div>
              )}
              {mutation.isSuccess && !mutation.error && (
                <div className="text-emerald-600 text-xs">
                  ✅ Config saved successfully
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
