import { useState } from 'react';
import { createCommand } from '../utils/api';

export default function CommandsPage() {
  const [deviceId, setDeviceId] = useState('');
  const [type, setType] = useState('show_message');
  const [payload, setPayload] = useState('{}');
  const [msg, setMsg] = useState('');

  const handleSubmit = async () => {
    try {
      const result = await createCommand(deviceId, type, JSON.parse(payload));
      setMsg(`Command sent: ${result._id ?? result.id ?? 'OK'}`);
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Send Command</h1>
      <div className="card">
        <div className="card-body space-y-3">
          <input value={deviceId} onChange={e => setDeviceId(e.target.value)} placeholder="Device ID" />
          <select value={type} onChange={e => setType(e.target.value)}>
            <option value="show_message">Show Message</option>
            <option value="restart_logger">Restart Logger</option>
            <option value="restart_service">Restart Service</option>
          </select>
          <textarea value={payload} onChange={e => setPayload(e.target.value)} placeholder='{"message":"Hi"}'></textarea>
          <button className="btn" onClick={handleSubmit}>Send</button>
          {msg && <div>{msg}</div>}
        </div>
      </div>
    </div>
  );
}
