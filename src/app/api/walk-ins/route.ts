import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticatedUser, staffRole } from '@/lib/auth';
import { serviceSupabase } from '@/lib/supabase';
const Schema=z.object({sessionId:z.string().uuid(),name:z.string().trim().min(2).max(120),mobile:z.string().regex(/^[0-9]{10}$/)});
export async function POST(req:NextRequest){try{
 const user=await authenticatedUser(req);if(!user)return NextResponse.json({error:'Unauthorized'},{status:401});
 const parsed=Schema.safeParse(await req.json());if(!parsed.success)return NextResponse.json({error:'Invalid input',details:parsed.error.flatten()},{status:400});
 const db=serviceSupabase();
 const {data:session,error:lookupError}=await db.from('doctor_sessions').select('clinic_id').eq('id',parsed.data.sessionId).single();
 if(lookupError||!session)return NextResponse.json({error:'Session not found'},{status:404});
 if(!await staffRole(user.id,session.clinic_id,['receptionist','clinic_admin']))return NextResponse.json({error:'Forbidden'},{status:403});
 const {data,error}=await db.rpc('issue_walkin',{p_session:parsed.data.sessionId,p_name:parsed.data.name,p_mobile:parsed.data.mobile,p_actor:user.id});
 if(error)return NextResponse.json({error:'Could not create token'},{status:409});
 return NextResponse.json({data:data?.[0]??null},{status:201});
 }catch{return NextResponse.json({error:'Request failed'},{status:500});}}
