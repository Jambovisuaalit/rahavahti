-- Synthetic-only RLS probe. NO financial data or live identity provider is connected.
-- Applied to an isolated CI PostgreSQL database; do not treat this as a production migration approval.
create table if not exists public.rls_probe_records (
  id uuid primary key,
  owner_id uuid not null,
  synthetic_label text not null check (length(synthetic_label) between 1 and 100),
  created_at timestamptz not null default now()
);
alter table public.rls_probe_records enable row level security;
alter table public.rls_probe_records force row level security;
revoke all on public.rls_probe_records from public, anon, authenticated;
grant select, insert, update, delete on public.rls_probe_records to authenticated;

create policy "probe_select_own" on public.rls_probe_records
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "probe_insert_own" on public.rls_probe_records
  for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "probe_update_own" on public.rls_probe_records
  for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
create policy "probe_delete_own" on public.rls_probe_records
  for delete to authenticated using ((select auth.uid()) = owner_id);
