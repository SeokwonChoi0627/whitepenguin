-- 메인 팝업 배너 설정
-- 2026-09-02
-- Supabase SQL Editor 에서 실행하세요.
--
-- 기존에는 배너 이미지와 링크가 코드에 하드코딩돼 있어, 내용을 바꾸거나
-- 내리려면 재배포가 필요했다. 기간 개념도 없어서 이벤트가 끝나도 계속 떴다.

create table if not exists public.popup_settings (
  -- 단일 행만 존재하도록 강제한다 (설정은 하나뿐)
  id         smallint primary key default 1 check (id = 1),
  is_enabled boolean not null default true,
  image_url  text,
  link_href  text not null default '/products',
  alt_text   text not null default '이벤트 안내',
  -- 날짜만 다룬다. 시분 단위 예약은 필요 없고, 시간대 혼동만 생긴다.
  starts_on  date,
  ends_on    date,
  updated_at timestamptz not null default now(),

  constraint popup_settings_period check (starts_on is null or ends_on is null or starts_on <= ends_on)
);

alter table public.popup_settings enable row level security;
revoke all on public.popup_settings from anon, authenticated;
grant all on public.popup_settings to service_role;

create or replace function public.touch_popup_settings() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists popup_settings_touch on public.popup_settings;
create trigger popup_settings_touch
  before update on public.popup_settings
  for each row execute function public.touch_popup_settings();

-- 현재 운영 중인 팝업을 그대로 초기값으로 넣는다 (기존 동작 유지)
insert into public.popup_settings (id, is_enabled, image_url, link_href, alt_text, ends_on)
values (1, true, '/popup-banner.jpg', '/products', '오픈기념 무료배송 이벤트', '2026-12-31')
on conflict (id) do nothing;
