-- 반품요청 (Return Requests)
-- 2026-09-02
-- Supabase SQL Editor 에서 실행하세요.
--
-- ⚠️ 이 테이블은 환급계좌(은행/계좌번호/예금주)를 저장하는 민감 테이블입니다.
--    anon 키(브라우저에 노출됨)로는 절대 읽거나 쓸 수 없어야 하므로
--    RLS 를 켜되 어떤 anon 정책도 만들지 않습니다.
--    서버 라우트는 service_role 키(SUPABASE_SERVICE_ROLE_KEY)로 접근하며,
--    service_role 은 RLS 를 우회합니다.

create table if not exists public.return_requests (
  id                    uuid primary key default gen_random_uuid(),
  return_number         text not null unique,          -- R260902XXXX
  order_number          text not null,                 -- quotes.order_number
  quote_id              text,                          -- quotes.id (참조용, FK 미설정)
  user_id               text not null,                 -- 신청자 (quotes.user_id 와 일치해야 함)

  -- 신청자 정보 (신청 시점 스냅샷)
  company_name          text,
  representative        text,
  phone                 text,
  email                 text,

  -- 반품 사유
  reason                text not null,                 -- change_of_mind | defective | wrong_item | different | other
  reason_detail         text,

  -- 반품 품목 [{ name, size, quantity, orderedQuantity }]
  items                 jsonb not null default '[]'::jsonb,

  -- 환급계좌
  refund_bank           text not null,
  refund_account        text not null,
  refund_holder         text not null,

  -- 회수지
  pickup_address        text not null,
  pickup_address_detail text,

  -- 증빙 사진 (community-images 버킷 public URL 배열)
  photos                jsonb not null default '[]'::jsonb,

  -- 처리 상태
  status                text not null default 'requested',  -- requested | approved | collecting | completed | rejected
  admin_note            text,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists return_requests_user_id_idx      on public.return_requests (user_id);
create index if not exists return_requests_order_number_idx on public.return_requests (order_number);
create index if not exists return_requests_created_at_idx   on public.return_requests (created_at desc);

-- RLS 활성화 + anon/authenticated 정책 없음 = 공개 키로는 접근 불가
alter table public.return_requests enable row level security;
revoke all on public.return_requests from anon, authenticated;
-- service_role 은 RLS 를 우회하지만 테이블 권한 자체는 필요하다
grant all on public.return_requests to service_role;

comment on table  public.return_requests            is '반품요청 — 환급계좌 포함 민감 테이블. service_role 로만 접근할 것';
comment on column public.return_requests.refund_account is '환급 계좌번호 (숫자만)';
comment on column public.return_requests.status     is 'requested 접수 / approved 승인 / collecting 회수중 / completed 환불완료 / rejected 반려';

-- updated_at 자동 갱신
create or replace function public.touch_return_requests() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists return_requests_touch on public.return_requests;
create trigger return_requests_touch
  before update on public.return_requests
  for each row execute function public.touch_return_requests();
