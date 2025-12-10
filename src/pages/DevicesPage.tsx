import { useState, useMemo } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  getDevicesOptimized, // returns presence + commandsSummary + activityToday (today window handled on backend)
  deleteAllDevices,
  getUserConfig,
} from "../utils/api";
import type { Device } from "../utils/types";
import { Toasts, useToasts, Spinner, Modal } from "../components/ui";
import LoadingButton from "../components/ui/LoadingButton";
import { Search } from "lucide-react";
import DeviceCard from "../components/device/DeviceCard";
import DeviceSummaryBar from "../components/device/DeviceSummaryBar";

// Helpers just for pretty header formatting
function formatDateForHeader(date: Date) {
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTimeForHeader(date: Date) {
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DevicesPage() {
  const qc = useQueryClient();
  const { toasts, push, remove } = useToasts();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<"all" | "online" | "offline">("all");

  // ✅ Fetch latest config for refresh intervals
  const configQ = useQuery({
    queryKey: ["config"],
    queryFn: () => getUserConfig("DASHBOARD"),
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });

  const clientDelay = configQ.data?.clientHeartbeatDelay ?? 60; // seconds
  const refreshInterval = clientDelay * 1000; // ms

  // ✅ Devices (optimized): includes presence, lastSeen, commandsSummary, activityToday
  const devicesQ = useQuery({
    queryKey: ["devices-optimized"],
    queryFn: getDevicesOptimized,
    refetchInterval: refreshInterval,
    refetchOnWindowFocus: false,
    staleTime: 15_000,
  });

  const devices: Device[] = Array.isArray(devicesQ.data) ? devicesQ.data : [];

  // ✅ Manual refresh logic
  const refetchDevices = async () => {
    await qc.invalidateQueries({ queryKey: ["devices-optimized"] });
  };

  // ✅ Delete all devices mutation
  const delAll = useMutation({
    mutationFn: deleteAllDevices,
    onSuccess: () => {
      push({ tone: "success", title: "All devices deleted" });
      setConfirmOpen(false);
      qc.invalidateQueries({ queryKey: ["devices-optimized"] });
    },
    onError: (e: any) =>
      push({ tone: "error", title: "Delete failed", desc: e?.message }),
  });

  const filteredDevices = useMemo(() => {
    // 1) Filter by search + status
    const result = devices.filter((d) => {
      const matchesSearch =
        !search ||
        d.deviceId?.toLowerCase().includes(search.toLowerCase()) ||
        d.username?.toLowerCase().includes(search.toLowerCase()) ||
        d.name?.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "online"
            ? d.clientStatus === "online"
            : d.clientStatus === "offline";

      return matchesSearch && matchesStatus;
    });

    // 2) Sort: online devices first, then alphabetically by name / deviceId
    result.sort((a, b) => {
      const aOnline = a.clientStatus === "online";
      const bOnline = b.clientStatus === "online";

      if (aOnline !== bOnline) {
        return aOnline ? -1 : 1; // online first
      }

      const aLabel = (a.name || a.username || a.deviceId || "").toLowerCase();
      const bLabel = (b.name || b.username || b.deviceId || "").toLowerCase();

      return aLabel.localeCompare(bLabel);
    });

    return result;
  }, [devices, search, statusFilter]);


  // ℹ️ "Today" is defined on the backend via ACTIVITY_TZ_OFFSET_MINUTES.
  // Here we just show the local calendar date for clarity.
  const today = useMemo(() => new Date(), []);
  const todayLabel = useMemo(() => formatDateForHeader(today), [today]);

  const lastUpdatedAt = devicesQ.dataUpdatedAt
    ? new Date(devicesQ.dataUpdatedAt)
    : null;

  return (
    <div className="container main-wrap space-y-5">
      <Toasts items={toasts} onClose={remove} />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-slate-900">
            Device Dashboard
          </h1>
          <p className="text-xs text-slate-500">
            Today · {todayLabel}
            {lastUpdatedAt && (
              <span className="ml-2">
                · Last updated at {formatTimeForHeader(lastUpdatedAt)}
              </span>
            )}
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <LoadingButton
            className="bg-white border text-slate-700 hover:bg-slate-50"
            pending={devicesQ.isFetching}
            pendingText="Refreshing…"
            onClick={() => refetchDevices()}
          >
            Refresh All
          </LoadingButton>
          <LoadingButton
            className="bg-rose-600 hover:bg-rose-700 text-white"
            onClick={() => setConfirmOpen(true)}
            pending={delAll.isPending}
          >
            Delete All
          </LoadingButton>
        </div>
      </div>

      {/* 📊 Summary Bar – uses activityToday from /devices/list-optimized */}
      {devices?.length > 0 && <DeviceSummaryBar devices={devices} />}

      {/* 🔍 Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            className="border rounded-md pl-8 pr-3 py-2 text-sm w-60"
            placeholder="Search by name or ID."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="border rounded-md px-3 py-2 text-sm"
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as "all" | "online" | "offline")
          }
        >
          <option value="all">All Statuses</option>
          <option value="online">Online</option>
          <option value="offline">Offline</option>
        </select>
      </div>

      {/* 🧩 Devices Grid */}
      {devicesQ.isLoading ? (
        <div className="rounded-xl border bg-white p-6 flex items-center gap-3 text-slate-600">
          <Spinner /> Loading devices…
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
              summary={d.commandsSummary} // from /devices/list-optimized
              summariesLoading={devicesQ.isFetching}
            />
          ))}
        </div>
      )}

      {/* ✅ Confirm Delete All */}
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
            pendingText="Deleting…"
            onClick={() => delAll.mutate()}
          >
            Delete All
          </LoadingButton>
        </div>
      </Modal>
    </div>
  );
}

