import { useEffect, useState } from 'react';
import { listDevices, listCommands, createCommand, acknowledgeCommand, completeCommand } from '../utils/api';

export default function CommandsPage() {
  const [devices, setDevices] = useState<any[]>([]);
  const [commandsByDevice, setCommandsByDevice] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [modalDevice, setModalDevice] = useState<any | null>(null);
  const [cmdType, setCmdType] = useState('show_message');
  const [cmdPayload, setCmdPayload] = useState('{}');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const devs = await listDevices();
        setDevices(devs);

        const byDevice: Record<string, any[]> = {};
        for (const d of devs) {
          const res = await listCommands({ deviceId: d.deviceId, limit: 5 });
          byDevice[d.deviceId] = res.items;
        }
        setCommandsByDevice(byDevice);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const sendCommand = async () => {
    if (!modalDevice) return;
    try {
      const cmd = await createCommand(modalDevice.deviceId, cmdType, JSON.parse(cmdPayload));
      setMsg(`Command sent: ${cmd._id ?? cmd.id}`);
      // refresh device’s command list
      const res = await listCommands({ deviceId: modalDevice.deviceId, limit: 5 });
      setCommandsByDevice((prev) => ({ ...prev, [modalDevice.deviceId]: res.items ?? res }));
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    }
  };

  if (loading) return <div>Loading devices...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Device Commands Dashboard</h1>

      {devices.map((d) => {
        const cmds = commandsByDevice[d.deviceId] ?? [];
        const pending = cmds.find((c) => c.status === 'pending');
        const last = cmds[0];

        return (
          <div key={d.deviceId} className="card shadow-md border rounded-lg">
            <div className="card-body">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="font-semibold text-lg">{d.name ?? d.deviceId}</h2>
                  <p className="text-sm text-gray-500">
                    Status: <span className="font-medium">{d.status ?? 'unknown'}</span>
                  </p>
                </div>
                <button className="btn btn-sm" onClick={() => setModalDevice(d)}>
                  Send Command
                </button>
              </div>

              <div className="mt-3">
                {pending ? (
                  <div className="text-yellow-600">
                    Pending Command: <b>{pending.type}</b> at{' '}
                    {new Date(pending.createdAt).toLocaleString()}
                  </div>
                ) : (
                  <div className="text-green-600">No pending commands</div>
                )}
                {last && (
                  <div className="text-sm text-gray-700">
                    Last Command: {last.type} ({last.status}) at{' '}
                    {new Date(last.createdAt).toLocaleString()}
                  </div>
                )}
              </div>

              {cmds.length > 0 && (
                <div className="mt-3">
                  <table className="w-full text-sm border">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="px-2 py-1 text-left">Type</th>
                        <th>Status</th>
                        <th>Time</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cmds.map((c) => (
                        <tr key={c._id} className="border-t">
                          <td className="px-2 py-1">{c.type}</td>
                          <td>{c.status}</td>
                          <td>{new Date(c.createdAt).toLocaleString()}</td>
                          <td>
                            {c.status === 'pending' && (
                              <button
                                className="btn btn-xs mr-2"
                                onClick={async () => {
                                  await acknowledgeCommand(c._id);
                                  const res = await listCommands({ deviceId: d.deviceId, limit: 5 });
                                  setCommandsByDevice((prev) => ({ ...prev, [d.deviceId]: res.items ?? res }));
                                }}
                              >
                                Ack
                              </button>
                            )}
                            {['pending', 'acknowledged'].includes(c.status) && (
                              <button
                                className="btn btn-xs"
                                onClick={async () => {
                                  await completeCommand(c._id);
                                  const res = await listCommands({ deviceId: d.deviceId, limit: 5 });
                                  setCommandsByDevice((prev) => ({ ...prev, [d.deviceId]: res.items ?? res }));
                                }}
                              >
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
          </div>
        );
      })}

      {/* Modal for sending new command */}
      {modalDevice && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg p-6 w-96 space-y-3">
            <h2 className="text-lg font-semibold">
              Send Command to {modalDevice.name ?? modalDevice.deviceId}
            </h2>
            <select
              value={cmdType}
              onChange={(e) => setCmdType(e.target.value)}
              className="w-full border p-2 rounded"
            >
              <option value="show_message">Show Message</option>
              <option value="restart_logger">Restart Logger</option>
              <option value="restart_service">Restart Service</option>
            </select>
            <textarea
              value={cmdPayload}
              onChange={(e) => setCmdPayload(e.target.value)}
              className="w-full border p-2 rounded h-24"
              placeholder='{"message":"Hi"}'
            />
            <div className="flex justify-end space-x-2">
              <button className="btn" onClick={sendCommand}>
                Send
              </button>
              <button className="btn btn-outline" onClick={() => setModalDevice(null)}>
                Cancel
              </button>
            </div>
            {msg && <div className="text-sm">{msg}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
