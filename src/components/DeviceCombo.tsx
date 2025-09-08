import { useEffect, useMemo, useRef, useState } from 'react';
type Opt={ value:string; label:string; username?:string|null };
export default function DeviceCombo({options,value,onChange,placeholder='Select device or user...'}:{options:Opt[]; value?:string; onChange:(v:string)=>void; placeholder?:string;}){
  const [open,setOpen]=useState(false); const [query,setQuery]=useState(''); const ref=useRef<HTMLDivElement>(null);
  const filtered=useMemo(()=>{ const q=query.trim().toLowerCase(); if(!q) return options; return options.filter(o=>o.value.toLowerCase().includes(q)||(o.username??'').toLowerCase().includes(q)||o.label.toLowerCase().includes(q)); },[options,query]);
  useEffect(()=>{ const onDoc=(e:MouseEvent)=>{ if(!ref.current) return; if(!ref.current.contains(e.target as any)) setOpen(false); }; document.addEventListener('click',onDoc); return ()=>document.removeEventListener('click',onDoc); },[]);
  const current=options.find(o=>o.value===value);
  return (<div className='combo' ref={ref}><div className='relative'>
      <input className='pr-8' placeholder={placeholder} value={open?query:(current?.label||'')} onChange={e=>{setQuery(e.target.value); setOpen(true);}} onFocus={()=>setOpen(true)}/>
      <button className='absolute right-1 top-1/2 -translate-y-1/2 text-xs px-2 py-1 border rounded-md bg-white' onClick={()=>setOpen(o=>!o)}>{open?'▲':'▼'}</button>
    </div>
    {open && (<div className='combo-list'>{filtered.length===0?<div className='combo-empty'>No matches</div>:filtered.map(o=>(
      <div key={o.value} className='combo-item' onClick={()=>{ onChange(o.value); setOpen(false); setQuery(''); }}>
        <div className='font-mono'>{o.value}</div><div className='text-xs text-slate-500'>{o.username?`@${o.username}`:o.label}</div>
      </div>))}</div>)}
  </div>);
}
