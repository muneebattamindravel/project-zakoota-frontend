import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { User } from '../utils/types'; import { getMe, setAuthToken } from '../utils/api';
type Ctx={ user:User|null; setUser:(u:User|null)=>void; logout:()=>void; bootstrapped:boolean; isAuthed:boolean; };
const C=createContext<Ctx|null>(null);
export function AuthProvider({children}:{children:React.ReactNode}){
  const [user,_setUser]=useState<User|null>(null); const [boot,setBoot]=useState(false);
  useEffect(()=>{ try{ const u=localStorage.getItem('zk_user'); const t=localStorage.getItem('zk_token'); if(u)_setUser(JSON.parse(u)); if(t) setAuthToken(t);}catch{} (async()=>{ try{ const me=await getMe(); const u=me?.data?.user??me?.user??me?.data??null; if(u){ _setUser(u); localStorage.setItem('zk_user',JSON.stringify(u)); } } finally { setBoot(true); } })(); },[]);
  const setUser=(u:User|null)=>{ _setUser(u); if(u) localStorage.setItem('zk_user',JSON.stringify(u)); else localStorage.removeItem('zk_user'); };
  const logout=()=>{ localStorage.removeItem('zk_user'); localStorage.removeItem('zk_token'); setAuthToken(null); _setUser(null); };
  const isAuthed=!!localStorage.getItem('zk_token') || !!user;
  const v=useMemo(()=>({ user, setUser, logout, bootstrapped:boot, isAuthed }),[user,boot,isAuthed]);
  return <C.Provider value={v}>{children}</C.Provider>;
}
export function useAuth(){ const v=useContext(C); if(!v) throw new Error('useAuth must be used in provider'); return v; }
