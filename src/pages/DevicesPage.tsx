import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listDevices,
  assignDevice,
  deleteAllDevices,
  getUserConfig,
  // commands (ack-only flow)
  getPendingCommands,
  acknowledgeCommand,
} from '../utils/api';
import type { Device } from '../utils/types';
import {
  Badge,
  Modal,
  SectionCard,
  Spinner,
  Toasts,
  useToasts,
} from '../components/ui';
import LoadingButton from '../components/ui/LoadingButton';

type PendingCommand = {
  _id?: string;          // backend sometimes returns _id, sometimes id
  id?: string;
  deviceId: string;
  type: string;
  status?: string;       // may not exist; we’ll show “pending”
  createdAt?: string;
  payload?: any;
};

function cmdId(c: PendingCommand) {
  return c._id ?? c.id ?? '';
}

function fmt(dt?: string | number | Date) {
  if (!dt) return '—';
  try { return new Date(dt).toLocaleString(); } catch { return String(dt); }
}

function LabeledInput({
  label, value, onChange, placeholder,
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; }) {
  return (
    <div>
      <label className="block text-sm text-slate-700 mb-1">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
      />
    </div>
  );
}

function DeviceCard({
  device,
  clientDelay,
  serviceDelay,
  onToast,
}: {
  device: Device;
  clientDelay: number | null;
  serviceDelay: number | null;
  onToast: ReturnType<typeof useToasts>['push'];
}) {
  const qc = useQueryClient();

  // Assign modal
  const [openAssign, setOpenAssign] = useState(false);
  const [username, setUsername] = useState(device.username ?? '');
  const [userId, setUserId] = useState(device.userId ?? '');
  const [name, setName] = useState(device.name ?? '');
  const [designation, setDesignation] = useState(device.designation ?? '');
  const [profileURL, setProfileURL] = useState(device.profileURL ?? '');
  const [checkInTime, setCheckInTime] = useState(
    device.checkInTime ? new Date(device.checkInTime).toISOString().slice(0, 16) : ''
  );

  // Per-row loaders
  const [ackingId, setAckingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch pending commands only (no side-effects)
  const pendingQ = useQuery({
    queryKey: ['pending-commands', device.deviceId],
    queryFn: () => getPendingCommands(device.deviceId) as Promise<PendingCommand[]>,
  });

  const refetchPending = async () => {
    try { setRefreshing(true); await qc.invalidateQueries({ queryKey: ['pending-commands', device.deviceId] }); }
    finally { setRefreshing(false); }
  };

  const pendingList: PendingCommand[] = Array.isArray(pendingQ.data) ? pendingQ.data : [];
  const firstPending = useMemo(() => pendingList[0] ?? null, [pendingList]);

  // Assign mutation
  const assignM = useMutation({
    mutationFn: () => assignDevice(device.deviceId, {
      username: username || undefined,
      userId: userId || undefined,
      name: name || undefined,
      designation: designation || undefined,
      profileURL: profileURL || undefined,
      checkInTime: checkInTime || undefined,
    }),
    onSuccess: () => {
      onToast({ tone: 'success', title: 'Device updated' });
      setOpenAssign(false);
      qc.invalidateQueries({ queryKey: ['devices'] });
    },
    onError: (e: any) => onToast({ tone: 'error', title: 'Update failed', desc: e?.message || 'Try again' }),
  });

  const onAck = async (id: string) => {
    if (!id) return;
    try {
      setAckingId(id);
      await acknowledgeCommand(id);
      onToast({ tone: 'success', title: 'Acknowledged' });
      refetchPending();
    } catch (e: any) {
      onToast({ tone: 'error', title: 'Acknowledge failed', desc: e?.message || '' });
    } finally {
      setAckingId(null);
    }
  };

  // Status (delay-aware)
  const now = Date.now();
  let clientTone: 'green' | 'amber' | 'red' | 'gray' = 'gray';
  let serviceTone: 'green' | 'amber' | 'red' | 'gray' = 'gray';
  if (clientDelay) {
    const diff = device.lastClientHeartbeat ? now - new Date(device.lastClientHeartbeat).getTime() : Infinity;
    clientTone = diff < clientDelay * 1.2 ? 'green' : diff < clientDelay * 4 ? 'amber' : 'red';
  }
  if (serviceDelay) {
    const diff = device.lastServiceHeartbeat ? now - new Date(device.lastServiceHeartbeat).getTime() : Infinity;
    serviceTone = diff < serviceDelay * 1.2 ? 'green' : diff < serviceDelay * 4 ? 'amber' : 'red';
  }

  return (
    <div className="device-card w-full min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow transition-shadow">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 p-5 border-b">
        <div className="flex items-start gap-4 min-w-0">
          {device.profileURL ? (
            <img className="h-12 w-12 rounded-full object-cover" src={device.profileURL} alt="" />
          ) : (
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-200 to-indigo-400 text-white flex items-center justify-center">
              {(device.name ?? device.username ?? 'U').slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <div className="text-lg font-semibold text-slate-900 truncate">
              {device.name ?? device.username ?? 'Unassigned'}
            </div>
            <div className="text-slate-500 text-sm truncate">{device.designation ?? '-'}</div>
            <div className="text-xs text-slate-500 font-mono truncate break-words">{device.deviceId}</div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 md:shrink-0">
          <LoadingButton className="bg-slate-100 hover:bg-slate-200 text-slate-800" onClick={() => setOpenAssign(true)}>
            Assign
          </LoadingButton>
          {/* Send Command disabled since API not implemented */}
          <LoadingButton className="bg-indigo-600 text-white opacity-50 cursor-not-allowed" disabled>
            Send Command
          </LoadingButton>
          <LoadingButton
            className="bg-white border text-slate-700 hover:bg-slate-50"
            pending={refreshing}
            pendingText="Refreshing…"
            onClick={refetchPending}
          >
            Refresh
          </LoadingButton>
        </div>
      </div>

      {/* Body */}
      <div className="p-5 grid gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-4 lg:col-span-1">
          <SectionCard title="Status">
            <div className="flex flex-wrap gap-2">
              <Badge tone={clientTone}>Client {clientTone === 'green' ? 'Online' : clientTone === 'amber' ? 'Idle' : 'Offline'}</Badge>
              <Badge tone={serviceTone}>Service {serviceTone === 'green' ? 'Online' : serviceTone === 'amber' ? 'Idle' : 'Offline'}</Badge>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-slate-700">
              <div><div className="text-xs text-slate-500">Last Seen</div><div className="truncate">{fmt(device.lastSeen)}</div></div>
              <div><div className="text-xs text-slate-500">Type</div><div className="truncate">{device.type ?? '—'}</div></div>
            </div>
          </SectionCard>

          <SectionCard title="Command Summary (Ack-only)">
            <div className="space-y-2 text-sm text-slate-700">
              <div className="flex items-center justify-between gap-3">
                <div className="text-slate-500">Pending</div>
                <div className="truncate">
                  {firstPending ? `${firstPending.type} • ${fmt(firstPending.createdAt)}` : '—'}
                </div>
              </div>
            </div>
            {firstPending && (
              <div className="mt-3">
                <LoadingButton
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                  pending={ackingId === cmdId(firstPending)}
                  pendingText="Ack…"
                  onClick={() => onAck(cmdId(firstPending))}
                >
                  Acknowledge
                </LoadingButton>
              </div>
            )}
          </SectionCard>
        </div>

        {/* Right: Pending commands list (read-only, ack-able) */}
        <div className="lg:col-span-2">
          <SectionCard title="Pending Commands">
            {pendingQ.isLoading ? (
              <div className="flex items-center gap-2 text-slate-600"><Spinner /> Loading…</div>
            ) : pendingList.length === 0 ? (
              <div className="text-slate-500">No pending commands.</div>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Created</th>
                      <th className="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingList.map((c) => {
                      const id = cmdId(c);
                      return (
                        <tr key={id || `${c.type}-${c.createdAt || Math.random()}`}>
                          <td>{c.type}</td>
                          <td>{fmt(c.createdAt)}</td>
                          <td className="text-right">
                            <LoadingButton
                              className="border bg-white hover:bg-slate-50 text-slate-800"
                              pending={ackingId === id}
                              pendingText="Ack…"
                              onClick={() => onAck(id)}
                            >
                              Acknowledge
                            </LoadingButton>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </div>
      </div>

      {/* Assign Modal */}
      <Modal open={openAssign} onClose={() => setOpenAssign(false)} title="Assign Device" widthClass="w-[700px]">
        <div className="grid md:grid-cols-2 gap-4">
          <LabeledInput label="Username" value={username} onChange={setUsername} placeholder="username" />
          <LabeledInput label="User ID" value={userId} onChange={setUserId} placeholder="optional" />
          <LabeledInput label="Full Name" value={name} onChange={setName} placeholder="John Doe" />
          <LabeledInput label="Designation" value={designation} onChange={setDesignation} placeholder="Developer" />
          <LabeledInput label="Profile Image URL" value={profileURL} onChange={setProfileURL} placeholder="https://..." />
          <div>
            <label className="block text-sm text-slate-700 mb-1">Check-in Time</label>
            <input
              type="datetime-local"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
              value={checkInTime}
              onChange={(e) => setCheckInTime(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 mt-5">
          <LoadingButton className="bg-white border text-slate-700 hover:bg-slate-50" onClick={() => setOpenAssign(false)}>
            Cancel
          </LoadingButton>
          <LoadingButton
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
            pending={assignM.isPending}
            pendingText="Saving…"
            onClick={() => assignM.mutate()}
          >
            Save
          </LoadingButton>
        </div>
      </Modal>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-slate-500">{label}</div>
      <div className="truncate">{value}</div>
    </div>
  );
}

export default function DevicesPage() {
  const qc = useQueryClient();
  const { toasts, push, remove } = useToasts();

  const devicesQ = useQuery({ queryKey: ['devices'], queryFn: listDevices });
  const configQ = useQuery({ queryKey: ['config'], queryFn: () => getUserConfig('DASHBOARD-PLACEHOLDER') });

  const delAll = useMutation({
    mutationFn: deleteAllDevices,
    onSuccess: () => { push({ tone: 'success', title: 'All devices deleted' }); qc.invalidateQueries({ queryKey: ['devices'] }); },
    onError: (e: any) => push({ tone: 'error', title: 'Delete failed', desc: e?.message || '' }),
  });

  const devices: Device[] = Array.isArray(devicesQ.data) ? devicesQ.data : devicesQ.data?.devices ?? [];
  const clientDelay = configQ.data?.clientHeartbeatDelay ?? null;
  const serviceDelay = configQ.data?.serviceHeartbeatDelay ?? null;

  return (
    <div className="container main-wrap space-y-6">
      <Toasts items={toasts} onClose={remove} />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Device Control Center</h1>
        <div className="flex items-center gap-2">
          <LoadingButton
            className="bg-white border text-slate-700 hover:bg-slate-50"
            pending={devicesQ.isFetching}
            pendingText="Refreshing…"
            onClick={() => qc.invalidateQueries({ queryKey: ['devices'] })}
          >
            Refresh Devices
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
      </div>

      {devicesQ.isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 flex items-center gap-3 text-slate-600">
          <Spinner /> Loading devices…
        </div>
      ) : devicesQ.error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
          {(devicesQ.error as any)?.message ?? 'Failed to load devices'}
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
            />
          ))}
        </div>
      )}
    </div>
  );
}
