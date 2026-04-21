-- 계정-발주서 정보 연동을 위한 users 테이블 확장
-- 실행: Supabase Dashboard → SQL Editor → New Query → 실행
-- 안전: IF NOT EXISTS 사용, 기존 데이터 무손실

alter table public.users
  add column if not exists business_number text,
  add column if not exists address         text,
  add column if not exists address_detail  text;

comment on column public.users.business_number is '사업자등록번호';
comment on column public.users.address        is '배송지 기본주소 (도로명/지번)';
comment on column public.users.address_detail is '배송지 상세주소 (동/호수/건물명)';
