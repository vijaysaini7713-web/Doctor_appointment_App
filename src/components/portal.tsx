'use client';
import {useEffect,useState,useCallback} from 'react';
import Link from 'next/link';
import {publicSupabase} from '@/lib/supabase';
type AnyObject=Record<string,any>;
export function useApi(){
 const [token,setToken]=useState<string|null>(null);
 const [email,setEmail]=useState('');
 const [loading,setLoading]=useState(true);
 useEffect(()=>{let active=true;let subscription:{unsubscribe:()=>void}|undefined;try{const sb=publicSupabase();sb.auth.getSession().then(({data})=>{if(active){setToken(data.session?.access_token??null);setEmail(data.session?.user.email??'');setLoading(false);}});const {data}=sb.auth.onAuthStateChange((_event,session)=>{if(active){setToken(session?.access_token??null);setEmail(session?.user.email??'');setLoading(false);}});subscription=data.subscription;}catch{setLoading(false);}return()=>{active=false;subscription?.unsubscribe();};},[]);
 const request=useCallback(async(path:string,body?:unknown)=>{const head:Record<string,string>={};if(body)head['Content-Type']='application/json';if(token)head.Authorization='Bearer '+token;const res=await fetch('/api/'+path,{method:body?'POST':'GET',headers:head,body:body?JSON.stringify(body):undefined,cache:'no-store'});let data:AnyObject={};try{data=await res.json();}catch{}if(!res.ok)throw new Error(data.error||'Request failed');return data.data;},[token]);
 return {token,email,loading,request};
}
export function Shell({title,children}:{title:string;children:React.ReactNode}){return <div className="min-h-screen"><header className="bg-white border-b"><div className="max-w-6xl mx-auto px-5 py-4 flex flex-wrap justify-between items-center gap-4"><Link className="text-xl font-black text-teal-800" href="/">MediQueue</Link><nav className="flex flex-wrap gap-4 text-sm"><Link href="/doctors">Find Doctors</Link><Link href="/appointments">My Bookings</Link><Link href="/reception">Reception</Link><Link href="/doctor">Doctor</Link><Link href="/admin">Admin</Link><Link href="/login">Account</Link></nav></div></header><main className="max-w-6xl mx-auto px-5 py-8"><h1 className="text-3xl font-bold mb-7">{title}</h1>{children}</main></div>}
export function Panel({title,children}:{title?:string;children:React.ReactNode}){return <section className="bg-white border rounded-2xl p-5 mb-5 shadow-sm">{title&&<h2 className="font-bold text-lg mb-4">{title}</h2>}{children}</section>}
export function Field({label,value,onChange,type='text',required=false,placeholder=''}:{label:string;value:string|number;onChange:(v:string)=>void;type?:string;required?:boolean;placeholder?:string}){return <label className="block text-sm font-medium mb-3">{label}<input className="block w-full border rounded-lg px-3 py-2 mt-1 bg-white" type={type} value={value} onChange={e=>onChange(e.target.value)} required={required} placeholder={placeholder}/></label>}
export function Btn({children,onClick,type='button',disabled=false,secondary=false}:{children:React.ReactNode;onClick?:()=>void;type?:'button'|'submit';disabled?:boolean;secondary?:boolean}){return <button onClick={onClick} type={type} disabled={disabled} className={'rounded-xl px-4 py-2 font-semibold text-sm disabled:opacity-40 '+(secondary?'border border-slate-300 bg-white':'bg-teal-700 text-white hover:bg-teal-800')}>{children}</button>}
export function Notice({message}:{message:string}){return message?<div role="status" className="bg-blue-50 text-blue-900 rounded-lg p-3 mb-4 text-sm">{message}</div>:null}
export function RequireLogin({token,loading}:{token:string|null;loading:boolean}){return loading?<p>Loading account…</p>:<Panel title="Login required"><p className="mb-4">Please sign in with your email or Google account.</p><Link className="text-teal-700 underline" href="/login">Go to Login</Link></Panel>}
export function money(v:number){return '₹'+v.toLocaleString('en-IN');}
