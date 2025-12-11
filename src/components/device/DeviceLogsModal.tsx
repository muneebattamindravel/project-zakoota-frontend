import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import Modal from "../ui/Modal";
import { Spinner } from "../ui";
import { fmtLocal, fmtDate, fmtTime12, fmtHMS } from "../../utils/format";
import { getDeviceLogs } from "../../utils/api";
import type { LogsListResponse } from "../../utils/types";

type Props = {
  open: boolean;
  onClose: () => void;
  device: any;
};

// local helper types for top apps/titles
interface TopAppItem {
  app: string;
  activeSeconds?: number;
}

interface TopTitleItem {
  title: string;
  activeSeconds?: number;
}

// helpers for datetime-local <-> ISO
function toInputLocal(dt: Date | string | number) {
  return dayjs(dt).format("YYYY-MM-DDTHH:mm");
}

function toISO(dtLocal: string) {
  return dayjs(dtLocal).toISOString();
}

type QuickRange = "today" | "last24" | "thisWeek" | "thisMonth";

export default function DeviceLogsModal({ open, onClose, device }: Props) {
  // Defaults: "today" = from midnight local → now
  const nowRef = useMemo(() => new Date(), []);
  const defaultTo = useMemo(() => toInputLocal(nowRef), [nowRef]);
  const defaultFrom = useMemo(
    () => toInputLocal(dayjs(nowRef).startOf("day").toDate()),
    [nowRef]
  );

  const [fromDT, setFromDT] = useState<string>(defaultFrom);
  const [toDT, setToDT] = useState<string>(defaultTo);
  const [limit, setLimit] = useState<number>(50);
  const [skip, setSkip] = useState<number>(0);

  // Reset pagination when key inputs change
  useEffect(() => {
    if (open) setSkip(0);
  }, [open, device?.deviceId, fromDT, toDT, limit]);

  const fromISO = useMemo(() => toISO(fromDT), [fromDT]);
  const toISOv = useMemo(() => toISO(toDT), [toDT]);

  const q = useQuery<LogsListResponse>({
    enabled: open && !!device?.deviceId,
    queryKey: ["device-logs", device?.deviceId, fromISO, toISOv, skip, limit],
    queryFn: () =>
      getDeviceLogs({
        deviceId: device.deviceId,
        from: fromISO,
        to: toISOv,
        skip,
        limit,
      }),
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: false,
  });

  const items = Array.isArray(q.data?.items) ? q.data!.items : [];
  const total = Number(q.data?.meta?.total ?? items.length);
  const canPrev = skip > 0 && !q.isFetching;
  const canNext = skip + limit < total && !q.isFetching;

  // Aggregated analytics for the *visible page* (not the entire dataset)
  const summary = useMemo(() => {
    if (!items.length) return null;

    let totalActive = 0;
    let totalIdle = 0;
    let earliestStart: Date | null = null;
    let latestEnd: Date | null = null;

    const appMap = new Map<string, number>();
    const titleMap = new Map<string, number>();

    for (const row of items as any[]) {
      const a = Number(row.activeSeconds ?? 0) || 0;
      const i = Number(row.idleSeconds ?? 0) || 0;
      totalActive += a;
      totalIdle += i;

      if (row.startAt) {
        const d = new Date(row.startAt);
        if (!earliestStart || d < earliestStart) earliestStart = d;
      }
      if (row.endAt) {
        const d = new Date(row.endAt);
        if (!latestEnd || d > latestEnd) latestEnd = d;
      }

      if (Array.isArray(row.top3Apps)) {
        for (const raw of row.top3Apps as TopAppItem[]) {
          if (!raw || !raw.app) continue;
          const key = raw.app;
          const val = Number(raw.activeSeconds ?? 0) || 0;
          appMap.set(key, (appMap.get(key) || 0) + val);
        }
      }

      if (Array.isArray(row.top3Titles)) {
        for (const raw of row.top3Titles as TopTitleItem[]) {
          if (!raw || !raw.title) continue;
          const key = raw.title;
          const val = Number(raw.activeSeconds ?? 0) || 0;
          titleMap.set(key, (titleMap.get(key) || 0) + val);
        }
      }
    }

    const totalSeconds = totalActive + totalIdle;
    const activePct = totalSeconds > 0 ? totalActive / totalSeconds : 0;

    const topApps = Array.from(appMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([app, activeSeconds]) => ({ app, activeSeconds }));

    const topTitles = Array.from(titleMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([title, activeSeconds]) => ({ title, activeSeconds }));

    return {
      totalActive,
      totalIdle,
      totalSeconds,
      activePct,
      earliestStart,
      latestEnd,
      topApps,
      topTitles,
      chunkCount: items.length,
    };
  }, [items]);

  const handleQuickRange = (range: QuickRange) => {
    const now = new Date();
    const nowLocal = toInputLocal(now);

    let from: string;

    switch (range) {
      case "today": {
        const startOfDay = dayjs(now).startOf("day").toDate();
        from = toInputLocal(startOfDay);
        break;
      }
      case "thisWeek": {
        const startOfWeek = dayjs(now).startOf("week").toDate();
        from = toInputLocal(startOfWeek);
        break;
      }
      case "thisMonth": {
        const startOfMonth = dayjs(now).startOf("month").toDate();
        from = toInputLocal(startOfMonth);
        break;
      }
      case "last24":
      default: {
        const d = dayjs(now).subtract(24, "hour").toDate();
        from = toInputLocal(d);
        break;
      }
    }

    setToDT(nowLocal);
    setFromDT(from);
  };

  const titleName = device?.name || device?.username || "Unassigned";
  const titleId = device?.deviceId || "";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Logs · ${titleName} — ${titleId}`}
      // max height so the panel itself can scroll on small screens
      widthClass="max-w-6xl w-screen sm:w-[95vw] max-h-[90vh]"
    >
      {/* This wrapper scrolls the entire modal body on mobile */}
      <div className="flex flex-col gap-3 max-h-[80vh] overflow-y-auto">
        {/* FILTERS */}
        <div className="shrink-0 space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="block text-[11px] font-medium text-slate-500">
                From
              </label>
              <input
                type="datetime-local"
                className="border rounded-xl px-3 py-2 text-xs sm:text-sm bg-slate-50 focus:bg-white focus:border-slate-300"
                value={fromDT}
                onChange={(e) => setFromDT(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="block text-[11px] font-medium text-slate-500">
                To
              </label>
              <input
                type="datetime-local"
                className="border rounded-xl px-3 py-2 text-xs sm:text-sm bg-slate-50 focus:bg-white focus:border-slate-300"
                value={toDT}
                onChange={(e) => setToDT(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="block text-[11px] font-medium text-slate-500">
                Rows per page
              </label>
              <select
                className="border rounded-xl px-3 py-2 text-xs sm:text-sm bg-slate-50 focus:bg-white focus:border-slate-300"
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value) || 50)}
              >
                {[25, 50, 100, 200].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick presets */}
            <div className="ml-auto flex flex-wrap items-end gap-2">
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
              {q.isFetching && (
                <span className="flex items-center gap-1 text-[11px] text-slate-500">
                  <Spinner /> Refreshing…
                </span>
              )}
            </div>
          </div>

          {/* ANALYTICS SUMMARY */}
          {summary && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Total time */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-2.5">
                <div className="text-[11px] font-medium text-slate-500">
                  Total time (this page)
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

              {/* Window */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-2.5">
                <div className="text-[11px] font-medium text-slate-500">
                  Coverage
                </div>
                <div className="mt-1 text-[11px] text-slate-700 space-y-0.5">
                  {summary.earliestStart && (
                    <div>
                      <span className="font-medium text-slate-600">
                        First:
                      </span>{" "}
                      {fmtDate(summary.earliestStart)}{" "}
                      {fmtTime12(summary.earliestStart)}
                    </div>
                  )}
                  {summary.latestEnd && (
                    <div>
                      <span className="font-medium text-slate-600">
                        Last:
                      </span>{" "}
                      {fmtDate(summary.latestEnd)}{" "}
                      {fmtTime12(summary.latestEnd)}
                    </div>
                  )}
                  <div>
                    <span className="font-medium text-slate-600">Chunks:</span>{" "}
                    {summary.chunkCount}
                  </div>
                </div>
              </div>

              {/* Top apps */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-2.5">
                <div className="text-[11px] font-medium text-slate-500">
                  Top apps (this page)
                </div>
                {summary.topApps.length === 0 ? (
                  <div className="mt-1 text-[11px] text-slate-500">—</div>
                ) : (
                  <ul className="mt-1 space-y-0.5 text-[11px] text-slate-700">
                    {summary.topApps.map((a, i) => (
                      <li key={i} className="flex items-center justify-between">
                        <span className="truncate max-w-[12rem]">
                          <span className="mr-1 text-slate-400">
                            {i + 1}.
                          </span>
                          {a.app}
                        </span>
                        <span className="ml-2 text-slate-500">
                          {fmtHMS(Number(a.activeSeconds || 0))}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Top titles */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-2.5">
                <div className="text-[11px] font-medium text-slate-500">
                  Top window titles (this page)
                </div>
                {summary.topTitles.length === 0 ? (
                  <div className="mt-1 text-[11px] text-slate-500">—</div>
                ) : (
                  <ul className="mt-1 space-y-0.5 text-[11px] text-slate-700">
                    {summary.topTitles.map((t, i) => (
                      <li key={i} className="flex items-center justify-between">
                        <span className="truncate max-w-[12rem]">
                          <span className="mr-1 text-slate-400">
                            {i + 1}.
                          </span>
                          {t.title}
                        </span>
                        <span className="ml-2 text-slate-500">
                          {fmtHMS(Number(t.activeSeconds || 0))}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>

        {/* TABLE CARD */}
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="min-w-[920px] w-full text-xs sm:text-sm">
              <thead className="bg-slate-50 border-b">
                <tr className="text-[11px] text-slate-600">
                  <th className="px-3 py-2 text-left">From</th>
                  <th className="px-3 py-2 text-left">To</th>
                  <th className="px-3 py-2 text-left">Active</th>
                  <th className="px-3 py-2 text-left">Idle</th>
                  <th className="px-3 py-2 text-left">Top apps</th>
                  <th className="px-3 py-2 text-left">Top window titles</th>
                </tr>
              </thead>
              <tbody>
                {q.isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-slate-600">
                      <div className="flex items-center gap-2">
                        <Spinner /> Loading logs…
                      </div>
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-slate-500">
                      No logs for this range.
                    </td>
                  </tr>
                ) : (
                  items.map((row: any) => {
                    const {
                      _id,
                      startAt,
                      endAt,
                      activeSeconds,
                      idleSeconds,
                      top3Apps,
                      top3Titles,
                      topApp,
                      topTitle,
                    } = row;

                    return (
                      <tr
                        key={String(
                          _id ?? `${startAt}-${endAt}-${Math.random()}`
                        )}
                        className="border-b last:border-0"
                      >
                        <td className="px-3 py-2 align-top">
                          <div className="text-slate-900">
                            {fmtDate(startAt!)} {fmtTime12(startAt!)}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {fmtLocal(startAt!)}
                          </div>
                        </td>
                        <td className="px-3 py-2 align-top">
                          <div className="text-slate-900">
                            {fmtDate(endAt!)} {fmtTime12(endAt!)}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {fmtLocal(endAt!)}
                          </div>
                        </td>
                        <td className="px-3 py-2 align-top">
                          {fmtHMS(Number(activeSeconds || 0))}
                        </td>
                        <td className="px-3 py-2 align-top">
                          {fmtHMS(Number(idleSeconds || 0))}
                        </td>

                        {/* Top Apps (3) */}
                        <td className="px-3 py-2 align-top">
                          {Array.isArray(top3Apps) && top3Apps.length > 0 ? (
                            <ul className="space-y-0.5">
                              {top3Apps.map((a: TopAppItem, i: number) => (
                                <li
                                  key={i}
                                  className="text-[11px] leading-snug text-slate-700 flex items-center justify-between gap-2"
                                >
                                  <span className="truncate flex-1">
                                    <span className="inline-block w-4 text-slate-400">
                                      {i + 1}.
                                    </span>
                                    <span
                                      className="truncate inline-block max-w-[18ch]"
                                      title={a.app}
                                    >
                                      {a.app}
                                    </span>
                                  </span>
                                  <span className="ml-2 text-slate-400">
                                    {fmtHMS(Number(a.activeSeconds || 0))}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span className="text-[11px] text-slate-500">
                              {topApp || "—"}
                            </span>
                          )}
                        </td>

                        {/* Top Titles (3) */}
                        <td className="px-3 py-2 align-top">
                          {Array.isArray(top3Titles) &&
                          top3Titles.length > 0 ? (
                            <ul className="space-y-0.5">
                              {top3Titles.map(
                                (t: TopTitleItem, i: number) => (
                                  <li
                                    key={i}
                                    className="text-[11px] leading-snug text-slate-700 flex items-center justify-between gap-2"
                                  >
                                    <span className="truncate flex-1">
                                      <span className="inline-block w-4 text-slate-400">
                                        {i + 1}.
                                      </span>
                                      <span
                                        className="truncate inline-block max-w-[22ch]"
                                        title={t.title}
                                      >
                                        {t.title}
                                      </span>
                                    </span>
                                    <span className="ml-2 text-slate-400">
                                      {fmtHMS(Number(t.activeSeconds || 0))}
                                    </span>
                                  </li>
                                )
                              )}
                            </ul>
                          ) : (
                            <span className="text-[11px] text-slate-500">
                              {topTitle || "—"}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* FOOTER: pagination */}
          <div className="shrink-0 border-t bg-slate-50 px-3 py-2">
            <div className="flex items-center justify-between gap-3 text-[11px] sm:text-xs">
              <button
                className="px-3 py-1 rounded-full border bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => setSkip(Math.max(0, skip - limit))}
                disabled={!canPrev}
              >
                Prev
              </button>
              <div className="text-slate-600">
                Showing {total === 0 ? 0 : skip + 1}–
                {Math.min(skip + limit, total)} of {total}
              </div>
              <button
                className="px-3 py-1 rounded-full border bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => setSkip(skip + limit)}
                disabled={!canNext}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
