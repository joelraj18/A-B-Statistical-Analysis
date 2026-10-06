-- A/B Experimentation Engine — experiment archive
-- Run in the Supabase SQL editor or with `supabase db push`.

create table if not exists public.experiments (
    id             uuid primary key default gen_random_uuid(),
    user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
    name           text not null check (char_length(name) between 1 and 200),
    hypothesis     jsonb not null default '{}'::jsonb,
    metric         text not null check (metric in ('binary', 'continuous')),
    status         text not null default 'concluded' check (status in ('draft', 'running', 'concluded')),

    -- Raw inputs (BinaryInput | ContinuousInput) and the computed summary.
    inputs         jsonb not null,
    summary        jsonb not null,
    is_significant boolean not null default false,
    verdict        text not null check (verdict in ('ship', 'rollback', 'inconclusive', 'invalid')),

    created_at     timestamptz not null default now(),
    updated_at     timestamptz not null default now(),

    -- Binary experiments must be internally consistent.
    constraint binary_inputs_valid check (
        metric <> 'binary' or (
            (inputs ->> 'visitorsA')::bigint > 0
            and (inputs ->> 'visitorsB')::bigint > 0
            and (inputs ->> 'conversionsA')::bigint between 0 and (inputs ->> 'visitorsA')::bigint
            and (inputs ->> 'conversionsB')::bigint between 0 and (inputs ->> 'visitorsB')::bigint
        )
    ),
    constraint continuous_inputs_valid check (
        metric <> 'continuous' or (
            (inputs ->> 'nA')::bigint >= 2
            and (inputs ->> 'nB')::bigint >= 2
            and (inputs ->> 'sdA')::numeric >= 0
            and (inputs ->> 'sdB')::numeric >= 0
        )
    )
);

create index if not exists experiments_user_created_idx
    on public.experiments (user_id, created_at desc);

-- Row Level Security: every user sees only their own ledger.
-- `(select auth.uid())` is evaluated once per statement instead of per row.
alter table public.experiments enable row level security;

create policy "experiments_select_own" on public.experiments
    for select to authenticated using ((select auth.uid()) = user_id);

create policy "experiments_insert_own" on public.experiments
    for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "experiments_update_own" on public.experiments
    for update to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

create policy "experiments_delete_own" on public.experiments
    for delete to authenticated using ((select auth.uid()) = user_id);

-- Keep updated_at current. A fixed search_path prevents search-path hijacking.
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists set_updated_at on public.experiments;
create trigger set_updated_at
    before update on public.experiments
    for each row execute function public.handle_updated_at();
