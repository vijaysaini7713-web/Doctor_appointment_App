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
export function Shell({title,children}:{title:string;children:React.ReactNode}){return <div className="portal-app"><header className="portal-header"><div className="portal-top"><Link className="brand" href="/"><span className="brand-symbol">✚</span>Medi<span>Queue</span></Link><nav className="portal-nav"><Link href="/doctors">Find Doctors</Link><Link href="/appointments">Appointments</Link><Link href="/reception">Reception</Link><Link href="/doctor">Doctor</Link><Link href="/admin">Admin</Link><Link href="/login">Account</Link></nav></div></header><main className="portal-main"><div className="mb-7"><span className="eyebrow">MEDIQUEUE • CARE MADE SIMPLE</span><h1 className="portal-title mt-2">{title}</h1></div>{children}</main></div>}
export function Panel({title,children}:{title?:string;children:React.ReactNode}){return <section className="portal-card">{title&&<h2>{title}</h2>}{children}</section>}
export function Field({label,value,onChange,type='text',required=false,placeholder=''}:{label:string;value:string|number;onChange:(v:string)=>void;type?:string;required?:boolean;placeholder?:string}){return <label className="portal-field">{label}<input type={type} value={value} onChange={e=>onChange(e.target.value)} required={required} placeholder={placeholder}/></label>}
export function Btn({children,onClick,type='button',disabled=false,secondary=false}:{children:React.ReactNode;onClick?:()=>void;type?:'button'|'submit';disabled?:boolean;secondary?:boolean}){return <button onClick={onClick} type={type} disabled={disabled} className={'portal-button '+(secondary?'secondary':'primary')}>{children}</button>}
export function Notice({message}:{message:string}){return message?<div role="status" className="portal-notice">{message}</div>:null}
export function RequireLogin({token,loading}:{token:string|null;loading:boolean}){return loading?<p>Loading account…</p>:<Panel title="Welcome back"><p className="mb-4 text-slate-600">Sign in with your email or Google account to continue.</p><Link className="portal-button primary" href="/login">Sign in / Create account →</Link></Panel>}
export function money(v:number){return '₹'+v.toLocaleString('en-IN');}
