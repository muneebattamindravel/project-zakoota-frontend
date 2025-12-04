import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Modal, Spinner } from "../ui";
import { fmtHMS } from "../../utils/format";
import { getDeviceApps } from "../../utils/api";
import type { AppsListResponse } from "../../utils/types";

type Props = { open: boolean; onClose: () => void; device: any; };

export default function DeviceAppsModal({ open, onClose, device }: Props) {
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [limit, setLimit] = useState<number>(100);
  const [skip, setSkip] = useState<number>(0);

  useEffect(() => { if (open) setSkip(0); }, [open, device?.deviceId, from, to, limit]);

  const q = useQuery<AppsListResponse>({
    enabled: open && !!device?.deviceId,
    queryKey: ["device-apps", device?.deviceId, from, to, skip, limit],
    queryFn: () => getDeviceApps({ deviceId: device.deviceId, from, to, skip, limit }),
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: false,
  });

  const rows = useMemo(() => Array.isArray(q.data?.items) ? q.data!.items : [], [q.data]);
  const total = Number(q.data?.meta?.total ?? rows.length);

  return (
    <Modal open={open} onClose={onClose} title={`Apps · ${device?.name || device?.username || "Unassigned"} — ${device?.deviceId || ""}`}
      widthClass="max-w-none w-screen sm:w-[98vw] h-[90vh]">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div>
          <label className="block text-[12px] text-slate-500 mb-1">From (optional)</label>
          <input type="date" className="border rounded-md px-3 py-2 text-sm" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="block text-[12px] text-slate-500 mb-1">To (optional)</label>
          <input type="date" className="border rounded-md px-3 py-2 text-sm" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div>
          <label className="block text-[12px] text-slate-500 mb-1">Limit</label>
          <select className="border rounded-md px-3 py-2 text-sm" value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
            {[50, 100, 200, 500].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="ml-auto text-sm text-slate-500">{q.isFetching ? "Loading…" : `Total: ${total}`}</div>
      </div>

      <div className="rounded-xl border bg-white overflow-hidden">
        <div className="max-h-[60vh] overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 border-b">
              <tr>
                <th className="text-left font-medium px-3 py-2">App</th>
                <th className="text-left font-medium px-3 py-2">Active</th>
                <th className="text-left font-medium px-3 py-2">Idle</th>
                <th className="text-left font-medium px-3 py-2">Launches</th>
              </tr>
            </thead>
            <tbody>
              {q.isLoading ? (
                <tr><td colSpan={4} className="px-3 py-6"><div className="flex items-center gap-2 text-slate-600"><Spinner /> Loading apps…</div></td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={4} className="px-3 py-6 text-slate-500">No data for this range.</td></tr>
              ) : (
                rows.map((r) => {
                  const app = r.app || r.name || r._id || "—";
                  const active = r.activeSeconds ?? r.active ?? 0;
                  const idle = r.idleSeconds ?? r.idle ?? 0;
                  const launches = r.launches ?? r.count ?? r.occurrences ?? 0;
                  return (
                    <tr key={String(r._id ?? app)} className="border-b last:border-0">
                      <td className="px-3 py-2">{app}</td>
                      <td className="px-3 py-2">{fmtHMS(active)}</td>
                      <td className="px-3 py-2">{fmtHMS(idle)}</td>
                      <td className="px-3 py-2">{launches}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-3 py-2 border-t bg-slate-50">
          <button className="text-sm px-3 py-1 rounded-md border bg-white hover:bg-slate-50" onClick={() => setSkip(Math.max(0, skip - limit))} disabled={skip === 0 || q.isFetching}>Prev</button>
          <div className="text-xs text-slate-600">Showing {total === 0 ? 0 : skip + 1}–{Math.min(skip + limit, total)} of {total}</div>
          <button className="text-sm px-3 py-1 rounded-md border bg-white hover:bg-slate-50" onClick={() => setSkip(skip + limit)} disabled={skip + limit >= total || q.isFetching}>Next</button>
        </div>
      </div>
    </Modal>
  );
}
