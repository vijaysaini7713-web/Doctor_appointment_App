import { NextRequest } from 'next/server';
import { publicSupabase, serviceSupabase } from './supabase';
export async function authenticatedUser(req: NextRequest) { const value=req.headers.get('authorization'); if (!value?.startsWith('Bearer ')) return null; const {data,error}=await publicSupabase().auth.getUser(value.slice(7)); return error?null:data.user; }
export async function staffRole(userId:string,clinicId:string,roles:string[]) {const {data,error}=await serviceSupabase().from('staff_memberships').select('role').eq('user_id',userId).eq('clinic_id',clinicId).eq('active',true).in('role',roles).maybeSingle();if(error) throw error;return !!data;}
