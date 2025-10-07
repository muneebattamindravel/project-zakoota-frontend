// DevicesPage.tsx
// --------------------------------------
// ✅ Integrated with utils/status.ts
// ✅ 12-hour clock for Last Seen
// ✅ Uses centralized getDeviceStatuses()
// ✅ Manual refresh only
// ✅ Commands History modal
// ✅ Delete confirmation popup
// ✅ Built-in SVG refresh icon (no lucide dependency)

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listDevices,
  assignDevice,
  deleteAllDevices,
  getUserConfig,
  listCommands,
  createCommand,
} from '../utils/api';
import type { Device } from '../utils/types';
import { Badge, Modal, Spinner, Toasts, useToasts } from '../components/ui';
import LoadingButton from '../components/ui/LoadingButton';
import { getDeviceStatuses } from '../utils/status';

// Simple SVG refresh icon (no dependency)
const RefreshIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 4v6h6M20 20v-6h-6M5 19A9 9 0 0119 5l1 1"
    />
  </svg>
);

// Format datetime to 12-hour clock
function fmt(dt?: string | number | Date) {
  if (!dt) return '—';
  try {
    const d = new Date(dt);
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  } catch {
    return '—';
  }
}

/* --------------------------- Device Card --------------------------- */
function DeviceCard({
  device,
  clientDelay,
  serviceDelay,
  onToast,
  refetchDevices,
}: {
  device: Device;
  clientDelay: number | null;
  serviceDelay: number | null;
  onToast: ReturnType<typeof useToasts>['push'];
  refetchDevices: () => void;
}) {
  const qc = useQueryClient();

  const [openAssign, setOpenAssign] = useState(false);
  const [openCmd, setOpenCmd] = useState(false);
  const [openHistory, setOpenHistory] = useState(false);

  const [username, setUsername] = useState(device.username ?? '');
  const [name, setName] = useState(device.name ?? '');
  const [designation, setDesignation] = useState(device.designation ?? '');
  const [profileURL, setProfileURL] = useState(device.profileURL ?? '');

  const [target, setTarget] = useState<'client' | 'service'>('client');
  const [cmdType, setCmdType] = useState('hide');
  const [payload, setPayload] = useState(
    '{"message":"Hello from server 🎯"}'
  );

  // Mutations
  const assignM = useMutation({
    mutationFn: () =>
      assignDevice(device.deviceId, {
        username: username || undefined,
        name: name || undefined,
        designation: designation || undefined,
        profileURL: profileURL || undefined,
      }),
    onSuccess: () => {
      onToast({ tone: 'success', title: 'Device updated' });
      setOpenAssign(false);
      qc.invalidateQueries({ queryKey: ['devices'] });
    },
    onError: (e: any) =>
      onToast({
        tone: 'error',
        title: 'Update failed',
        desc: e?.message || 'Try again',
      }),
  });

  const sendM = useMutation({
    mutationFn: async () => {
      let body: any;
      try {
        body = payload ? JSON.parse(payload) : {};
      } catch (e: any) {
        throw new Error(`Invalid JSON: ${e.message}`);
      }
      return createCommand({
        deviceId: device.deviceId,
        target,
        type: cmdType,
        payload: body,
      });
    },
    onSuccess: () => {
      onToast({ tone: 'success', title: 'Command sent' });
      setOpenCmd(false);
    },
    onError: (e: any) =>
      onToast({
        tone: 'error',
        title: 'Send failed',
        desc: e?.message || 'Try again',
      }),
  });

  const historyQ = useQuery({
    enabled: openHistory,
    queryKey: ['commands-history', device.deviceId],
    queryFn: () =>
      listCommands({ deviceId: device.deviceId, limit: 20, sort: 'desc' }),
  });
  
  const history = Array.isArray(historyQ.data?.items)
    ? historyQ.data.items
    : [];

  // Use centralized status util
  const { clientStatus, serviceStatus } = getDeviceStatuses(
    device.lastClientHeartbeat,
    device.lastServiceHeartbeat,
    (clientDelay ?? 60000) / 1000,
    (serviceDelay ?? 60000) / 1000
  );

  const lastSeen =
    device.lastSeen || device.lastClientHeartbeat || device.lastServiceHeartbeat;

  return (
    <div className="device-card w-full rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow transition-shadow relative">
      {/* Refresh icon per device */}
      <button
        className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"
        onClick={refetchDevices}
        title="Refresh"
      >
        <RefreshIcon />
      </button>

      {/* Header */}
      <div className="flex items-center gap-4 p-5 border-b">
        {device.profileURL ? (
          <img
            src={device.profileURL}
            className="h-12 w-12 rounded-full object-cover"
            alt=""
          />
        ) : (
          <div className="h-12 w-12 rounded-full bg-indigo-500 text-white flex items-center justify-center font-medium">
            {(device.name ?? device.username ?? 'U').slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-lg font-semibold text-slate-900 truncate">
            {device.name ?? device.username ?? 'Unassigned'}
          </div>
          <div className="text-slate-500 text-sm truncate">
            {device.designation ?? '-'}
          </div>
          <div className="text-xs text-slate-500 font-mono truncate">
            {device.deviceId}
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="p-5 space-y-4">
        <div className="flex flex-wrap justify-between gap-3 text-sm text-slate-700">
          <div className="space-y-1">
            <div>
              Client:{' '}
              <Badge tone={clientStatus === 'online' ? 'green' : 'red'}>
                {clientStatus}
              </Badge>
            </div>
            <div>
              Service:{' '}
              <Badge tone={serviceStatus === 'online' ? 'green' : 'red'}>
                {serviceStatus}
              </Badge>
            </div>
          </div>
          <div className="text-xs text-slate-500">
            Last Seen
            <br />
            {fmt(lastSeen)}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-2">
          <LoadingButton
            className="bg-slate-100 text-slate-800 hover:bg-slate-200"
            onClick={() => setOpenAssign(true)}
          >
            Assign
          </LoadingButton>
          <LoadingButton
            className="bg-indigo-600 text-white hover:bg-indigo-700"
            onClick={() => setOpenCmd(true)}
          >
            Send Command
          </LoadingButton>
          <LoadingButton
            className="bg-white border text-slate-800 hover:bg-slate-50"
            onClick={() => setOpenHistory(true)}
          >
            Commands History
          </LoadingButton>
        </div>
      </div>

      {/* Modals */}
      <Modal
        open={openAssign}
        onClose={() => setOpenAssign(false)}
        title="Assign Device"
      >
        <div className="grid gap-3">
          <input
            className="border rounded-md px-3 py-2"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
          />
          <input
            className="border rounded-md px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full Name"
          />
          <input
            className="border rounded-md px-3 py-2"
            value={designation}
            onChange={(e) => setDesignation(e.target.value)}
            placeholder="Designation"
          />
          <input
            className="border rounded-md px-3 py-2"
            value={profileURL}
            onChange={(e) => setProfileURL(e.target.value)}
            placeholder="Profile Image URL"
          />
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <LoadingButton
            className="bg-white border text-slate-700 hover:bg-slate-50"
            onClick={() => setOpenAssign(false)}
          >
            Cancel
          </LoadingButton>
          <LoadingButton
            className="bg-indigo-600 text-white hover:bg-indigo-700"
            pending={assignM.isPending}
            pendingText="Saving…"
            onClick={() => assignM.mutate()}
          >
            Save
          </LoadingButton>
        </div>
      </Modal>

      <Modal
        open={openHistory}
        onClose={() => setOpenHistory(false)}
        title={`Commands History – ${device.deviceId}`}
        widthClass="w-[800px]"
      >
        {historyQ.isLoading ? (
          <div className="flex items-center gap-2 text-slate-600">
            <Spinner /> Loading history…
          </div>
        ) : history.length === 0 ? (
          <div className="text-slate-500">No commands yet.</div>
        ) : (
          <div className="table-wrap max-h-[400px] overflow-y-auto">
            <table className="table text-sm">
              <thead>
                <tr>
                  <th>Target</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Ack</th>
                  <th>Completed</th>
                </tr>
              </thead>
              <tbody>
                {history.map((c: any) => (
                  <tr key={c._id}>
                    <td>{c.target}</td>
                    <td>{c.type}</td>
                    <td>
                      <Badge
                        tone={
                          c.status === 'completed'
                            ? 'green'
                            : c.status === 'acknowledged'
                            ? 'amber'
                            : 'gray'
                        }
                      >
                        {c.status}
                      </Badge>
                    </td>
                    <td>{fmt(c.createdAt)}</td>
                    <td>{fmt(c.acknowledgedAt)}</td>
                    <td>{fmt(c.completedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      <Modal
        open={openCmd}
        onClose={() => setOpenCmd(false)}
        title={`Send Command to ${device.deviceId}`}
      >
        <div className="grid gap-3">
          <select
            className="border rounded-md px-3 py-2"
            value={target}
            onChange={(e) =>
              setTarget(e.target.value as 'client' | 'service')
            }
          >
            <option value="client">client</option>
            <option value="service">service</option>
          </select>
          <input
            className="border rounded-md px-3 py-2"
            value={cmdType}
            onChange={(e) => setCmdType(e.target.value)}
            placeholder="Command type"
          />
          <textarea
            className="border rounded-md px-3 py-2 font-mono h-32"
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <LoadingButton
            className="bg-white border text-slate-700 hover:bg-slate-50"
            onClick={() => setOpenCmd(false)}
          >
            Cancel
          </LoadingButton>
          <LoadingButton
            className="bg-indigo-600 text-white hover:bg-indigo-700"
            pending={sendM.isPending}
            pendingText="Sending…"
            onClick={() => sendM.mutate()}
          >
            Send
          </LoadingButton>
        </div>
      </Modal>
    </div>
  );
}

/* --------------------------- Main Devices Page --------------------------- */
export default function DevicesPage() {
  const qc = useQueryClient();
  const { toasts, push, remove } = useToasts();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const devicesQ = useQuery({
    queryKey: ['devices'],
    queryFn: listDevices,
    refetchOnWindowFocus: false,
  });

  const configQ = useQuery({
    queryKey: ['config'],
    queryFn: () => getUserConfig('DASHBOARD'),
  });

  const delAll = useMutation({
    mutationFn: deleteAllDevices,
    onSuccess: () => {
      push({ tone: 'success', title: 'All devices deleted' });
      setConfirmOpen(false);
      qc.invalidateQueries({ queryKey: ['devices'] });
    },
    onError: (e: any) =>
      push({
        tone: 'error',
        title: 'Delete failed',
        desc: e?.message || '',
      }),
  });

  const refetchDevices = () =>
    qc.invalidateQueries({ queryKey: ['devices'] });

  const devices: Device[] = Array.isArray(devicesQ.data)
    ? devicesQ.data
    : devicesQ.data?.devices ?? [];

  const clientDelay = configQ.data?.clientHeartbeatDelay ?? 60000;
  const serviceDelay = configQ.data?.serviceHeartbeatDelay ?? 60000;

  return (
    <div className="container main-wrap space-y-6">
      <Toasts items={toasts} onClose={remove} />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">
          Device Dashboard
        </h1>
        <div className="flex gap-2 flex-wrap">
          <LoadingButton
            className="bg-white border text-slate-700 hover:bg-slate-50"
            pending={devicesQ.isFetching}
            pendingText="Refreshing…"
            onClick={refetchDevices}
          >
            Refresh All
          </LoadingButton>
          <LoadingButton
            className="bg-rose-600 hover:bg-rose-700 text-white"
            onClick={() => setConfirmOpen(true)}
          >
            Delete All
          </LoadingButton>
        </div>
      </div>

      {devicesQ.isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 flex items-center gap-3 text-slate-600">
          <Spinner /> Loading devices…
        </div>
      ) : devices.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-600">
          No devices yet.
        </div>
      ) : (
        <div className="cards-grid">
          {devices.map((d) => (
            <DeviceCard
              key={d.deviceId}
              device={d}
              clientDelay={clientDelay}
              serviceDelay={serviceDelay}
              onToast={push}
              refetchDevices={refetchDevices}
            />
          ))}
        </div>
      )}

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirm Deletion"
      >
        <p className="text-slate-700 mb-4">
          Are you sure you want to delete all devices? This action cannot be
          undone.
        </p>
        <div className="flex justify-end gap-2">
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
