-- 쿠폰 / 프로모션 코드
-- 2026-09-02
-- Supabase SQL Editor 에서 실행하세요.
--
-- 설계: docs/superpowers/specs/2026-09-02-coupons-design.md
--
-- 두 테이블 모두 anon 접근을 차단한다. 쿠폰 정책이 노출되면 미발행 코드를
-- 미리 알아내 쓸 수 있고, 사용기록에는 user_id 가 들어간다.
-- 서버는 service_role 로 접근한다.

create table if not exists public.coupons (
  id                    uuid primary key default gen_random_uuid(),
  code                  text unique,                 -- null = 코드 없이 전 회원 대상
  name                  text not null,
  description           text,
  discount_type         text not null check (discount_type in ('fixed','percent')),
  discount_value        integer not null check (discount_value > 0),
  min_order_amount      integer not null default 0 check (min_order_amount >= 0),
  max_discount_amount   integer check (max_discount_amount > 0),
  starts_at             timestamptz,
  expires_at            timestamptz,
  max_redemptions       integer check (max_redemptions > 0),
  auto_apply_to_members boolean not null default false,
  is_active             boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  -- percent 쿠폰만 상한을 가질 수 있다
  constraint coupons_cap_only_for_percent
    check (max_discount_amount is null or discount_type = 'percent'),
  -- percent 할인은 100% 를 넘을 수 없다
  constraint coupons_percent_range
    check (discount_type <> 'percent' or discount_value <= 100),
  -- 코드가 없으면 전 회원 대상이어야 한다 (아무도 못 쓰는 쿠폰 방지)
  constraint coupons_codeless_must_be_auto
    check (code is not null or auto_apply_to_members)
);

create table if not exists public.coupon_redemptions (
  id              uuid primary key default gen_random_uuid(),
  coupon_id       uuid not null references public.coupons(id) on delete cascade,
  user_id         text not null,
  order_number    text not null,
  discount_amount integer not null check (discount_amount >= 0),
  redeemed_at     timestamptz not null default now(),

  -- 1인 1회 — 앱 코드의 조회 후 삽입만으로는 동시 제출을 막을 수 없다
  constraint coupon_redemptions_once_per_user unique (coupon_id, user_id)
);

create index if not exists coupon_redemptions_user_idx  on public.coupon_redemptions (user_id);
create index if not exists coupon_redemptions_order_idx on public.coupon_redemptions (order_number);
create index if not exists coupons_code_idx             on public.coupons (code) where code is not null;

-- anon 차단, service_role 만 허용
alter table public.coupons            enable row level security;
alter table public.coupon_redemptions enable row level security;
revoke all on public.coupons            from anon, authenticated;
revoke all on public.coupon_redemptions from anon, authenticated;
grant all on public.coupons            to service_role;
grant all on public.coupon_redemptions to service_role;

-- updated_at 자동 갱신
create or replace function public.touch_coupons() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists coupons_touch on public.coupons;
create trigger coupons_touch
  before update on public.coupons
  for each row execute function public.touch_coupons();

-- ─────────────────────────────────────────────────────────────
-- 신규가입 축하 쿠폰 (기존 회원 포함 전 회원 대상)
-- ─────────────────────────────────────────────────────────────
insert into public.coupons
  (code, name, description, discount_type, discount_value,
   min_order_amount, auto_apply_to_members, is_active)
select
  null, '신규가입 축하 쿠폰', '가입해 주셔서 감사합니다. 첫 발주에 사용해 보세요.',
  'fixed', 1000, 30000, true, true
where not exists (
  select 1 from public.coupons where name = '신규가입 축하 쿠폰'
);

-- ─────────────────────────────────────────────────────────────
-- quotes 에 적용된 쿠폰 기록용 컬럼
-- ─────────────────────────────────────────────────────────────
alter table public.quotes
  add column if not exists coupon_id       uuid,
  add column if not exists coupon_name     text,
  add column if not exists coupon_discount integer;

comment on column public.quotes.coupon_discount is '이 발주에 적용된 쿠폰 할인 금액';
