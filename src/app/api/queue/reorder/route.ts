import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {authenticatedUser,staffRole} from '@/lib/auth';
import {serviceSupabase} from '@/lib/supabase';
const Schema=z.object({sessionId:z.string().uuid(),entryId:z.string().uuid(),afterEntryId:z.string().uuid().nullable(),expectedVersion:z.number().int().nonnegative(),reason:z.string().trim().min(3).max(250)});
export async function POST(req:NextRequest){try{const user=await authenticatedUser(req);if(!user)return NextResponse.json({error:'Unauthorized'},{status:401});
 const parsed=Schema.safeParse(await req.json());if(!parsed.success)return NextResponse.json({error:'Invalid request'},{status:400});
 const db=serviceSupabase();const {data:session}=await db.from('doctor_sessions').select('clinic_id').eq('id',parsed.data.sessionId).single();
 if(!session)return NextResponse.json({error:'Not found'},{status:404});
 if(!await staffRole(user.id,session.clinic_id,['receptionist','clinic_admin']))return NextResponse.json({error:'Forbidden'},{status:403});
 const {data,error}=await db.rpc('reorder_queue',{p_session:parsed.data.sessionId,p_entry:parsed.data.entryId,p_after:parsed.data.afterEntryId,p_actor:user.id,p_expected_version:parsed.data.expectedVersion,p_reason:parsed.data.reason});
 if(error)return NextResponse.json({error:'Queue changed or operation rejected. Refresh and retry.'},{status:409});
 return NextResponse.json({queueVersion:data});}catch{return NextResponse.json({error:'Request failed'},{status:500});}}
