import { useState, useMemo } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  getDevicesOptimized,
  deleteAllDevices,
  getUserConfig,
} from "../utils/api";
import type { Device } from "../utils/types";
import { Toasts, useToasts, Spinner, Modal } from "../components/ui";
import LoadingButton from "../components/ui/LoadingButton";
import { Search } from "lucide-react";
import DeviceCard from "../components/device/DeviceCard";
import DeviceSummaryBar from "../components/device/DeviceSummaryBar";

// Helpers
function getTodayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`; // YYYY-MM-DD
}

function formatDateForHeader(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTimeForHeader(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Extract activity stats from a device for filtering/sorting
function getActivityStats(d: Device) {
  const active = Number(d.activityToday?.activeSeconds ?? 0);
  const idle = Number(d.activityToday?.idleSeconds ?? 0);
  const total = active + idle;
  const activePct = total > 0 ? active / total : 0;
  return { active, idle, total, activePct };
}

type StatusFilter = "all" | "online" | "offline";
type ActivityFilter = "all" | "withActivity" | "noActivity";
type SortMode =
  | "smart"
  | "totalDesc"
  | "activeDesc"
  | "activePctDesc"
  | "idleDesc";

export default function DevicesPage() {
  const qc = useQueryClient();
  const { toasts, push, remove } = useToasts();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [activityFilter, setActivityFilter] =
    useState<ActivityFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("smart");

  // Selected calendar date (YYYY-MM-DD), default = today
  const [selectedDate, setSelectedDate] = useState<string>(() => getTodayIso());
  const todayIso = useMemo(() => getTodayIso(), []);
  const isTodaySelected = selectedDate === todayIso;
  const selectedDateObj = useMemo(
    () => new Date(`${selectedDate}T00:00:00`),
    [selectedDate]
  );
  const selectedDateLabel = useMemo(
    () => formatDateForHeader(selectedDateObj),
    [selectedDateObj]
  );

  // Config (for refresh interval)
  const configQ = useQuery({
    queryKey: ["config"],
    queryFn: () => getUserConfig("DASHBOARD"),
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });

  // Devices (optimized) for selected day
  const devicesQ = useQuery({
    queryKey: ["devices-optimized", selectedDate],
    queryFn: () => getDevicesOptimized(selectedDate),
    refetchInterval: () => {
      const delaySec = configQ.data?.clientHeartbeatDelay ?? 60;
      return delaySec * 1000;
    },
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: false,
    staleTime: 15_000,
  });

  const devices: Device[] = Array.isArray(devicesQ.data) ? devicesQ.data : [];

  // Manual refresh
  const refetchDevices = async () => {
    await qc.invalidateQueries({ queryKey: ["devices-optimized", selectedDate] });
  };

  // Delete all devices
  const delAll = useMutation({
    mutationFn: deleteAllDevices,
    onSuccess: () => {
      push({ tone: "success", title: "All devices deleted" });
      setConfirmOpen(false);
      qc.invalidateQueries({ queryKey: ["devices-optimized", selectedDate] });
    },
    onError: (e: any) =>
      push({ tone: "error", title: "Delete failed", desc: e?.message }),
  });

  const filteredDevices = useMemo(() => {
    const q = search.toLowerCase();

    const result = devices.filter((d) => {
      const stats = getActivityStats(d);

      // Search filter
      const matchesSearch =
        !q ||
        d.deviceId?.toLowerCase().includes(q) ||
        d.username?.toLowerCase().includes(q) ||
        d.name?.toLowerCase().includes(q);

      // Status filter
      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "online"
          ? d.clientStatus === "online"
          : d.clientStatus === "offline";

      // Activity filter
      const matchesActivity =
        activityFilter === "all"
          ? true
          : activityFilter === "withActivity"
          ? stats.total > 0
          : stats.total === 0;

      return matchesSearch && matchesStatus && matchesActivity;
    });

    // Sorting
    const smartAlpha = (a: Device, b: Device) => {
      const aLabel = (a.name || a.username || a.deviceId || "").toLowerCase();
      const bLabel = (b.name || b.username || b.deviceId || "").toLowerCase();
      return aLabel.localeCompare(bLabel);
    };

    result.sort((a, b) => {
      const statsA = getActivityStats(a);
      const statsB = getActivityStats(b);

      switch (sortMode) {
        case "totalDesc": {
          if (statsA.total !== statsB.total) {
            return statsB.total - statsA.total;
          }
          return smartAlpha(a, b);
        }
        case "activeDesc": {
          if (statsA.active !== statsB.active) {
            return statsB.active - statsA.active;
          }
          return smartAlpha(a, b);
        }
        case "activePctDesc": {
          if (statsA.activePct !== statsB.activePct) {
            return statsB.activePct - statsA.activePct;
          }
          return smartAlpha(a, b);
        }
        case "idleDesc": {
          if (statsA.idle !== statsB.idle) {
            return statsB.idle - statsA.idle;
          }
          return smartAlpha(a, b);
        }
        case "smart":
        default: {
          const aOnline = a.clientStatus === "online";
          const bOnline = b.clientStatus === "online";
          if (aOnline !== bOnline) {
            return aOnline ? -1 : 1; // online first
          }
          return smartAlpha(a, b);
        }
      }
    });

    return result;
  }, [devices, search, statusFilter, activityFilter, sortMode]);

  const lastUpdatedAt = devicesQ.dataUpdatedAt
    ? new Date(devicesQ.dataUpdatedAt)
    : null;

  const hasActiveFilters =
    search.trim().length > 0 ||
    statusFilter !== "all" ||
    activityFilter !== "all" ||
    sortMode !== "smart";

  const handleResetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setActivityFilter("all");
    setSortMode("smart");
  };

  return (
    <div className="container main-wrap space-y-6">
      <Toasts items={toasts} onClose={remove} />

      {/* TOP HERO SECTION */}
      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm p-4 md:p-5 space-y-4">
        {/* Title + controls row */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Left: title + date info */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-semibold text-slate-900">
                Device Dashboard
              </h1>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                  isTodaySelected
                    ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                    : "bg-slate-50 text-slate-700 ring-1 ring-slate-200"
                }`}
              >
                {isTodaySelected ? "Today" : "Historic view"}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Selected date · {selectedDateLabel}
              {lastUpdatedAt && (
                <span className="ml-2">
                  · Last updated at {formatTimeForHeader(lastUpdatedAt)}
                </span>
              )}
            </p>
          </div>

          {/* Right: date pill + actions */}
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            {/* Date pill */}
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
              <span className="text-[11px] uppercase tracking-wide text-slate-500">
                Date
              </span>
              <input
                type="date"
                className="bg-transparent border-0 text-sm text-slate-900 focus:outline-none focus:ring-0 cursor-pointer"
                value={selectedDate}
                max={todayIso}
                onChange={(e) =>
                  setSelectedDate(e.target.value || todayIso)
                }
                title="Select date to view activity"
              />
            </div>

            <LoadingButton
              className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
              pending={devicesQ.isFetching}
              pendingText="Refreshing..."
              onClick={() => refetchDevices()}
            >
              Refresh All
            </LoadingButton>
            <LoadingButton
              className="bg-rose-600 hover:bg-rose-700 text-white"
              pending={delAll.isPending}
              pendingText="Deleting..."
              onClick={() => setConfirmOpen(true)}
            >
              Delete All
            </LoadingButton>
          </div>
        </div>

        {/* Summary row lives inside hero card now */}
        {devices?.length > 0 && (
          <div className="pt-1">
            <DeviceSummaryBar devices={devices} />
          </div>
        )}
      </section>

      {/* FILTERS & SORTING CARD */}
      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm p-4 md:p-5 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Filters &amp; Sorting
            </h2>
            <p className="text-[11px] text-slate-500">
              Quickly surface key devices based on activity and status.
            </p>
          </div>

          <button
            type="button"
            onClick={handleResetFilters}
            disabled={!hasActiveFilters}
            className={`text-[11px] font-medium inline-flex items-center gap-1 px-3 py-1.5 rounded-full border ${
              hasActiveFilters
                ? "border-slate-300 text-slate-700 hover:bg-slate-50"
                : "border-slate-100 text-slate-300 cursor-default"
            }`}
          >
            <span>Reset filters</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
          {/* Search */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                className="border rounded-xl pl-8 pr-3 py-2.5 text-sm w-full bg-slate-50 focus:bg-white focus:border-slate-300"
                placeholder="Device ID, name, or username"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Status filter */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Status
            </label>
            <select
              className="border rounded-xl px-3 py-2.5 text-sm w-full bg-slate-50 focus:bg-white focus:border-slate-300"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as StatusFilter)
              }
            >
              <option value="all">All statuses</option>
              <option value="online">Online only</option>
              <option value="offline">Offline only</option>
            </select>
          </div>

          {/* Activity filter */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Activity
            </label>
            <select
              className="border rounded-xl px-3 py-2.5 text-sm w-full bg-slate-50 focus:bg-white focus:border-slate-300"
              value={activityFilter}
              onChange={(e) =>
                setActivityFilter(e.target.value as ActivityFilter)
              }
            >
              <option value="all">All devices</option>
              <option value="withActivity">With activity today</option>
              <option value="noActivity">No activity today</option>
            </select>
          </div>

          {/* Sort by */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Sort by
            </label>
            <select
              className="border rounded-xl px-3 py-2.5 text-sm w-full bg-slate-50 focus:bg-white focus:border-slate-300"
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
            >
              <option value="smart">Smart (online first, A–Z)</option>
              <option value="totalDesc">Most total time</option>
              <option value="activeDesc">Most active time</option>
              <option value="activePctDesc">Highest active %</option>
              <option value="idleDesc">Most idle time</option>
            </select>
          </div>
        </div>
      </section>

      {/* DEVICES GRID */}
      {devicesQ.isLoading ? (
        <div className="rounded-xl border bg-white p-6 flex items-center gap-3 text-slate-600">
          <Spinner /> Loading devices...
        </div>
      ) : devicesQ.isError ? (
        <div className="rounded-xl border bg-white p-6 text-rose-600">
          Failed to load devices.
        </div>
      ) : filteredDevices.length === 0 ? (
        <div className="rounded-xl border bg-white p-6 text-slate-600">
          No devices match your filters.
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredDevices.map((d) => (
            <DeviceCard
              key={d.deviceId}
              device={d}
              onToast={push}
              refetchDevices={refetchDevices}
              summary={d.commandsSummary}
              summariesLoading={devicesQ.isFetching}
            />
          ))}
        </div>
      )}

      {/* CONFIRM DELETE-ALL MODAL */}
      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Delete all devices?"
      >
        <p className="text-slate-600">
          This will remove <b>all</b> devices from the system. This action
          cannot be undone.
        </p>
        <div className="flex justify-end gap-2 mt-4">
          <LoadingButton
            className="bg-white border text-slate-700 hover:bg-slate-50"
            onClick={() => setConfirmOpen(false)}
          >
            Cancel
          </LoadingButton>
          <LoadingButton
            className="bg-rose-600 hover:bg-rose-700 text-white"
            pending={delAll.isPending}
            pendingText="Deleting..."
            onClick={() => delAll.mutate()}
          >
            Delete All
          </LoadingButton>
        </div>
      </Modal>
    </div>
  );
}
