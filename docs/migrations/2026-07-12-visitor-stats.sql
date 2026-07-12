-- 방문자 통계 (Visitor Analytics)
-- 2026-07-12
-- Supabase SQL Editor 에서 실행하세요.

-- 일자별 순방문자 집계 테이블
create table if not exists visit_daily (
  date  date primary key,
  count integer not null default 0
);

-- 동시 방문 시 레이스 컨디션 방지를 위한 원자적 증가 RPC.
-- anon 키로 실행되므로 security definer 로 테이블 쓰기 권한을 위임한다.
create or replace function increment_visit(d date) returns void as $$
  insert into visit_daily(date, count) values (d, 1)
  on conflict (date) do update set count = visit_daily.count + 1;
$$ language sql security definer;

-- anon role 이 통계 조회 및 RPC 실행을 할 수 있도록 권한 부여
grant select on visit_daily to anon;
grant execute on function increment_visit(date) to anon;
