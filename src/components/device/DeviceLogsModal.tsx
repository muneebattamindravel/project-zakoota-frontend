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

// helpers for datetime-local <-> ISO
function toInputLocal(dt: Date | string | number) {
  return dayjs(dt).format("YYYY-MM-DDTHH:mm");
}
function toISO(dtLocal: string) {
  return dayjs(dtLocal).toISOString();
}

export default function DeviceLogsModal({ open, onClose, device }: Props) {
  // Defaults: last 24 hours ending now
  const now = useMemo(() => new Date(), []);
  const defaultTo = useMemo(() => toInputLocal(now), [now]);
  const defaultFrom = useMemo(
    () => toInputLocal(dayjs(now).subtract(24, "hour").toDate()),
    [now]
  );

  const [fromDT, setFromDT] = useState<string>(defaultFrom);
  const [toDT, setToDT] = useState<string>(defaultTo);
  const [limit, setLimit] = useState<number>(50);
  const [skip, setSkip] = useState<number>(0);

  // Reset pagination when critical inputs change
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

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Logs · ${device?.name || device?.username || "Unassigned"} — ${device?.deviceId || ""}`}
      widthClass="max-w-none w-screen sm:w-[98vw] h-[90vh]"
    >
      <div className="flex flex-col h-full">
        {/* Filters (header area stays above scroller) */}
        <div className="shrink-0 mb-3">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-[12px] text-slate-500 mb-1">From</label>
              <input
                type="datetime-local"
                className="border rounded-md px-3 py-2 text-sm"
                value={fromDT}
                onChange={(e) => setFromDT(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[12px] text-slate-500 mb-1">To</label>
              <input
                type="datetime-local"
                className="border rounded-md px-3 py-2 text-sm"
                value={toDT}
                onChange={(e) => setToDT(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[12px] text-slate-500 mb-1">Limit</label>
              <select
                className="border rounded-md px-3 py-2 text-sm"
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
              >
                {[25, 50, 100, 200].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick presets */}
            <div className="ml-auto flex items-end gap-2">
              <button
                type="button"
                className="px-3 py-2 text-xs border rounded-md bg-white hover:bg-slate-50"
                onClick={() => {
                  const d = new Date();
                  setFromDT(toInputLocal(dayjs(d).startOf("day").toDate()));
                  setToDT(toInputLocal(dayjs(d).endOf("day").toDate()));
                }}
              >
                Today
              </button>
              <button
                type="button"
                className="px-3 py-2 text-xs border rounded-md bg-white hover:bg-slate-50"
                onClick={() => {
                  const d = new Date();
                  setToDT(toInputLocal(d));
                  setFromDT(toInputLocal(dayjs(d).subtract(24, "hour").toDate()));
                }}
              >
                Last 24h
              </button>
              <div className="text-xs text-slate-500 min-w-[90px] text-right">
                {q.isFetching ? "Loading…" : `Total: ${total}`}
              </div>
            </div>
          </div>
        </div>

        {/* SCROLLER: table area */}
        <div className="flex-1 rounded-xl border bg-white overflow-hidden">
          <div className="h-full overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 border-b">
                <tr>
                  <th className="text-left font-medium px-3 py-2">Start</th>
                  <th className="text-left font-medium px-3 py-2">End</th>
                  <th className="text-left font-medium px-3 py-2">Active</th>
                  <th className="text-left font-medium px-3 py-2">Idle</th>
                  <th className="text-left font-medium px-3 py-2">Top App</th>
                  <th className="text-left font-medium px-3 py-2">Top Title</th>
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
                  items.map((row) => {
                    const { _id, startAt, endAt, activeSeconds, idleSeconds, topApp, topTitle } = row;
                    return (
                      <tr
                        key={String(_id ?? `${startAt}-${endAt}-${Math.random()}`)}
                        className="border-b last:border-0"
                      >
                        <td className="px-3 py-2">
                          <div className="text-slate-900">
                            {fmtDate(startAt)} {fmtTime12(startAt)}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {fmtLocal(startAt)}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="text-slate-900">
                            {fmtDate(endAt)} {fmtTime12(endAt)}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {fmtLocal(endAt)}
                          </div>
                        </td>
                        <td className="px-3 py-2">{fmtHMS(Number(activeSeconds || 0))}</td>
                        <td className="px-3 py-2">{fmtHMS(Number(idleSeconds || 0))}</td>
                        <td className="px-3 py-2">{topApp || "—"}</td>
                        <td className="px-3 py-2">{topTitle || "—"}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* FOOTER: fixed inside modal (not scrolling) */}
        <div className="shrink-0 mt-3 border-t bg-slate-50 px-3 py-2 rounded-b-xl">
          <div className="flex items-center justify-between">
            <button
              className="text-sm px-3 py-1 rounded-md border bg-white hover:bg-slate-50 disabled:opacity-50"
              onClick={() => setSkip(Math.max(0, skip - limit))}
              disabled={!canPrev}
            >
              Prev
            </button>
            <div className="text-xs text-slate-600">
              Showing {total === 0 ? 0 : skip + 1}–{Math.min(skip + limit, total)} of {total}
            </div>
            <button
              className="text-sm px-3 py-1 rounded-md border bg-white hover:bg-slate-50 disabled:opacity-50"
              onClick={() => setSkip(skip + limit)}
              disabled={!canNext}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
