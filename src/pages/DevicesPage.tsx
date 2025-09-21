import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listDevices,
  assignDevice,
  deleteAllDevices,
  listCommands,
  createCommand,
  acknowledgeCommand,
  completeCommand,
  getUserConfig,
} from '../utils/api';
import type { Device } from '../utils/types';
import { fmtLocal } from '../utils/format';
import { getDeviceStatuses } from '../utils/status';

type CommandItem = {
  _id: string;
  deviceId: string;
  type: 'show_message' | 'restart_logger' | 'restart_service' | string;
  status: 'pending' | 'acknowledged' | 'completed' | string;
  createdAt: string;
  acknowledgedAt?: string;
  completedAt?: string;
  payload?: any;
};

function DeviceCard({
  device,
  clientDelay,
  serviceDelay,
}: {
  device: Device;
  clientDelay: number | null;
  serviceDelay: number | null;
}) {
  const qc = useQueryClient();

  // Command modal state
  const [openModal, setOpenModal] = useState(false);
  const [cmdType, setCmdType] = useState<'show_message' | 'restart_logger' | 'restart_service'>('show_message');
  const [cmdPayload, setCmdPayload] = useState('{"message":"Hello from dashboard"}');
  const [submitMsg, setSubmitMsg] = useState('');

  // Assignment modal state
  const [openAssign, setOpenAssign] = useState(false);
  const [username, setUsername] = useState(device.username ?? '');
  const [userId, setUserId] = useState(device.userId ?? '');
  const [name, setName] = useState(device.name ?? '');
  const [designation, setDesignation] = useState(device.designation ?? '');
  const [profileURL, setProfileURL] = useState(device.profileURL ?? '');
  const [checkInTime, setCheckInTime] = useState(
    device.checkInTime ? new Date(device.checkInTime).toISOString().slice(0, 16) : ''
  );

  // Fetch latest N commands for this device
  const commandsQ = useQuery({
    queryKey: ['commands', device.deviceId],
    queryFn: async () => {
      const res = await listCommands({ deviceId: device.deviceId, limit: 8 });
      return res.items as CommandItem[];
    },
  });

  const commands = commandsQ.data ?? [];
  const pending = useMemo(() => commands.find((c) => c.status === 'pending'), [commands]);
  const last = useMemo(() => (commands.length > 0 ? commands[0] : null), [commands]);
  const lastCompleted = useMemo(
    () => commands.find((c) => c.status === 'completed'),
    [commands]
  );

  // Assignment mutation
  const assignM = useMutation({
    mutationFn: () =>
      assignDevice(device.deviceId, {
        username: username || undefined,
        userId: userId || undefined,
        name: name || undefined,
        designation: designation || undefined,
        profileURL: profileURL || undefined,
        checkInTime: checkInTime || undefined,
      }),
    onSuccess: () => {
      setOpenAssign(false);
      qc.invalidateQueries({ queryKey: ['devices'] });
    },
  });

  // Send command mutation
  const sendCommandM = useMutation({
    mutationFn: async () => {
      let payload: any = {};
      try {
        payload = cmdPayload ? JSON.parse(cmdPayload) : {};
      } catch (e: any) {
        throw new Error(`Invalid JSON payload: ${e?.message || e}`);
      }
      return createCommand(device.deviceId, cmdType, payload);
    },
    onSuccess: (cmd: any) => {
      setSubmitMsg(`Command sent: ${cmd?._id ?? cmd?.id ?? 'OK'}`);
      qc.invalidateQueries({ queryKey: ['commands', device.deviceId] });
      setTimeout(() => setSubmitMsg(''), 2500);
    },
    onError: (err: any) => {
      setSubmitMsg(`Error: ${err?.message || 'Failed to send'}`);
    },
  });

  // Ack/Complete handlers
  const onAcknowledge = async (id: string) => {
    await acknowledgeCommand(id);
    qc.invalidateQueries({ queryKey: ['commands', device.deviceId] });
  };
  const onComplete = async (id: string) => {
    await completeCommand(id);
    qc.invalidateQueries({ queryKey: ['commands', device.deviceId] });
  };

  // Status bubbles
  let clientStatus: 'online' | 'offline' = 'offline';
  let serviceStatus: 'online' | 'offline' = 'offline';
  if (clientDelay && serviceDelay) {
    const st = getDeviceStatuses(device.lastClientHeartbeat, device.lastServiceHeartbeat, clientDelay, serviceDelay);
    clientStatus = st.clientStatus;
    serviceStatus = st.serviceStatus;
  }

  return (
    <div className="card shadow-sm border rounded-2xl overflow-hidden">
      <div className="card-body p-5">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          {/* Left: identity */}
          <div className="flex items-start gap-4">
            {device.profileURL ? (
              <img src={device.profileURL} alt="profile" className="w-12 h-12 rounded-full object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
                {((device.name ?? device.username ?? 'U') as string).slice(0, 1).toUpperCase()}
              </div>
            )}
            <div>
              <div className="text-lg font-semibold">{device.name ?? device.username ?? 'Unassigned'}</div>
              <div className="text-xs text-slate-500">{device.designation ?? '-'}</div>
              <div className="text-xs text-slate-500 font-mono mt-1">{device.deviceId}</div>
            </div>
          </div>

          {/* Right: quick actions */}
          <div className="flex items-center gap-2">
            <button className="btn btn-sm" onClick={() => setOpenAssign(true)}>Assign</button>
            <button className="btn btn-sm" onClick={() => setOpenModal(true)}>Send Command</button>
            <button className="btn btn-sm btn-outline" onClick={() => qc.invalidateQueries({ queryKey: ['commands', device.deviceId] })}>
              Refresh Commands
            </button>
          </div>
        </div>

        {/* Status row */}
        <div className="grid md:grid-cols-4 gap-3 mt-4">
          <InfoItem label="Client Status">
            {clientStatus === 'online' ? <span className="tag tag-online">● Online</span> : <span className="tag tag-offline">● Offline</span>}
          </InfoItem>
          <InfoItem label="Service Status">
            {serviceStatus === 'online' ? <span className="tag tag-online">● Online</span> : <span className="tag tag-offline">● Offline</span>}
          </InfoItem>
          <InfoItem label="Last Seen">{fmtLocal(device.lastSeen) || '-'}</InfoItem>
          <InfoItem label="Type">{device.type ?? '-'}</InfoItem>
        </div>

        {/* Command Summary */}
        <div className="mt-5 grid lg:grid-cols-3 gap-4">
          <SummaryCard
            title="Pending Command"
            emptyText="No pending command"
            content={
              pending ? (
                <div>
                  <div className="font-medium">{pending.type}</div>
                  <div className="text-xs text-slate-500">{fmtLocal(pending.createdAt)}</div>
                  {pending.payload && (
                    <pre className="text-xs bg-slate-50 border rounded p-2 mt-2 overflow-auto max-h-40">
                      {JSON.stringify(pending.payload, null, 2)}
                    </pre>
                  )}
                  <div className="flex gap-2 mt-2">
                    <button className="btn btn-xs" onClick={() => onAcknowledge(pending._id)}>Acknowledge</button>
                    <button className="btn btn-xs btn-outline" onClick={() => onComplete(pending._id)}>Complete</button>
                  </div>
                </div>
              ) : null
            }
          />
          <SummaryCard
            title="Last Command"
            emptyText="—"
            content={
              last ? (
                <div>
                  <div className="font-medium">{last.type} <span className="text-xs text-slate-500">({last.status})</span></div>
                  <div className="text-xs text-slate-500">{fmtLocal(last.createdAt)}</div>
                </div>
              ) : null
            }
          />
          <SummaryCard
            title="Last Completed"
            emptyText="—"
            content={
              lastCompleted ? (
                <div>
                  <div className="font-medium">{lastCompleted.type}</div>
                  <div className="text-xs text-slate-500">{fmtLocal(lastCompleted.completedAt || lastCompleted.createdAt)}</div>
                </div>
              ) : null
            }
          />
        </div>

        {/* History table */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold">Recent Commands</div>
            <button
              className="btn btn-xs btn-outline"
              onClick={() => qc.invalidateQueries({ queryKey: ['commands', device.deviceId] })}
            >
              Refresh
            </button>
          </div>
          {commandsQ.isLoading ? (
            <div className="text-sm text-slate-500">Loading commands…</div>
          ) : commands.length === 0 ? (
            <div className="text-sm text-slate-500">No command history</div>
          ) : (
            <div className="overflow-auto border rounded">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-2 py-2">Type</th>
                    <th className="text-left px-2 py-2">Status</th>
                    <th className="text-left px-2 py-2">Created</th>
                    <th className="text-left px-2 py-2">Ack</th>
                    <th className="text-left px-2 py-2">Completed</th>
                    <th className="text-right px-2 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {commands.map((c) => (
                    <tr key={c._id} className="border-t">
                      <td className="px-2 py-2">{c.type}</td>
                      <td className="px-2 py-2">
                        <span className="px-2 py-0.5 rounded text-xs border">
                          {c.status}
                        </span>
                      </td>
                      <td className="px-2 py-2">{fmtLocal(c.createdAt) || '-'}</td>
                      <td className="px-2 py-2">{c.acknowledgedAt ? fmtLocal(c.acknowledgedAt) : '—'}</td>
                      <td className="px-2 py-2">{c.completedAt ? fmtLocal(c.completedAt) : '—'}</td>
                      <td className="px-2 py-2 text-right">
                        {c.status === 'pending' && (
                          <button className="btn btn-xs mr-2" onClick={() => onAcknowledge(c._id)}>
                            Ack
                          </button>
                        )}
                        {['pending', 'acknowledged'].includes(c.status) && (
                          <button className="btn btn-xs btn-outline" onClick={() => onComplete(c._id)}>
                            Complete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Send Command Modal */}
        {openModal && (
          <div className="fixed inset-0 bg-black/30 z-40 flex items-center justify-center">
            <div className="bg-white rounded-2xl shadow-xl w-[520px] max-w-[95vw] p-6 space-y-3">
              <div className="text-lg font-semibold">Send Command</div>
              <div className="grid grid-cols-1 gap-3">
                <label className="text-sm">Command Type</label>
                <select
                  className="border rounded p-2"
                  value={cmdType}
                  onChange={(e) => setCmdType(e.target.value as any)}
                >
                  <option value="show_message">Show Message</option>
                  <option value="restart_logger">Restart Logger</option>
                  <option value="restart_service">Restart Service</option>
                </select>

                <label className="text-sm mt-2">Payload (JSON)</label>
                <textarea
                  className="border rounded p-2 h-28 font-mono text-xs"
                  value={cmdPayload}
                  onChange={(e) => setCmdPayload(e.target.value)}
                  placeholder='{"message":"Hello"}'
                />

                <div className="flex items-center justify-end gap-2 mt-2">
                  <button className="btn" onClick={() => sendCommandM.mutate()} disabled={sendCommandM.isPending}>
                    {sendCommandM.isPending ? 'Sending…' : 'Send'}
                  </button>
                  <button className="btn btn-outline" onClick={() => setOpenModal(false)}>
                    Cancel
                  </button>
                </div>

                {submitMsg && <div className="text-xs text-slate-600">{submitMsg}</div>}
              </div>
            </div>
          </div>
        )}

        {/* Assign Modal */}
        {openAssign && (
          <div className="fixed inset-0 bg-black/30 z-40 flex items-center justify-center">
            <div className="bg-white rounded-2xl shadow-xl w-[650px] max-w-[95vw] p-6">
              <div className="text-lg font-semibold mb-3">Assign Device</div>
              <div className="grid md:grid-cols-2 gap-3">
                <LabeledInput label="Username" value={username} onChange={setUsername} placeholder="username" />
                <LabeledInput label="User ID" value={userId} onChange={setUserId} placeholder="optional" />
                <LabeledInput label="Full Name" value={name} onChange={setName} placeholder="John Doe" />
                <LabeledInput label="Designation" value={designation} onChange={setDesignation} placeholder="Developer" />
                <LabeledInput label="Profile Image URL" value={profileURL} onChange={setProfileURL} placeholder="https://..." />
                <div>
                  <label className="block text-sm mb-1">Check-in Time</label>
                  <input type="datetime-local" value={checkInTime} onChange={(e) => setCheckInTime(e.target.value)} />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 mt-4">
                <button className="btn" onClick={() => assignM.mutate()} disabled={assignM.isPending}>
                  {assignM.isPending ? 'Saving…' : 'Save'}
                </button>
                <button className="btn btn-outline" onClick={() => setOpenAssign(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="p-3 rounded-xl border bg-white">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function SummaryCard({
  title,
  emptyText,
  content,
}: {
  title: string;
  emptyText: string;
  content: React.ReactNode | null;
}) {
  return (
    <div className="p-4 rounded-xl border bg-white">
      <div className="text-sm font-semibold mb-2">{title}</div>
      {content ? <div>{content}</div> : <div className="text-sm text-slate-500">{emptyText}</div>}
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm mb-1">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

export default function DevicesPage() {
  const qc = useQueryClient();

  // Fetch devices
  const devicesQ = useQuery({ queryKey: ['devices'], queryFn: listDevices });

  // Fetch config (for heartbeat thresholds)
  const configQ = useQuery({
    queryKey: ['config'],
    queryFn: () => getUserConfig('DASHBOARD-PLACEHOLDER'),
  });

  const delAll = useMutation({
    mutationFn: deleteAllDevices,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['devices'] }),
  });

  const devices: Device[] = Array.isArray(devicesQ.data)
    ? devicesQ.data
    : devicesQ.data?.devices ?? [];

  const clientDelay = configQ.data?.clientHeartbeatDelay ?? null;
  const serviceDelay = configQ.data?.serviceHeartbeatDelay ?? null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Device Control Center</h1>
        <div className="flex items-center gap-2">
          <button className="btn btn-outline" onClick={() => qc.invalidateQueries({ queryKey: ['devices'] })}>
            Refresh Devices
          </button>
          <button className="btn-secondary" onClick={() => delAll.mutate()}>
            Delete All Devices
          </button>
        </div>
      </div>

      {devicesQ.isLoading ? (
        <div>Loading devices…</div>
      ) : devicesQ.error ? (
        <div className="text-red-600">{String((devicesQ.error as any)?.message ?? devicesQ.error)}</div>
      ) : devices.length === 0 ? (
        <div className="text-slate-500">No devices yet.</div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {devices.map((d) => (
            <DeviceCard
              key={d.deviceId}
              device={d}
              clientDelay={clientDelay}
              serviceDelay={serviceDelay}
            />
          ))}
        </div>
      )}
    </div>
  );
}
