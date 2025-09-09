import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { assignDevice, deleteAllDevices, listDevices } from '../utils/api';
import type { Device } from '../utils/types';
import { useState } from 'react';
import { fmtLocal } from '../utils/format';

function computeStatus(lastSeen?: string) {
  if (!lastSeen) return 'unknown';
  const diff = Date.now() - new Date(lastSeen).getTime();
  if (diff < 2 * 60 * 1000) return 'online';
  if (diff < 10 * 60 * 1000) return 'idle';
  return 'offline';
}

export default function DevicesPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['devices'], queryFn: listDevices });
  const devices: Device[] = Array.isArray(q.data)
    ? q.data
    : q.data?.devices ?? [];

  const [selected, setSel] = useState<Device | null>(null);

  // form states
  const [username, setUsername] = useState('');
  const [userId, setUserId] = useState('');
  const [name, setName] = useState('');
  const [designation, setDesignation] = useState('');
  const [profileURL, setProfileURL] = useState('');
  const [checkInTime, setCheckInTime] = useState('');

  // ✅ fixed mutation to handle all fields
  const assignM = useMutation({
    mutationFn: ({
      deviceId,
      username,
      userId,
      name,
      designation,
      profileURL,
      checkInTime,
    }: any) =>
      assignDevice(deviceId, {
        username: username || undefined,
        userId: userId || undefined,
        name: name || undefined,
        designation: designation || undefined,
        profileURL: profileURL || undefined,
        checkInTime: checkInTime || undefined,
      }),
    onSuccess: () => {
      setSel(null);
      setUsername('');
      setUserId('');
      setName('');
      setDesignation('');
      setProfileURL('');
      setCheckInTime('');
      qc.invalidateQueries({ queryKey: ['devices'] });
    },
  });

  const delAll = useMutation({
    mutationFn: deleteAllDevices,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['devices'] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Devices</h1>
        <button className="btn-secondary" onClick={() => delAll.mutate()}>
          Delete All
        </button>
      </div>

      <div className="card">
        <div className="card-body">
          {q.isLoading ? (
            'Loading...'
          ) : q.error ? (
            <div className="text-red-600">
              {String((q.error as any)?.message ?? q.error)}
            </div>
          ) : (
            <div className="overflow-auto">
              <table>
                <thead>
                  <tr>
                    <th>Device ID</th>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Last Seen</th>
                    <th>Assigned User</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {devices.map((d) => {
                    const status = d.status ?? computeStatus(d.lastSeen);
                    return (
                      <tr key={d.deviceId}>
                        <td className="font-mono">{d.deviceId}</td>
                        <td>{d.name ?? '-'}</td>
                        <td>{d.type ?? '-'}</td>
                        <td>
                          {status === 'online' && (
                            <span className="tag tag-online">● Online</span>
                          )}
                          {status === 'idle' && (
                            <span className="tag tag-idle">● Idle</span>
                          )}
                          {status === 'offline' && (
                            <span className="tag tag-offline">● Offline</span>
                          )}
                          {!['online', 'idle', 'offline'].includes(
                            status || ''
                          ) && (
                            <span className="tag tag-error">
                              {status || 'unknown'}
                            </span>
                          )}
                        </td>
                        <td>{fmtLocal(d.lastSeen)}</td>
                        <td>
                          {d.profileURL && (
                            <img
                              src={d.profileURL}
                              alt="profile"
                              className="w-6 h-6 inline-block rounded-full mr-2"
                            />
                          )}
                          <div className="inline-block align-middle">
                            <div className="font-medium">
                              {d.name ?? d.username ?? '-'}
                            </div>
                            <div className="text-xs text-slate-500">
                              {d.designation ?? ''}
                            </div>
                          </div>
                        </td>
                        <td className="text-right">
                          <button
                            className="btn"
                            onClick={() => {
                              setSel(d);
                              setUsername(d.username ?? '');
                              setUserId(d.userId ?? '');
                              setName(d.name ?? '');
                              setDesignation(d.designation ?? '');
                              setProfileURL(d.profileURL ?? '');
                              setCheckInTime(
                                d.checkInTime
                                  ? new Date(d.checkInTime)
                                      .toISOString()
                                      .slice(0, 16)
                                  : ''
                              );
                            }}
                          >
                            Assign
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {selected && (
        <div className="card">
          <div className="card-header">
            Assign Device: {selected.deviceId}
          </div>
          <div className="card-body grid md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">Username</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="username"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">User ID</label>
              <input
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="optional"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Full Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Designation</label>
              <input
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="Developer"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Profile Image URL</label>
              <input
                value={profileURL}
                onChange={(e) => setProfileURL(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Check-in Time</label>
              <input
                type="datetime-local"
                value={checkInTime}
                onChange={(e) => setCheckInTime(e.target.value)}
              />
            </div>
            <div className="flex items-end gap-2 col-span-2">
              <button
                className="btn"
                onClick={() =>
                  assignM.mutate({
                    deviceId: selected.deviceId,
                    username,
                    userId,
                    name,
                    designation,
                    profileURL,
                    checkInTime,
                  })
                }
              >
                Save
              </button>
              <button className="btn-secondary" onClick={() => setSel(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
