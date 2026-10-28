create extension if not exists pgcrypto;
create table organizations (id uuid primary key default gen_random_uuid(), name text not null, created_at timestamptz not null default now());
create table clinics (id uuid primary key default gen_random_uuid(), organization_id uuid not null references organizations(id), name text not null, address text, latitude double precision, longitude double precision, created_at timestamptz not null default now());
create table doctors (id uuid primary key default gen_random_uuid(), display_name text not null, specialty text not null, registration_number text, verified boolean not null default false);
create table doctor_clinics (doctor_id uuid references doctors(id),clinic_id uuid references clinics(id), fee_inr integer not null default 0 check(fee_inr>=0), primary key(doctor_id,clinic_id));
create table staff_memberships (user_id uuid not null references auth.users(id),clinic_id uuid not null references clinics(id),role text not null check(role in ('receptionist','doctor','clinic_admin')),active boolean not null default true, primary key(user_id,clinic_id,role));
create table patients (id uuid primary key default gen_random_uuid(), full_name text not null, mobile text, account_user_id uuid references auth.users(id), created_at timestamptz default now());
create table doctor_sessions (id uuid primary key default gen_random_uuid(),doctor_id uuid not null references doctors(id), clinic_id uuid not null references clinics(id), starts_at timestamptz not null,ends_at timestamptz not null, status text not null default 'scheduled' check(status in ('scheduled','open','paused','closed')),next_token integer not null default 1, queue_version bigint not null default 0,check(ends_at>starts_at));
create table appointment_slots (id uuid primary key default gen_random_uuid(),session_id uuid not null references doctor_sessions(id),starts_at timestamptz not null,ends_at timestamptz not null, capacity integer not null check(capacity>0),check(ends_at>starts_at));
create table appointments (id uuid primary key default gen_random_uuid(),session_id uuid not null references doctor_sessions(id),slot_id uuid references appointment_slots(id), patient_id uuid not null references patients(id),source text not null check(source in ('online','walkin')),status text not null default 'booked' check(status in ('booked','checked_in','called','in_consultation','completed','cancelled','no_show')),created_by uuid references auth.users(id),created_at timestamptz not null default now(),checked_in_at timestamptz);
create table queue_entries (id uuid primary key default gen_random_uuid(),appointment_id uuid not null unique references appointments(id),session_id uuid not null references doctor_sessions(id),token_number integer not null,sort_key numeric(20,6) not null,status text not null default 'waiting' check(status in ('waiting','on_hold','skipped','called','in_consultation','completed','cancelled')),created_at timestamptz not null default now(),unique(session_id,token_number));
create index queue_order_idx on queue_entries(session_id,status,sort_key);
create table queue_events(id uuid primary key default gen_random_uuid(),session_id uuid not null references doctor_sessions(id),queue_entry_id uuid references queue_entries(id),actor_id uuid references auth.users(id),action text not null,reason text,details jsonb not null default '{}'::jsonb,created_at timestamptz not null default now());
create table public_tracking_tokens(id uuid primary key default gen_random_uuid(),appointment_id uuid not null references appointments(id),token_hash text not null unique,expires_at timestamptz not null,revoked_at timestamptz);
create or replace view doctor_directory as select d.id,d.display_name,d.specialty,c.name as clinic_name,c.id as clinic_id from doctors d join doctor_clinics dc on dc.doctor_id=d.id join clinics c on c.id=dc.clinic_id where d.verified=true;
alter table organizations enable row level security;
alter table clinics enable row level security;
alter table doctors enable row level security;
alter table doctor_clinics enable row level security;
alter table staff_memberships enable row level security;
alter table patients enable row level security;
alter table doctor_sessions enable row level security;
alter table appointment_slots enable row level security;
alter table appointments enable row level security;
alter table queue_entries enable row level security;
alter table queue_events enable row level security;
alter table public_tracking_tokens enable row level security;
-- All privileged mutations execute via authenticated server routes using service credentials.
-- No direct client table grants/policies are provided in this scaffold.
revoke all on table patients,appointments,queue_entries,queue_events,public_tracking_tokens from anon,authenticated;
create or replace function issue_walkin(p_session uuid,p_name text,p_mobile text,p_actor uuid)
returns table(appointment_id uuid,token_number integer) language plpgsql security invoker as $$
declare v_session doctor_sessions%rowtype;v_patient uuid;v_appointment uuid;v_number integer;
begin
 select * into v_session from doctor_sessions where id=p_session for update;
 if not found or v_session.status <> 'open' then raise exception 'Session is not open'; end if;
 if length(trim(p_name)) < 2 or p_mobile !~ '^[0-9]{10}$' then raise exception 'Invalid patient data';end if;
 if not exists(select 1 from staff_memberships where user_id=p_actor and clinic_id=v_session.clinic_id and active and role in ('receptionist','clinic_admin')) then raise exception 'Not authorized';end if;
 insert into patients(full_name,mobile) values(trim(p_name),p_mobile) returning id into v_patient;
 insert into appointments(session_id,patient_id,source,created_by,status,checked_in_at) values(p_session,v_patient,'walkin',p_actor,'checked_in',now()) returning id into v_appointment;
 v_number:=v_session.next_token;
 insert into queue_entries(appointment_id,session_id,token_number,sort_key) values(v_appointment,p_session,v_number,v_number);
 update doctor_sessions set next_token=next_token+1,queue_version=queue_version+1 where id=p_session;
 insert into queue_events(session_id,actor_id,action,details) values(p_session,p_actor,'walkin_issued',jsonb_build_object('token_number',v_number));
 return query select v_appointment,v_number;
end $$;
create or replace function reorder_queue(p_session uuid,p_entry uuid,p_after uuid,p_actor uuid,p_expected_version bigint,p_reason text)
returns bigint language plpgsql security invoker as $$
declare v_session doctor_sessions%rowtype;v_after numeric;v_next numeric;v_new numeric;v_version bigint;
begin
 select * into v_session from doctor_sessions where id=p_session for update;
 if not found or v_session.queue_version<>p_expected_version then raise exception 'Queue version conflict';end if;
 if not exists(select 1 from staff_memberships where user_id=p_actor and clinic_id=v_session.clinic_id and active and role in ('receptionist','clinic_admin')) then raise exception 'Not authorized';end if;
 if length(trim(coalesce(p_reason,'')))<3 then raise exception 'Reason required';end if;
 if not exists(select 1 from queue_entries where id=p_entry and session_id=p_session and status='waiting') then raise exception 'Entry not eligible';end if;
 if p_after=p_entry then raise exception 'Cannot move after self';end if;
 if p_after is null then
   select min(sort_key) into v_next from queue_entries where session_id=p_session and status='waiting' and id<>p_entry;
   v_new:=coalesce(v_next,1)-1;
 else
   select sort_key into v_after from queue_entries where id=p_after and session_id=p_session and status='waiting';
   if v_after is null then raise exception 'Invalid anchor';end if;
   select min(sort_key) into v_next from queue_entries where session_id=p_session and status='waiting' and id not in(p_entry,p_after) and sort_key>v_after;
   v_new:=case when v_next is null then v_after+1 else (v_after+v_next)/2 end;
 end if;
 update queue_entries set sort_key=v_new where id=p_entry;
 update doctor_sessions set queue_version=queue_version+1 where id=p_session returning queue_version into v_version;
 insert into queue_events(session_id,queue_entry_id,actor_id,action,reason) values(p_session,p_entry,p_actor,'reorder',trim(p_reason));
 return v_version;
end $$;
revoke execute on function issue_walkin(uuid,text,text,uuid) from public,anon,authenticated;
revoke execute on function reorder_queue(uuid,uuid,uuid,uuid,bigint,text) from public,anon,authenticated;
