import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { assignDevice, deleteAllDevices, listDevices, getUserConfig } from '../utils/api';
import type { Device } from '../utils/types';
import { useState } from 'react';
import { fmtLocal } from '../utils/format';
import { getDeviceStatuses } from '../utils/status';

export default function DevicesPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['devices'], queryFn: listDevices });
  const configQ = useQuery({
    queryKey: ['config'],
    queryFn: () => getUserConfig('DEVICES-PAGE'),
  });

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

  const clientDelay = configQ.data?.clientHeartbeatDelay ?? 60;
  const serviceDelay = configQ.data?.serviceHeartbeatDelay ?? 120;

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
                    <th>Client Status</th>
                    <th>Service Status</th>
                    <th>Last Seen</th>
                    <th>Assigned User</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {devices.map((d) => {
                    const { clientStatus, serviceStatus } = getDeviceStatuses(
                      d.lastClientHeartbeat,
                      d.lastServiceHeartbeat,
                      clientDelay,
                      serviceDelay
                    );

                    return (
                      <tr key={d.deviceId}>
                        <td className="font-mono">{d.deviceId}</td>
                        <td>{d.name ?? '-'}</td>
                        <td>{d.type ?? '-'}</td>
                        <td>
                          {clientStatus === 'online' ? (
                            <span className="tag tag-online">● Online</span>
                          ) : (
                            <span className="tag tag-offline">● Offline</span>
                          )}
                        </td>
                        <td>
                          {serviceStatus === 'online' ? (
                            <span className="tag tag-online">● Online</span>
                          ) : (
                            <span className="tag tag-offline">● Offline</span>
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
            {/* Form fields unchanged */}
            ...
          </div>
        </div>
      )}
    </div>
  );
}
