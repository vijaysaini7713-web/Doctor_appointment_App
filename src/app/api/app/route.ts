import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticatedUser, staffRole } from '@/lib/auth';
import { serviceSupabase } from '@/lib/supabase';
export const dynamic='force-dynamic';
function ok(data:unknown,status=200){return NextResponse.json({data},{status});}
function fail(msg:string,status=400){return NextResponse.json({error:msg},{status});}
function db(){return serviceSupabase();}
async function identity(req:NextRequest){return authenticatedUser(req);}
async function membership(userId:string,clinicId:string){const {data}=await db().from('staff_memberships').select('role').eq('clinic_id',clinicId).eq('user_id',userId).eq('active',true);return (data??[]).map(x=>x.role as string);}
async function can(userId:string,clinicId:string,roles:string[]){return (await membership(userId,clinicId)).some(x=>roles.includes(x));}
export async function GET(req:NextRequest){
 try{
 const view=req.nextUrl.searchParams.get('view')??'directory';
 const d=db();
 if(view==='directory'){
  const {data,error}=await d.from('doctor_directory').select('*').limit(100);if(error)throw error;
  const {data:sessions}=await d.from('doctor_sessions').select('id,doctor_id,clinic_id,starts_at,ends_at,status,average_minutes').gte('ends_at',new Date().toISOString()).in('status',['open','scheduled']).order('starts_at').limit(150);
  const ids=(sessions??[]).map(s=>s.id);
  const {data:slots}=ids.length?await d.from('appointment_slots').select('id,session_id,starts_at,ends_at,capacity').in('session_id',ids):{data:[]};
  return ok({doctors:data??[],sessions:sessions??[],slots:slots??[]});
 }
 const user=await identity(req);if(!user)return fail('Please log in',401);
 if(view==='me'){
  const {data:memberships}=await d.from('staff_memberships').select('role,clinic_id,clinics(id,name,organization_id)').eq('user_id',user.id).eq('active',true);
  return ok({email:user.email,memberships:memberships??[],platformVerifier:!!process.env.PLATFORM_VERIFIER_EMAIL&&user.email?.toLowerCase()===process.env.PLATFORM_VERIFIER_EMAIL.toLowerCase()&&!!user.email_confirmed_at,bootstrapAvailable:!!process.env.BOOTSTRAP_ADMIN_EMAIL&&user.email?.toLowerCase()===process.env.BOOTSTRAP_ADMIN_EMAIL.toLowerCase()&&!!user.email_confirmed_at});
 }
 if(view==='mine'){
  const {data:appointments,error}=await d.from('appointments').select('id,source,status,created_at,doctor_sessions(id,starts_at,ends_at,doctors(display_name),clinics(name)),queue_entries(id,token_number,status,sort_key),appointment_slots(starts_at,ends_at),patients(full_name)').eq('created_by',user.id).order('created_at',{ascending:false}).limit(30);
  if(error)throw error;return ok(appointments??[]);
 }
 const clinicId=req.nextUrl.searchParams.get('clinicId');if(!clinicId||!z.string().uuid().safeParse(clinicId).success)return fail('Clinic required');
 if(!(await membership(user.id,clinicId)).length)return fail('Forbidden',403);
 if(view==='staffSessions'){const {data,error}=await d.from('doctor_sessions').select('id,clinic_id,doctor_id,starts_at,ends_at,status,doctors(display_name)').eq('clinic_id',clinicId).order('starts_at',{ascending:false}).limit(50);if(error)throw error;return ok({sessions:data??[]});}
 if(view==='admin'){
  if(!await can(user.id,clinicId,['clinic_admin']))return fail('Admin only',403);
  const [clinic,doctors,staff,sessions]=await Promise.all([
   d.from('clinics').select('*').eq('id',clinicId).single(),
   d.from('doctor_clinics').select('doctor_id,fee_inr,doctors(id,display_name,specialty,registration_number,verified)').eq('clinic_id',clinicId),
   d.from('staff_memberships').select('user_id,role,active').eq('clinic_id',clinicId),
   d.from('doctor_sessions').select('*,doctors(display_name)').eq('clinic_id',clinicId).order('starts_at',{ascending:false}).limit(50)]);
  return ok({clinic:clinic.data,doctors:doctors.data??[],staff:staff.data??[],sessions:sessions.data??[]});
 }
 if(view==='queue'){
  const sessionId=req.nextUrl.searchParams.get('sessionId');if(!sessionId)return fail('Session required');
  const {data:s}=await d.from('doctor_sessions').select('id,doctor_id,clinic_id,starts_at,ends_at,status,queue_version,average_minutes,doctors(display_name)').eq('id',sessionId).eq('clinic_id',clinicId).single();
  if(!s)return fail('Session unavailable',404);
  const {data:entries,error}=await d.from('queue_entries').select('id,token_number,sort_key,status,called_at,started_at,completed_at,appointments(id,source,status,patients(full_name,mobile))').eq('session_id',sessionId).order('sort_key',{ascending:true});
  if(error)throw error;return ok({session:s,entries:entries??[]});
 }
 return fail('Unknown view');
 }catch{return fail('Unable to load data',500);}
}
const schema=z.discriminatedUnion('action',[
 z.object({action:z.literal('verifyDoctor'),doctorId:z.string().uuid()}),
 z.object({action:z.literal('bootstrap'),clinicName:z.string().trim().min(2).max(120),address:z.string().max(300).optional()}),
 z.object({action:z.literal('addDoctor'),clinicId:z.string().uuid(),name:z.string().trim().min(2),specialty:z.string().trim().min(2),registration:z.string().trim().min(3),fee:z.number().int().min(0).max(100000)}),
 z.object({action:z.literal('session'),clinicId:z.string().uuid(),doctorId:z.string().uuid(),startsAt:z.string().datetime(),endsAt:z.string().datetime(),averageMinutes:z.number().int().min(2).max(90),capacity:z.number().int().min(1).max(100)}),
 z.object({action:z.literal('sessionStatus'),clinicId:z.string().uuid(),sessionId:z.string().uuid(),status:z.enum(['open','paused','closed'])}),
 z.object({action:z.literal('inviteStaff'),clinicId:z.string().uuid(),email:z.string().email(),role:z.enum(['receptionist','doctor','clinic_admin'])}),
 z.object({action:z.literal('book'),sessionId:z.string().uuid(),slotId:z.string().uuid(),name:z.string().trim().min(2),mobile:z.string().regex(/^[0-9]{10}$/)}),
 z.object({action:z.literal('transition'),clinicId:z.string().uuid(),sessionId:z.string().uuid(),entryId:z.string().uuid(),transition:z.enum(['check_in','call','start','complete','skip','rejoin','cancel']),reason:z.string().optional()})
]);
export async function POST(req:NextRequest){
 try{
 const user=await identity(req);if(!user)return fail('Please log in',401);
 const parsed=schema.safeParse(await req.json());if(!parsed.success)return fail('Invalid input',400);
 const x=parsed.data;const d=db();
 if(x.action==='verifyDoctor'){if(!process.env.PLATFORM_VERIFIER_EMAIL||user.email?.toLowerCase()!==process.env.PLATFORM_VERIFIER_EMAIL.toLowerCase()||!user.email_confirmed_at)return fail('Platform verifier only',403);const {data,error}=await d.from('doctors').update({verified:true}).eq('id',x.doctorId).select('id').maybeSingle();if(error||!data)return fail('Doctor not found',404);return ok(data);}
 if(x.action==='bootstrap'){
  const email=process.env.BOOTSTRAP_ADMIN_EMAIL;
  if(!email||user.email?.toLowerCase()!==email.toLowerCase()||!user.email_confirmed_at)return fail('Bootstrap not permitted',403);
  const {count}=await d.from('organizations').select('id',{count:'exact',head:true});if(count!==0)return fail('Initial organization already exists',409);
  const {data:org,error:oErr}=await d.from('organizations').insert({name:x.clinicName}).select('id').single();if(oErr||!org)return fail('Setup failed',500);
  const {data:clinic,error:cErr}=await d.from('clinics').insert({organization_id:org.id,name:x.clinicName,address:x.address||''}).select('id').single();if(cErr||!clinic)return fail('Clinic setup failed',500);
  const {error:mErr}=await d.from('staff_memberships').insert({user_id:user.id,clinic_id:clinic.id,role:'clinic_admin'});if(mErr)return fail('Admin setup failed',500);
  return ok({clinicId:clinic.id},201);
 }
 if(x.action==='book'){
  const {data,error}=await d.rpc('issue_online',{p_session:x.sessionId,p_slot:x.slotId,p_name:x.name,p_mobile:x.mobile,p_actor:user.id});
  if(error)return fail('Unable to book. Slot may be full or you may have an active appointment.',409);
  return ok(data?.[0],201);
 }
 if(!await can(user.id,x.clinicId,['clinic_admin',...(x.action==='transition'||x.action==='sessionStatus'?['receptionist','doctor']:[])]))return fail('Forbidden',403);
 if(x.action==='addDoctor'){
  const {data:doctor,error}=await d.from('doctors').insert({display_name:x.name,specialty:x.specialty,registration_number:x.registration,verified:false}).select('id').single();
  if(error||!doctor)return fail('Could not create doctor',500);
  const {error:linkError}=await d.from('doctor_clinics').insert({doctor_id:doctor.id,clinic_id:x.clinicId,fee_inr:x.fee});
  if(linkError)return fail('Could not link doctor',500);
  return ok({doctorId:doctor.id,verificationRequired:true},201);
 }
 if(x.action==='session'){
  const {data:link}=await d.from('doctor_clinics').select('doctor_id').eq('doctor_id',x.doctorId).eq('clinic_id',x.clinicId).maybeSingle();
  if(!link)return fail('Doctor not assigned to clinic',400);
  if(new Date(x.endsAt)<=new Date(x.startsAt))return fail('End must be after start');
  const {data:session,error}=await d.from('doctor_sessions').insert({clinic_id:x.clinicId,doctor_id:x.doctorId,starts_at:x.startsAt,ends_at:x.endsAt,average_minutes:x.averageMinutes,status:'scheduled'}).select('id').single();
  if(error||!session)return fail('Could not create session',500);
  const {error:slotError}=await d.from('appointment_slots').insert({session_id:session.id,starts_at:x.startsAt,ends_at:x.endsAt,capacity:x.capacity});
  if(slotError)return fail('Could not create slot',500);
  return ok({sessionId:session.id},201);
 }
 if(x.action==='sessionStatus'){
  const {data,error}=await d.from('doctor_sessions').update({status:x.status}).eq('id',x.sessionId).eq('clinic_id',x.clinicId).select('id').maybeSingle();
  if(error||!data)return fail('Session not found',404);return ok(data);
 }
 if(x.action==='inviteStaff'){
  const {data,error}=await d.auth.admin.inviteUserByEmail(x.email);
  if(error||!data.user)return fail('Invitation failed. Check Supabase mail settings.',409);
  const {error:memberError}=await d.from('staff_memberships').upsert({user_id:data.user.id,clinic_id:x.clinicId,role:x.role,active:true},{onConflict:'user_id,clinic_id,role'});
  if(memberError)return fail('Membership could not be saved',500);
  return ok({invited:x.email,role:x.role},201);
 }
 if(x.action==='transition'){
  const {data:session}=await d.from('doctor_sessions').select('clinic_id').eq('id',x.sessionId).eq('clinic_id',x.clinicId).maybeSingle();
  if(!session)return fail('Session not found',404);
  const {data,error}=await d.rpc('queue_transition',{p_session:x.sessionId,p_entry:x.entryId,p_action:x.transition,p_actor:user.id,p_reason:x.reason||null});
  if(error)return fail('Action rejected: invalid state, authorization or missing reason',409);
  return ok({queueVersion:data});
 }
 return fail('Unknown action');
 }catch{return fail('Request failed',500);}
}
