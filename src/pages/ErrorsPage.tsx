import { useQuery } from '@tanstack/react-query';
import { listErrors } from '../utils/api';
import { Spinner } from '../components/ui';

type DeviceError = {
  deviceId: string;
  errorType: string;
  message: string;
  createdAt: string;
};

export default function ErrorsPage() {
  const q = useQuery({
    queryKey: ['errors'],
    queryFn: () => listErrors(),
    refetchOnWindowFocus: false,
  });

  const errors: DeviceError[] = q.data?.items ?? [];

  // Basic analytics
  const totalErrors = errors.length;
  const uniqueDevices = new Set(errors.map((e) => e.deviceId)).size;

  const latestError = errors.reduce<DeviceError | null>((latest, curr) => {
    if (!latest) return curr;
    return new Date(curr.createdAt) > new Date(latest.createdAt)
      ? curr
      : latest;
  }, null);

  const mostCommonType = (() => {
    if (!errors.length) return null;
    const freq: Record<string, number> = {};
    for (const e of errors) {
      freq[e.errorType] = (freq[e.errorType] || 0) + 1;
    }
    let maxType: string | null = null;
    let maxCount = 0;
    for (const [type, count] of Object.entries(freq)) {
      if (count > maxCount) {
        maxCount = count;
        maxType = type;
      }
    }
    return maxType ? { type: maxType, count: maxCount } : null;
  })();

  return (
    <div className="container main-wrap space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Device Errors
          </h1>
          <p className="text-xs text-slate-500">
            Centralized view of client / service errors reported by matrixFlow
            devices.
          </p>
        </div>
      </div>

      {/* Summary */}
      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm p-4 md:p-5">
        {q.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Spinner /> Loading errors…
          </div>
        ) : q.error ? (
          <div className="text-sm text-rose-600">
            Error loading errors:{" "}
            {String((q.error as any)?.message ?? q.error)}
          </div>
        ) : errors.length === 0 ? (
          <div className="text-sm text-slate-500">
            No errors found. 🎉
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Total errors */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-2.5">
              <div className="text-[11px] font-medium text-slate-500">
                Total errors
              </div>
              <div className="mt-1 text-lg font-semibold text-slate-900">
                {totalErrors}
              </div>
              <div className="text-[11px] text-slate-500">
                Across all devices
              </div>
            </div>

            {/* Impacted devices */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-2.5">
              <div className="text-[11px] font-medium text-slate-500">
                Impacted devices
              </div>
              <div className="mt-1 text-lg font-semibold text-slate-900">
                {uniqueDevices}
              </div>
              <div className="text-[11px] text-slate-500">
                Unique device IDs with at least one error
              </div>
            </div>

            {/* Most common type */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-2.5">
              <div className="text-[11px] font-medium text-slate-500">
                Most common error type
              </div>
              {mostCommonType ? (
                <>
                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    {mostCommonType.type}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {mostCommonType.count} occurrences
                  </div>
                </>
              ) : (
                <div className="mt-1 text-[11px] text-slate-500">—</div>
              )}
            </div>

            {/* Latest error */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-2.5">
              <div className="text-[11px] font-medium text-slate-500">
                Latest error
              </div>
              {latestError ? (
                <>
                  <div className="mt-1 text-xs font-semibold text-slate-900 line-clamp-2">
                    {latestError.message}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    {latestError.deviceId} ·{" "}
                    {new Date(latestError.createdAt).toLocaleString()}
                  </div>
                </>
              ) : (
                <div className="mt-1 text-[11px] text-slate-500">—</div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Table */}
      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm p-4 md:p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-900">
            Error log
          </h2>
          <p className="text-[11px] text-slate-500">
            Most recent first
          </p>
        </div>
        <div className="overflow-auto">
          {q.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Spinner /> Loading errors…
            </div>
          ) : q.error ? (
            <div className="text-sm text-rose-600">
              Error loading errors:{" "}
              {String((q.error as any)?.message ?? q.error)}
            </div>
          ) : errors.length === 0 ? (
            <div className="text-sm text-slate-500">
              No errors found.
            </div>
          ) : (
            <table className="min-w-full text-xs sm:text-sm">
              <thead className="border-b bg-slate-50">
                <tr className="text-[11px] text-slate-600">
                  <th className="px-3 py-2 text-left">Time</th>
                  <th className="px-3 py-2 text-left">Device ID</th>
                  <th className="px-3 py-2 text-left">Type</th>
                  <th className="px-3 py-2 text-left">Message</th>
                </tr>
              </thead>
              <tbody>
                {errors
                  .slice()
                  .sort(
                    (a, b) =>
                      new Date(b.createdAt).getTime() -
                      new Date(a.createdAt).getTime()
                  )
                  .map((err, i) => (
                    <tr
                      key={i}
                      className="border-b last:border-0 align-top"
                    >
                      <td className="px-3 py-2 text-[11px] text-slate-500 whitespace-nowrap">
                        {new Date(err.createdAt).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 font-mono text-[11px] text-slate-700 whitespace-nowrap">
                        {err.deviceId}
                      </td>
                      <td className="px-3 py-2 text-[11px]">
                        <span className="inline-flex px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-100">
                          {err.errorType}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-800">
                        {err.message}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
