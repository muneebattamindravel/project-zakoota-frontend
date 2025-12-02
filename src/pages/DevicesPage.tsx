import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  listDevices,
  deleteAllDevices,
  getUserConfig,
  getCommandSummaries, // 👈 NEW: batch summaries API
} from "../utils/api";
import type { Device } from "../utils/types";
import { Toasts, useToasts, Spinner, Modal } from "../components/ui";
import LoadingButton from "../components/ui/LoadingButton";
import { Search } from "lucide-react";
import DeviceCard from "../components/device/DeviceCard";
import DeviceSummaryBar from "../components/device/DeviceSummaryBar";

export default function DevicesPage() {
  const qc = useQueryClient();
  const { toasts, push, remove } = useToasts();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "online" | "offline">("all");

  // ✅ Fetch latest config for refresh intervals
  const configQ = useQuery({
    queryKey: ["config"],
    queryFn: () => getUserConfig("DASHBOARD"),
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });

  const clientDelay = configQ.data?.clientHeartbeatDelay ?? 60; // seconds
  const refreshInterval = clientDelay * 1000; // ms

  // ✅ Devices query
  const devicesQ = useQuery({
    queryKey: ["devices"],
    queryFn: listDevices,
    refetchInterval: refreshInterval,
    refetchOnWindowFocus: false,
  });

  // ✅ Flatten data for easier access
  const devices: Device[] = Array.isArray(devicesQ.data)
    ? devicesQ.data
    : devicesQ.data?.devices ?? [];

  // ✅ Batch command summaries for all devices
  const deviceIds = useMemo(() => devices.map((d) => d.deviceId), [devices]);

  const summariesQ = useQuery({
    enabled: deviceIds.length > 0,
    queryKey: ["commands-summary-batch", deviceIds],
    queryFn: () => getCommandSummaries(deviceIds),
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });

  // ✅ Optional: keep legacy per-device invalidations harmless (no per-card queries now)
  useEffect(() => {
    if (!devicesQ.data) return;
    // When devices update, refresh the batch summaries too.
    qc.invalidateQueries({ queryKey: ["commands-summary-batch"] });
  }, [devicesQ.data, qc]);

  // ✅ Delete all devices mutation
  const delAll = useMutation({
    mutationFn: deleteAllDevices,
    onSuccess: () => {
      push({ tone: "success", title: "All devices deleted" });
      setConfirmOpen(false);
      qc.invalidateQueries({ queryKey: ["devices"] });
      qc.invalidateQueries({ queryKey: ["commands-summary-batch"] });
    },
    onError: (e: any) =>
      push({ tone: "error", title: "Delete failed", desc: e?.message }),
  });

  // ✅ Manual refresh logic
  const refetchDevices = async () => {
    await qc.invalidateQueries({ queryKey: ["devices"] });
    qc.invalidateQueries({ queryKey: ["commands-summary-batch"] });
  };

  // ✅ Filter logic (search + status)
  const filteredDevices = useMemo(() => {
    return devices.filter((d) => {
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
  }, [devices, search, statusFilter]);

  return (
    <div className="container main-wrap space-y-5">
      <Toasts items={toasts} onClose={remove} />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">
          Device Dashboard
        </h1>
        <div className="flex gap-2 flex-wrap">
          <LoadingButton
            className="bg-white border text-slate-700 hover:bg-slate-50"
            pending={devicesQ.isFetching || summariesQ.isFetching}
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

      {/* 📊 Summary Bar */}
      {devices?.length > 0 && <DeviceSummaryBar devices={devices} />}

      {/* 🔍 Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            className="border rounded-md pl-8 pr-3 py-2 text-sm w-60"
            placeholder="Search by name or ID..."
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
              summary={summariesQ.data?.[d.deviceId]} // 👈 batch summary map
              summariesLoading={summariesQ.isLoading}
            />
          ))}
        </div>
      )}

      {/* ✅ Confirm Delete All */}
      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Delete all devices?">
        <p className="text-slate-600">
          This will remove <b>all</b> devices from the system. This action cannot be undone.
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
