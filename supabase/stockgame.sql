-- 딥씨 거래소 게임 방 저장용 (Supabase SQL Editor 에서 한 번 실행)
-- 테이블은 RLS 로 직접 접근을 막고, 아래 함수로만 읽고 쓴다.

create table if not exists public.stockgame_rooms (
  code text primary key,
  data jsonb not null,
  version int not null,
  updated_at timestamptz not null default now()
);

alter table public.stockgame_rooms enable row level security;

create or replace function public.stockgame_get(p_code text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select data from public.stockgame_rooms where code = p_code;
$$;

create or replace function public.stockgame_insert(p_code text, p_data jsonb)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  -- 하루 지난 방은 정리
  delete from public.stockgame_rooms where updated_at < now() - interval '1 day';
  insert into public.stockgame_rooms (code, data, version)
  values (p_code, p_data, (p_data->>'version')::int)
  on conflict (code) do nothing;
  return found;
end;
$$;

create or replace function public.stockgame_cas(p_code text, p_data jsonb, p_expected int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.stockgame_rooms
     set data = p_data, version = (p_data->>'version')::int, updated_at = now()
   where code = p_code and version = p_expected;
  return found;
end;
$$;

revoke all on function public.stockgame_get(text) from public;
revoke all on function public.stockgame_insert(text, jsonb) from public;
revoke all on function public.stockgame_cas(text, jsonb, int) from public;
grant execute on function public.stockgame_get(text) to anon, service_role;
grant execute on function public.stockgame_insert(text, jsonb) to anon, service_role;
grant execute on function public.stockgame_cas(text, jsonb, int) to anon, service_role;
