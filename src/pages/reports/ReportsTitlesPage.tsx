import { useQuery } from '@tanstack/react-query'; import { useState } from 'react';
import { listDevices, logsApps, logsTitles } from '../../utils/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { fmtHMS } from '../../utils/format'; import DeviceCombo from '../../components/DeviceCombo';
function toLocalInputValue(d: Date) { const pad = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; }
export default function ReportsTitlesPage() {
  const now = new Date(); const [deviceId, setDeviceId] = useState(''); const [appName, setAppName] = useState(''); const [from, setFrom] = useState(toLocalInputValue(new Date(now.getTime() - 24 * 60 * 60 * 1000))); const [to, setTo] = useState(toLocalInputValue(now)); const [top, setTop] = useState(20);
  const devicesQ = useQuery({ queryKey: ['devices'], queryFn: listDevices });

  const options = ((devicesQ.data ?? []) as any[]).map((d: any) => ({
    value: d.deviceId,
    label: `${d.deviceId}${d.username ? ' — @' + d.username : ''}`,
    username: d.username,
  }));


  const appsQ = useQuery({ queryKey: ['apps', deviceId, from, to, 50], enabled: !!deviceId, queryFn: () => logsApps(deviceId, new Date(from).toISOString(), new Date(to).toISOString(), 50) });
  const q = useQuery({ queryKey: ['titles', deviceId, appName, from, to, top], enabled: !!deviceId && !!appName, queryFn: () => logsTitles(deviceId, appName, new Date(from).toISOString(), new Date(to).toISOString(), top) });
  const data = Array.isArray(q.data) ? q.data : [];
  return (<div className='space-y-4'><h1 className='text-xl font-semibold'>App Window Titles</h1>
    <div className='card'><div className='card-body grid md:grid-cols-4 gap-3'>
      <div className='md:col-span-2'><label className='block text-sm mb-1'>Device</label><DeviceCombo options={options} value={deviceId} onChange={setDeviceId} /></div>
      <div className='md:col-span-2'><label className='block text-sm mb-1'>App Name</label>
        <input list='apps-list' value={appName} onChange={e => setAppName(e.target.value)} placeholder='e.g. chrome.exe' />
        <datalist id='apps-list'>{(appsQ.data ?? [] as any[]).map((a: any, i: number) => (<option key={i} value={a.appName} />))}</datalist>
      </div>
      <div><label className='block text-sm mb-1'>From</label><input type='datetime-local' value={from} onChange={e => setFrom(e.target.value)} /></div>
      <div><label className='block text-sm mb-1'>To</label><input type='datetime-local' value={to} onChange={e => setTo(e.target.value)} /></div>
      <div><label className='block text-sm mb-1'>Top</label><input type='number' value={top} onChange={e => setTop(parseInt(e.target.value || '20'))} /></div>
    </div></div>
    <div className='card'><div className='card-body' style={{ height: 420 }}>{!deviceId ? 'Select a device' : !appName ? 'Enter an app name' : q.isLoading ? 'Loading...' : q.error ? <div className='text-red-600'>{String((q.error as any)?.message ?? q.error)}</div> : (
      <ResponsiveContainer width='100%' height='100%'><BarChart data={data} margin={{ left: 20, right: 20 }}>
        <CartesianGrid strokeDasharray='3 3' />
        <XAxis dataKey='title' tick={{ fontSize: 12 }} interval={0} angle={-30} textAnchor='end' height={80} />
        <YAxis tickFormatter={(v) => fmtHMS(Number(v))} />
        <Tooltip formatter={(v) => fmtHMS(Number(v))} />
        <Legend />
        <Bar dataKey='activeTime' name='Active' fill='#22c55e' />
        <Bar dataKey='idleTime' name='Idle' fill='#eab308' />
      </BarChart></ResponsiveContainer>
    )}</div></div>
    <div className='card'><div className='card-body overflow-auto'><table><thead><tr><th>Title</th><th>Active</th><th>Idle</th></tr></thead>
      <tbody>{data.map((d: any, i: number) => (<tr key={i}><td>{d.title}</td><td>{fmtHMS(d.activeTime)}</td><td>{fmtHMS(d.idleTime)}</td></tr>))}</tbody></table></div></div>
  </div>);
}
