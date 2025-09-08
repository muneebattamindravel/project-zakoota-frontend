import { FormEvent, useState } from 'react'; import { useLocation, useNavigate } from 'react-router-dom';
import { login, setAuthToken } from '../../utils/api'; import { useAuth } from '../../state/auth';
export default function LoginPage(){ const [username,setU]=useState('admin'); const [password,setP]=useState(''); const [err,setErr]=useState(''); const [loading,setL]=useState(false); const { setUser }=useAuth(); const nav=useNavigate(); const loc=useLocation();
async function onSubmit(e:FormEvent){ e.preventDefault(); setErr(''); setL(true); try{ const { ok,user,token,raw }=await login(username,password); if(!ok && !user) throw new Error(raw?.message??'Login failed'); if(token){ localStorage.setItem('zk_token',token); setAuthToken(token); } if(user){ localStorage.setItem('zk_user',JSON.stringify(user)); setUser(user);} else { setUser({ username } as any);} const to=(loc.state as any)?.from ?? '/'; nav(to,{replace:true}); } catch(e:any){ setErr(e?.response?.data?.message||e?.message||'Login failed'); } finally{ setL(false);} }
return (<div className='min-h-screen grid place-items-center p-4'><form onSubmit={onSubmit} className='card w-full max-w-sm'><div className='card-header'>Sign in</div><div className='card-body space-y-3'>
  <div><label className='block text-sm mb-1'>Username</label><input value={username} onChange={e=>setU(e.target.value)}/></div>
  <div><label className='block text-sm mb-1'>Password</label><input type='password' value={password} onChange={e=>setP(e.target.value)}/></div>
  {err && <div className='text-sm text-red-600'>{err}</div>}
  <button className='btn w-full' disabled={loading}>{loading?'Signing in...':'Sign in'}</button>
</div></form></div>); }
