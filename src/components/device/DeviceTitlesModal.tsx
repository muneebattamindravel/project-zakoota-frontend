import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import Modal from "../ui/Modal";
import { Spinner } from "../ui";
import { logsApps, logsTitles } from "../../utils/api";
import { fmtHMS } from "../../utils/format";
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

type Props = {
  open: boolean;
  onClose: () => void;
  device: any;
};

type QuickRange = "today" | "last24" | "thisWeek" | "thisMonth";

type TitleAggregate = {
  title: string;
  activeTime: number;
  idleTime: number;
};

type AppAggregateForList = {
  appName: string;
  activeTime: number;
  idleTime: number;
};

function toLocalInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate()
  )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function DeviceTitlesModal({ open, onClose, device }: Props) {
  const deviceId = device?.deviceId || "";

  const [appName, setAppName] = useState<string>("");
  const [from, setFrom] = useState<string>(() =>
    toLocalInputValue(dayjs().startOf("day").toDate())
  );
  const [to, setTo] = useState<string>(() => toLocalInputValue(new Date()));
  const [top, setTop] = useState<number>(20);

  // Reset default range + clear app when opening
  useEffect(() => {
    if (!open) return;
    const now = new Date();
    setTo(toLocalInputValue(now));
    setFrom(toLocalInputValue(dayjs(now).startOf("day").toDate()));
    setAppName(""); // fresh selection per open
  }, [open]);

  const fromISO = useMemo(() => new Date(from).toISOString(), [from]);
  const toISO = useMemo(() => new Date(to).toISOString(), [to]);

  // Get top apps for dropdown suggestions
  const appsQ = useQuery<AppAggregateForList[]>({
    enabled: open && !!deviceId,
    queryKey: ["device-titles-modal-apps", deviceId, fromISO, toISO],
    queryFn: () => logsApps(deviceId, fromISO, toISO, 50),
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: false,
  });

  const appsForDropdown: AppAggregateForList[] = Array.isArray(appsQ.data)
    ? appsQ.data
    : [];

  // (Optional) auto-select first app ONLY if exactly one option exists
  useEffect(() => {
    if (!open) return;
    if (appName) return;
    if (appsForDropdown.length === 1) {
      setAppName(appsForDropdown[0].appName);
    }
  }, [open, appName, appsForDropdown]);

  const titlesQ = useQuery<TitleAggregate[]>({
    enabled: open && !!deviceId && !!appName,
    queryKey: ["device-titles-modal", deviceId, appName, fromISO, toISO, top],
    queryFn: () => logsTitles(deviceId, appName, fromISO, toISO, top),
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: false,
  });

  const titles: TitleAggregate[] = Array.isArray(titlesQ.data)
    ? titlesQ.data
    : [];

  const summary = useMemo(() => {
    if (!titles.length) return null;

    let totalActive = 0;
    let totalIdle = 0;

    for (const row of titles) {
      totalActive += Number(row.activeTime ?? 0) || 0;
      totalIdle += Number(row.idleTime ?? 0) || 0;
    }

    const totalSeconds = totalActive + totalIdle;
    const activePct = totalSeconds > 0 ? totalActive / totalSeconds : 0;

    const sortedByActive = [...titles].sort(
      (a, b) => Number(b.activeTime ?? 0) - Number(a.activeTime ?? 0)
    );
    const topTitle = sortedByActive[0] ?? null;

    return {
      totalActive,
      totalIdle,
      totalSeconds,
      activePct,
      titleCount: titles.length,
      topTitleText: topTitle?.title ?? null,
      topTitleActive: Number(topTitle?.activeTime ?? 0) || 0,
    };
  }, [titles]);

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

  const titleName = device?.name || device?.username || "Unassigned";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Titles · ${titleName} — ${deviceId}`}
      widthClass="max-w-6xl w-screen sm:w-[95vw] max-h-[90vh]"
    >
      <div className="flex flex-col gap-3 max-h-[80vh] overflow-y-auto">
        {/* FILTERS */}
        <section className="rounded-2xl border border-slate-200 bg-white px-4 py-3 md:px-5 md:py-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Window titles filters
              </h2>
              <p className="text-[11px] text-slate-500">
                Drill into which browser tabs / documents were in focus
                within a specific app.
              </p>
            </div>
            <div className="text-[11px] text-slate-500 text-right">
              Device ID:{" "}
              <span className="font-mono text-slate-700">{deviceId}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
            {/* App Name (real dropdown now) */}
            <div className="md:col-span-2">
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                App name
              </label>
              <select
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                className="border rounded-xl px-3 py-2 text-xs sm:text-sm w-full bg-slate-50 focus:bg-white focus:border-slate-300"
              >
                <option value="">
                  {appsForDropdown.length
                    ? "Select an app"
                    : "No apps found for this range"}
                </option>
                {appsForDropdown.map((a, i) => (
                  <option key={i} value={a.appName}>
                    {a.appName}
                  </option>
                ))}
              </select>
              {appsQ.isFetching && (
                <p className="mt-1 text-[11px] text-slate-400">
                  Loading app suggestions…
                </p>
              )}
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
            <div className="md:col-span-2 flex flex-wrap items-end gap-2 justify-end">
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

        {/* SUMMARY */}
        {deviceId && appName && summary && (
          <section className="rounded-2xl border border-slate-200 bg.white px-4 py-3 md:px-5 md:py-4">
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

              {/* Distinct titles */}
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

        {/* CHART */}
        <section className="rounded-2xl border border-slate-200 bg-white px-4 py-3 md:px-5 md:py-4">
          <div className="h-[260px] md:h-[340px]">
            {!deviceId ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                Missing deviceId.
              </div>
            ) : !appName ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                Select an app above to view titles.
              </div>
            ) : titlesQ.isLoading ? (
              <div className="h-full flex items-center justify-center text-slate-600 gap-2 text-sm">
                <Spinner /> Loading titles…
              </div>
            ) : titlesQ.error ? (
              <div className="text-rose-600 text-sm">
                {String((titlesQ.error as any)?.message ?? titlesQ.error)}
              </div>
            ) : titles.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                No titles for this app and range.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={titles}
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

        {/* TABLE */}
        <section className="rounded-2xl border border-slate-200 bg-white px-4 py-3 md:px-5 md:py-4">
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
                {titles.map((d, i) => (
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
                {titles.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-3 py-4 text-slate-500 text-sm"
                    >
                      {deviceId
                        ? appName
                          ? "No data for this range."
                          : "Select an app above."
                        : "Missing device id."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </Modal>
  );
}
