-- VIP 시크릿 발주 링크
-- 2026-09-30
-- Supabase SQL Editor 에서 실행하세요.
--
-- 링크(token)를 아는 사람만 /vip/<token> 에서 VIP 가격으로 발주할 수 있다.
-- token 이 곧 접근 권한이므로 anon 접근을 차단하고 서버(service_role)만 읽는다.

create table if not exists public.vip_links (
  id                uuid primary key default gen_random_uuid(),
  token             text not null unique,
  label             text not null,                       -- 관리자용 고객 이름
  discount_percent  integer not null default 0
                      check (discount_percent between 0 and 90),
  price_overrides   jsonb not null default '{}'::jsonb,  -- { "상품id": VIP단가 }
  product_ids       text[],                              -- null = 전체 상품 (신규 상품 자동 포함)

  -- 발주 화면 기본값 (고객이 발주할 때 수정 가능)
  company_name      text,
  representative    text,
  phone             text,
  email             text,
  address           text,
  business_number   text,

  is_active         boolean not null default true,
  expires_at        timestamptz,
  last_ordered_at   timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- anon 차단, service_role 만 허용
alter table public.vip_links enable row level security;
revoke all on public.vip_links from anon, authenticated;
grant all on public.vip_links to service_role;

-- updated_at 자동 갱신
create or replace function public.touch_vip_links() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists vip_links_touch on public.vip_links;
create trigger vip_links_touch
  before update on public.vip_links
  for each row execute function public.touch_vip_links();

-- ─────────────────────────────────────────────────────────────
-- quotes 에 VIP 발주 표시
-- ─────────────────────────────────────────────────────────────
alter table public.quotes
  add column if not exists vip_link_id uuid references public.vip_links(id) on delete set null;

create index if not exists quotes_vip_link_idx on public.quotes (vip_link_id) where vip_link_id is not null;

comment on column public.quotes.vip_link_id is 'VIP 시크릿 링크로 들어온 발주면 해당 링크 id';
