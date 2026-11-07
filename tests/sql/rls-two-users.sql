\set ON_ERROR_STOP on
-- Create a minimal auth.uid() simulation exclusively for ephemeral CI PostgreSQL.
create role authenticated nologin;
create role anon nologin;
create schema auth;
create function auth.uid() returns uuid language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema public, auth to authenticated, anon;
grant execute on function auth.uid() to authenticated, anon;
\i tests/sql/rls-probe-schema.sql
insert into public.rls_probe_records(id,owner_id,synthetic_label) values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','TEST_OWNER_A'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','22222222-2222-4222-8222-222222222222','TEST_OWNER_B');
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
do $$
declare n integer;
begin
 select count(*) into n from public.rls_probe_records;
 if n <> 1 then raise exception 'User A expected exactly one own row, got %',n; end if;
 update public.rls_probe_records set synthetic_label='ATTACK' where synthetic_label='TEST_OWNER_B';
 if found then raise exception 'User A updated user B'; end if;
 delete from public.rls_probe_records where synthetic_label='TEST_OWNER_B';
 if found then raise exception 'User A deleted user B'; end if;
 begin
  insert into public.rls_probe_records(id,owner_id,synthetic_label)
  values('cccccccc-cccc-4ccc-8ccc-cccccccccccc','22222222-2222-4222-8222-222222222222','BAD_INSERT');
  raise exception 'Cross-owner insert was accepted';
 exception when insufficient_privilege then null;
 end;
 begin
  update public.rls_probe_records set owner_id='22222222-2222-4222-8222-222222222222'
   where owner_id='11111111-1111-4111-8111-111111111111';
  raise exception 'Ownership reassignment was accepted';
 exception when insufficient_privilege then null;
 end;
end $$;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
do $$
declare n integer;
begin
 select count(*) into n from public.rls_probe_records;
 if n <> 1 then raise exception 'User B expected exactly one own row, got %',n; end if;
 if not exists(select 1 from public.rls_probe_records where synthetic_label='TEST_OWNER_B')
  then raise exception 'User B cannot read own row'; end if;
end $$;
select set_config('request.jwt.claim.sub','',false);
do $$
declare n integer;
begin
 select count(*) into n from public.rls_probe_records;
 if n <> 0 then raise exception 'No authenticated identity exposed rows'; end if;
end $$;
reset role;
set role anon;
do $$
begin
 begin
  perform 1 from public.rls_probe_records;
  raise exception 'Anon was allowed to access table';
 exception when insufficient_privilege then null;
 end;
end $$;
reset role;
select 'RLS_SYNTHETIC_TWO_USERS_PASS' as result;
