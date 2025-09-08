import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { listDevices, listLogs } from '../utils/api';
import type { Chunk } from '../utils/types';
import { fmtHMS, fmtDate, fmtTime12 } from '../utils/format';
import DeviceCombo from '../components/DeviceCombo';

function toLocalInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function LogsExplorerPage() {
  const now = new Date();
  const [deviceId, setDeviceId] = useState('');
  const [from, setFrom] = useState(toLocalInputValue(new Date(now.getTime() - 24 * 60 * 60 * 1000)));
  const [to, setTo] = useState(toLocalInputValue(now));
  const [limit, setLimit] = useState(50);
  const [skip, setSkip] = useState(0);
  const [show, setShow] = useState<null | Chunk>(null);

  const devicesQ = useQuery({ queryKey: ['devices'], queryFn: listDevices });
  useEffect(() => { setSkip(0); }, [deviceId, from, to, limit]);

  const q = useQuery({
    queryKey: ['logs', deviceId, from, to, limit, skip],
    enabled: !!deviceId,
    queryFn: () => listLogs({
      deviceId,
      from: new Date(from).toISOString(),
      to: new Date(to).toISOString(),
      limit,
      skip
    })
  });

  // const chunks: Chunk[] = q.data?.chunks ?? [];
  // const meta = q.data?.meta ?? { total: 0, limit, skip };
  // const options = (devicesQ.data ?? [] as any[]).map(d => ({
  //   value: d.deviceId,
  //   label: `${d.deviceId}${d.username ? ' — @' + d.username : ''}`,
  //   username: d.username
  // }));

  // add (or reuse your own) types:
  type Meta = { total: number; limit: number; skip: number };
  type DeviceRow = { deviceId: string; username?: string | null };

  // ✅ typed fallback for chunks
  const chunks: Chunk[] = (q.data?.chunks ?? ([] as Chunk[]));

  // ✅ typed fallback for meta
  const meta: Meta = q.data?.meta ?? ({ total: 0, limit, skip } as Meta);

  // ✅ type the array and the callback param so 'd' is not implicit any
  const options = ((devicesQ.data ?? []) as DeviceRow[]).map((d: DeviceRow) => ({
    value: d.deviceId,
    label: `${d.deviceId}${d.username ? ` — @${d.username}` : ''}`,
    username: d.username ?? undefined,
  }));

  return (
    <div className='space-y-4'>
      <h1 className='text-xl font-semibold'>Logs</h1>

      <div className='card'>
        <div className='card-body grid md:grid-cols-5 gap-3'>
          <div className='md:col-span-2'>
            <label className='block text-sm mb-1'>Device</label>
            <DeviceCombo options={options} value={deviceId} onChange={setDeviceId} />
          </div>
          <div>
            <label className='block text-sm mb-1'>From</label>
            <input type='datetime-local' value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div>
            <label className='block text-sm mb-1'>To</label>
            <input type='datetime-local' value={to} onChange={e => setTo(e.target.value)} />
          </div>
          <div>
            <label className='block text-sm mb-1'>Limit</label>
            <input type='number' value={limit} onChange={e => setLimit(parseInt(e.target.value || '50'))} />
          </div>
        </div>
      </div>

      <div className='card'>
        <div className='card-body'>
          {!deviceId ? 'Select a device to view logs.'
            : q.isLoading ? 'Loading...'
              : q.error ? <div className='text-red-600'>{String((q.error as any)?.message ?? q.error)}</div>
                : (
                  <div className='space-y-2'>
                    <div className='text-sm text-slate-600'>
                      Total: {meta.total} • Showing {chunks.length} • skip={meta.skip}
                    </div>

                    <div className='overflow-auto'>
                      <table className='text-xs'>
                        <thead>
                          <tr>
                            <th className='min-w-[140px]'>Start</th>
                            <th className='min-w-[140px]'>End</th>
                            <th className='min-w-[130px]'>Active</th>
                            <th className='min-w-[130px]'>Idle</th>
                            <th className='min-w-[220px]'>Mouse (move | scroll | click)</th>
                            <th className='min-w-[90px]'>Keys</th>
                            <th className='max-w-[460px]'>Top 3 Details</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {chunks.map((c, i) => {
                            const totals = {
                              active: c.activeTime ?? c.logTotals?.activeTime ?? 0,
                              idle: c.idleTime ?? c.logTotals?.idleTime ?? 0,
                              mm: c.mouseMovements ?? c.logTotals?.mouseMovements ?? 0,
                              ms: c.mouseScrolls ?? c.logTotals?.mouseScrolls ?? 0,
                              mc: c.mouseClicks ?? c.logTotals?.mouseClicks ?? 0,
                              keys: c.keysPressed ?? c.logTotals?.keysPressed ?? 0
                            };
                            const top3 = [...(c.logDetails ?? [])]
                              .map(d => ({ ...d, total: (d.activeTime || 0) + (d.idleTime || 0) }))
                              .sort((a, b) => b.total - a.total)
                              .slice(0, 3);

                            return (
                              <tr key={i}>
                                {/* Start */}
                                <td className='align-top'>
                                  <div className='font-medium'>{fmtDate(c.startAt)}</div>
                                  <div className='text-slate-500'>{fmtTime12(c.startAt)}</div>
                                </td>

                                {/* End */}
                                <td className='align-top'>
                                  <div className='font-medium'>{fmtDate(c.endAt)}</div>
                                  <div className='text-slate-500'>{fmtTime12(c.endAt)}</div>
                                </td>

                                {/* Active (green) */}
                                <td className='align-top text-green-600 font-semibold'>
                                  {fmtHMS(totals.active)}
                                </td>

                                {/* Idle (yellow) */}
                                <td className='align-top text-yellow-600 font-semibold'>
                                  {fmtHMS(totals.idle)}
                                </td>

                                {/* Mouse: "x movements | x scrolls | x clicks" with bold clicks */}
                                <td className='align-top'>
                                  <span>{totals.mm} movements</span>
                                  <span className='px-1'>|</span>
                                  <span>{totals.ms} scrolls</span>
                                  <span className='px-1'>|</span>
                                  <span><b>{totals.mc}</b> clicks</span>
                                </td>

                                {/* Keys (bold) */}
                                <td className='align-top font-semibold'>
                                  {totals.keys}
                                </td>

                                {/* Top 3 (slightly narrower) */}
                                <td className='align-top max-w-[460px]'>
                                  {top3.map((d, j) => (
                                    <div key={j} className='text-ellipsis overflow-hidden whitespace-nowrap'>
                                      <span className='font-semibold'>
                                        {d.appName ?? d.processName}
                                      </span>{' '}
                                      — {d.title ?? ''} · total {fmtHMS(d.total)}
                                    </div>
                                  ))}
                                </td>

                                <td className='text-right align-top'>
                                  <button className='btn-secondary' onClick={() => setShow(c)}>View</button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className='flex items-center gap-2'>
                      <button className='btn-secondary' onClick={() => setSkip(Math.max(0, meta.skip - meta.limit))}>Prev</button>
                      <button className='btn-secondary' onClick={() => setSkip(meta.skip + meta.limit)}>Next</button>
                    </div>
                  </div>
                )}
        </div>
      </div>

      {show && (
        <div className='fixed inset-0 bg-black/30 grid place-items-center p-4' onClick={() => setShow(null)}>
          <div className='bg-white rounded-xl border shadow-xl max-w-3xl w-full' onClick={e => e.stopPropagation()}>
            <div className='card-header'>
              Chunk Details — {fmtDate(show.startAt)} {fmtTime12(show.startAt)} → {fmtDate(show.endAt)} {fmtTime12(show.endAt)}
            </div>
            <div className='card-body space-y-2'>
              <div className='text-sm text-slate-600'>
                Totals: active <span className='text-green-600 font-semibold'>{fmtHMS(show.activeTime ?? show.logTotals?.activeTime ?? 0)}</span>{' '}
                • idle <span className='text-yellow-600 font-semibold'>{fmtHMS(show.idleTime ?? show.logTotals?.idleTime ?? 0)}</span>{' '}
                • keys <span className='font-semibold'>{show.keysPressed ?? show.logTotals?.keysPressed ?? 0}</span>
              </div>

              <div className='overflow-auto max-h-[420px]'>
                <table className='text-xs'>
                  <thead>
                    <tr>
                      <th>App</th>
                      <th>Title</th>
                      <th className='min-w-[130px]'>Active</th>
                      <th className='min-w-[130px]'>Idle</th>
                      <th>Mouse (move | scroll | click)</th>
                      <th>Keys</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(show.logDetails ?? []).map((d, i) => (
                      <tr key={i}>
                        <td>{d.appName ?? d.processName}</td>
                        <td className='max-w-[520px] whitespace-nowrap text-ellipsis overflow-hidden'>{d.title ?? ''}</td>
                        <td className='text-green-600 font-semibold'>{fmtHMS(d.activeTime)}</td>
                        <td className='text-yellow-600 font-semibold'>{fmtHMS(d.idleTime)}</td>
                        <td>{d.mouseMovements} movements | {d.mouseScrolls} scrolls | <b>{d.mouseClicks}</b> clicks</td>
                        <td className='font-semibold'>{d.keysPressed}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className='text-right'>
                <button className='btn' onClick={() => setShow(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
