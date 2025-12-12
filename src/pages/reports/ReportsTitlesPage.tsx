import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { listDevices, logsApps, logsTitles } from "../../utils/api";
import { fmtHMS } from "../../utils/format";
import DeviceCombo from "../../components/DeviceCombo";
import { Spinner } from "../../components/ui";

type QuickRange = "today" | "last24" | "thisWeek" | "thisMonth";

function toLocalInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate()
  )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ReportsTitlesPage() {
  const nowRef = useMemo(() => new Date(), []);
  const [deviceId, setDeviceId] = useState("");
  const [appName, setAppName] = useState("");
  const [from, setFrom] = useState(
    toLocalInputValue(dayjs(nowRef).startOf("day").toDate())
  );
  const [to, setTo] = useState(toLocalInputValue(nowRef));
  const [top, setTop] = useState(20);

  const devicesQ = useQuery({
    queryKey: ["devices"],
    queryFn: listDevices,
    refetchOnWindowFocus: false,
  });

  const options =
    ((devicesQ.data ?? []) as any[]).map((d: any) => ({
      value: d.deviceId,
      label: `${d.deviceId}${d.username ? " — @" + d.username : ""}`,
      username: d.username,
    })) ?? [];

  const selectedDevice = options.find((o) => o.value === deviceId);

  // Top apps for datalist of appName
  const appsQ = useQuery({
    queryKey: ["apps", deviceId, from, to, 50],
    enabled: !!deviceId,
    queryFn: () =>
      logsApps(
        deviceId,
        new Date(from).toISOString(),
        new Date(to).toISOString(),
        50
      ),
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: false,
  });

  const titlesQ = useQuery({
    queryKey: ["titles", deviceId, appName, from, to, top],
    enabled: !!deviceId && !!appName,
    queryFn: () =>
      logsTitles(
        deviceId,
        appName,
        new Date(from).toISOString(),
        new Date(to).toISOString(),
        top
      ),
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: false,
  });

  const data: any[] = Array.isArray(titlesQ.data)
    ? (titlesQ.data as any[])
    : [];

  const summary = useMemo(() => {
    if (!data.length) return null;

    let totalActive = 0;
    let totalIdle = 0;

    for (const row of data) {
      totalActive += Number(row.activeTime ?? 0) || 0;
      totalIdle += Number(row.idleTime ?? 0) || 0;
    }

    const totalSeconds = totalActive + totalIdle;
    const activePct = totalSeconds > 0 ? totalActive / totalSeconds : 0;

    const sortedByActive = [...data].sort(
      (a, b) =>
        Number(b.activeTime ?? 0) - Number(a.activeTime ?? 0)
    );
    const topTitle = sortedByActive[0] ?? null;

    return {
      totalActive,
      totalIdle,
      totalSeconds,
      activePct,
      titleCount: data.length,
      topTitleText: topTitle?.title ?? null,
      topTitleActive: Number(topTitle?.activeTime ?? 0) || 0,
    };
  }, [data]);

  const handleQuickRange = (range: QuickRange) => {
    const now = new Date();
    const nowLocal = toLocalInputValue(now);

    let fromLocal: string;

    switch (range) {
      case "today": {
        const startOfDay = dayjs(now).startOf("day").toDate();
        fromLocal = toLocalInputValue(startOfDay);
        break;
      }
      case "thisWeek": {
        const startOfWeek = dayjs(now).startOf("week").toDate();
        fromLocal = toLocalInputValue(startOfWeek);
        break;
      }
      case "thisMonth": {
        const startOfMonth = dayjs(now).startOf("month").toDate();
        fromLocal = toLocalInputValue(startOfMonth);
        break;
      }
      case "last24":
      default: {
        const d = dayjs(now).subtract(24, "hour").toDate();
        fromLocal = toLocalInputValue(d);
        break;
      }
    }

    setTo(nowLocal);
    setFrom(fromLocal);
  };

  const appsForDatalist: any[] = Array.isArray(appsQ.data)
    ? (appsQ.data as any[])
    : [];

  return (
    <div className="container main-wrap space-y-4">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            App Window Titles
          </h1>
          <p className="text-xs text-slate-500">
            Drill into which browser tabs / documents / windows were actually
            in focus within a given app.
          </p>
        </div>
        {selectedDevice && (
          <div className="text-xs text-slate-500 text-right max-w-xs">
            <div className="font-medium text-slate-700">
              {selectedDevice.username
                ? `@${selectedDevice.username}`
                : selectedDevice.value}
            </div>
            <div>Device: {selectedDevice.value}</div>
          </div>
        )}
      </div>

      {/* FILTERS CARD */}
      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm p-4 md:p-5 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Filters</h2>
            <p className="text-[11px] text-slate-500">
              Choose a device, app, and time window to analyze its window
              titles.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
          {/* Device */}
          <div className="md:col-span-2">
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Device
            </label>
            <DeviceCombo
              options={options}
              value={deviceId}
              onChange={setDeviceId}
            />
          </div>

          {/* App Name (with suggestions) */}
          <div className="md:col-span-2">
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              App name
            </label>
            <input
              list="apps-list"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              placeholder="e.g. chrome.exe"
              className="border rounded-xl px-3 py-2 text-xs sm:text-sm w-full bg-slate-50 focus:bg-white focus:border-slate-300"
            />
            <datalist id="apps-list">
              {appsForDatalist.map((a: any, i: number) => (
                <option key={i} value={a.appName} />
              ))}
            </datalist>
          </div>

          {/* From */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              From
            </label>
            <input
              type="datetime-local"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="border rounded-xl px-3 py-2 text-xs sm:text-sm w-full bg-slate-50 focus:bg-white focus:border-slate-300"
            />
          </div>

          {/* To */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              To
            </label>
            <input
              type="datetime-local"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="border rounded-xl px-3 py-2 text-xs sm:text-sm w-full bg-slate-50 focus:bg-white focus:border-slate-300"
            />
          </div>

          {/* Top titles */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Top titles
            </label>
            <input
              type="number"
              min={1}
              value={top}
              onChange={(e) =>
                setTop(parseInt(e.target.value || "20", 10))
              }
              className="border rounded-xl px-3 py-2 text-xs sm:text-sm w-full bg-slate-50 focus:bg-white focus:border-slate-300"
            />
          </div>

          {/* Quick ranges */}
          <div className="md:col-span-3 flex flex-wrap items-end gap-2 justify-end">
            <span className="hidden sm:inline text-[11px] text-slate-500 mr-1">
              Quick ranges
            </span>
            <button
              type="button"
              className="px-3 py-1.5 text-[11px] sm:text-xs border rounded-full bg-white hover:bg-slate-50"
              onClick={() => handleQuickRange("today")}
            >
              Today
            </button>
            <button
              type="button"
              className="px-3 py-1.5 text-[11px] sm:text-xs border rounded-full bg-white hover:bg-slate-50"
              onClick={() => handleQuickRange("last24")}
            >
              Last 24h
            </button>
            <button
              type="button"
              className="px-3 py-1.5 text-[11px] sm:text-xs border rounded-full bg-white hover:bg-slate-50"
              onClick={() => handleQuickRange("thisWeek")}
            >
              This week
            </button>
            <button
              type="button"
              className="px-3 py-1.5 text-[11px] sm:text-xs border rounded-full bg-white hover:bg-slate-50"
              onClick={() => handleQuickRange("thisMonth")}
            >
              This month
            </button>
            {titlesQ.isFetching && deviceId && appName && (
              <span className="flex items-center gap-1 text-[11px] text-slate-500">
                <Spinner /> Refreshing…
              </span>
            )}
          </div>
        </div>
      </section>

      {/* SUMMARY CARD */}
      {deviceId && appName && summary && (
        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm p-4 md:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Total time */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-2.5">
              <div className="text-[11px] font-medium text-slate-500">
                Total time in “{appName}”
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <div className="text-sm font-semibold text-slate-900">
                  {fmtHMS(summary.totalSeconds)}
                </div>
                <div className="text-[11px] text-slate-500">
                  Active {fmtHMS(summary.totalActive)} · Idle{" "}
                  {fmtHMS(summary.totalIdle)}
                </div>
              </div>
              <div className="mt-1 text-[11px] text-emerald-600">
                Active {(summary.activePct * 100).toFixed(0)}%
              </div>
            </div>

            {/* Titles count */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-2.5">
              <div className="text-[11px] font-medium text-slate-500">
                Distinct titles
              </div>
              <div className="mt-1 text-lg font-semibold text-slate-900">
                {summary.titleCount}
              </div>
              <div className="text-[11px] text-slate-500">
                Limited by “Top {top}”
              </div>
            </div>

            {/* Top title */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-2.5">
              <div className="text-[11px] font-medium text-slate-500">
                Most focused title
              </div>
              {summary.topTitleText ? (
                <>
                  <div className="mt-1 text-xs font-semibold text-slate-900 line-clamp-2">
                    {summary.topTitleText}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Active {fmtHMS(summary.topTitleActive)}
                  </div>
                </>
              ) : (
                <div className="mt-1 text-[11px] text-slate-500">—</div>
              )}
            </div>

            {/* Focus ratio */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-2.5">
              <div className="text-[11px] font-medium text-slate-500">
                Focus ratio
              </div>
              <div className="mt-1 text-sm text-slate-700">
                Top title consumes{" "}
                <span className="font-semibold">
                  {summary.totalActive > 0
                    ? `${Math.round(
                        (summary.topTitleActive / summary.totalActive) * 100
                      )}%`
                    : "0%"}
                </span>{" "}
                of active time in this app.
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                Great for seeing if someone is stuck on a single tab/document.
              </div>
            </div>
          </div>
        </section>
      )}

      {/* CHART CARD */}
      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm p-4 md:p-5">
        <div className="h-[320px] md:h-[420px]">
          {!deviceId ? (
            <div className="h-full flex items-center justify-center text-slate-500 text-sm">
              Select a device to view titles.
            </div>
          ) : !appName ? (
            <div className="h-full flex items-center justify-center text-slate-500 text-sm">
              Enter an app name (or choose from suggestions) to view titles.
            </div>
          ) : titlesQ.isLoading ? (
            <div className="h-full flex items-center justify-center text-slate-600 gap-2 text-sm">
              <Spinner /> Loading titles…
            </div>
          ) : titlesQ.error ? (
            <div className="text-rose-600 text-sm">
              {String((titlesQ.error as any)?.message ?? titlesQ.error)}
            </div>
          ) : data.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-500 text-sm">
              No titles for this app and range.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ left: 20, right: 20, bottom: 16 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="title"
                  tick={{ fontSize: 11 }}
                  interval={0}
                  angle={-30}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  tickFormatter={(v) => fmtHMS(Number(v))}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip formatter={(v) => fmtHMS(Number(v))} />
                <Legend />
                <Bar dataKey="activeTime" name="Active" fill="#22c55e" />
                <Bar dataKey="idleTime" name="Idle" fill="#eab308" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* TABLE CARD */}
      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm p-4 md:p-5">
        <div className="overflow-auto">
          <table className="min-w-full text-xs sm:text-sm">
            <thead className="border-b bg-slate-50">
              <tr className="text-[11px] text-slate-600">
                <th className="px-3 py-2 text-left">Title</th>
                <th className="px-3 py-2 text-left">Active</th>
                <th className="px-3 py-2 text-left">Idle</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d: any, i: number) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="px-3 py-2 align-top text-slate-900">
                    {d.title}
                  </td>
                  <td className="px-3 py-2 align-top text-slate-700">
                    {fmtHMS(d.activeTime)}
                  </td>
                  <td className="px-3 py-2 align-top text-slate-700">
                    {fmtHMS(d.idleTime)}
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="px-3 py-4 text-slate-500 text-sm"
                  >
                    {deviceId
                      ? appName
                        ? "No data for this range."
                        : "Enter an app name above."
                      : "Select a device above."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
