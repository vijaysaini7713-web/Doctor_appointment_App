-- Apply after 0001_initial.sql. Only the Next.js server with the Supabase service key may invoke these RPCs.
alter table doctor_sessions add column if not exists average_minutes integer not null default 10 check(average_minutes between 2 and 90);
alter table queue_entries add column if not exists called_at timestamptz;
alter table queue_entries add column if not exists started_at timestamptz;
alter table queue_entries add column if not exists completed_at timestamptz;
create index if not exists appointment_session_idx on appointments(session_id,status);
create index if not exists staff_user_idx on staff_memberships(user_id,active);
create or replace function issue_online(p_session uuid,p_slot uuid,p_name text,p_mobile text,p_actor uuid)
returns table(appointment_id uuid,token_number integer) language plpgsql security invoker as $$
declare s doctor_sessions%rowtype; p uuid; a uuid; n integer; cap integer; booked integer;
begin
 select * into s from doctor_sessions where id=p_session for update;
 if not found or s.status not in ('scheduled','open') or s.ends_at < now() then raise exception 'Session unavailable';end if;
 if not exists(select 1 from doctors where id=s.doctor_id and verified) then raise exception 'Doctor is awaiting verification';end if;
 if p_name is null or length(trim(p_name))<2 or p_mobile !~ '^[0-9]{10}$' then raise exception 'Invalid patient';end if;
 if not exists(select 1 from auth.users where id=p_actor and email_confirmed_at is not null) then raise exception 'Account not confirmed';end if;
 select capacity into cap from appointment_slots where id=p_slot and session_id=p_session;
 if cap is null then raise exception 'Invalid slot';end if;
 select count(*) into booked from appointments where slot_id=p_slot and status not in ('cancelled','no_show');
 if booked>=cap then raise exception 'Slot full';end if;
 if exists(select 1 from appointments a join patients p on p.id=a.patient_id
 where a.session_id=p_session and p.account_user_id=p_actor and a.status not in ('completed','cancelled','no_show')) then raise exception 'Already booked';end if;
 insert into patients(full_name,mobile,account_user_id) values(trim(p_name),p_mobile,p_actor) returning id into p;
 insert into appointments(session_id,slot_id,patient_id,source,created_by) values(p_session,p_slot,p,'online',p_actor) returning id into a;
 n:=s.next_token;
 insert into queue_entries(appointment_id,session_id,token_number,sort_key,status) values(a,p_session,n,n,'on_hold');
 update doctor_sessions set next_token=next_token+1,queue_version=queue_version+1 where id=p_session;
 insert into queue_events(session_id,actor_id,action,details) values(p_session,p_actor,'online_booked',jsonb_build_object('token_number',n));
 return query select a,n;
end $$;
create or replace function queue_transition(p_session uuid,p_entry uuid,p_action text,p_actor uuid,p_reason text default null)
returns bigint language plpgsql security invoker as $$
declare s doctor_sessions%rowtype; e queue_entries%rowtype; v bigint; role_ok boolean;
begin
 select * into s from doctor_sessions where id=p_session for update;
 if not found then raise exception 'Missing session';end if;
 select * into e from queue_entries where id=p_entry and session_id=p_session for update;
 if not found then raise exception 'Missing queue entry';end if;
 select exists(select 1 from staff_memberships where user_id=p_actor and clinic_id=s.clinic_id and active and role in ('receptionist','clinic_admin','doctor')) into role_ok;
 if not role_ok then raise exception 'Forbidden';end if;
 if p_action in ('start','complete') and not exists(select 1 from staff_memberships where user_id=p_actor and clinic_id=s.clinic_id and active and role in ('doctor','clinic_admin')) then raise exception 'Doctor role required';end if;
 if p_action='check_in' and e.status='on_hold' then
  update queue_entries set status='waiting' where id=p_entry;
  update appointments set status='checked_in',checked_in_at=now() where id=e.appointment_id;
 elsif p_action='call' and e.status='waiting' then
  if exists(select 1 from queue_entries where session_id=p_session and status in ('called','in_consultation')) then raise exception 'Another patient is active';end if;
  update queue_entries set status='called',called_at=now() where id=p_entry;
  update appointments set status='called' where id=e.appointment_id;
 elsif p_action='start' and e.status='called' then
  update queue_entries set status='in_consultation',started_at=now() where id=p_entry;
  update appointments set status='in_consultation' where id=e.appointment_id;
 elsif p_action='complete' and e.status='in_consultation' then
  update queue_entries set status='completed',completed_at=now() where id=p_entry;
  update appointments set status='completed' where id=e.appointment_id;
 elsif p_action='skip' and e.status in ('waiting','called') then
  if coalesce(length(trim(p_reason)),0)<3 then raise exception 'Skip reason required';end if;
  update queue_entries set status='skipped' where id=p_entry;
  update appointments set status='checked_in' where id=e.appointment_id;
 elsif p_action='rejoin' and e.status='skipped' then
  update queue_entries set status='waiting',sort_key=(select coalesce(max(sort_key),0)+1 from queue_entries where session_id=p_session) where id=p_entry;
 elsif p_action='cancel' and e.status in ('on_hold','waiting','skipped','called') then
  if coalesce(length(trim(p_reason)),0)<3 then raise exception 'Cancellation reason required';end if;
  update queue_entries set status='cancelled' where id=p_entry;
  update appointments set status='cancelled' where id=e.appointment_id;
 else raise exception 'Invalid transition';end if;
 update doctor_sessions set queue_version=queue_version+1 where id=p_session returning queue_version into v;
 insert into queue_events(session_id,queue_entry_id,actor_id,action,reason) values(p_session,p_entry,p_actor,p_action,p_reason);
 return v;
end $$;
revoke execute on function issue_online(uuid,uuid,text,text,uuid) from public,anon,authenticated;
revoke execute on function queue_transition(uuid,uuid,text,uuid,text) from public,anon,authenticated;
-- No client-facing patient-data policies; server performs all authorization.
