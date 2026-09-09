-- 소셜 가입 허용 — users.password_hash 의 NOT NULL 해제
-- 2026-09-10
-- Supabase SQL Editor 에서 실행하세요.
--
-- 문제
--   네이버·카카오로 가입하면 비밀번호가 없어 password_hash 를 null 로 넣는데,
--   컬럼이 NOT NULL 이라 삽입이 실패했다. 그래서 소셜 회원가입이 한 번도
--   성공한 적이 없다 (이전 코드가 삽입 오류를 무시하고 로그인시켜서 드러나지 않았다).
--
-- 애플리케이션은 이미 비밀번호 없는 계정을 전제로 만들어져 있다.
--   app/api/user/profile/route.ts   hasPassword: !!user.password_hash
--   app/mypage/settings/page.tsx    hasPassword 로 비밀번호 변경 UI 노출 여부 결정
--   app/api/user/password/route.ts  !user.password_hash 면 변경 거부
--   options.ts (credentials)        !user.password_hash 면 비밀번호 로그인 거부
-- 즉 DB 제약만 현실과 어긋나 있었다.

alter table public.users alter column password_hash drop not null;

comment on column public.users.password_hash is
  '이메일 가입자의 bcrypt 해시. 소셜(네이버·카카오) 가입자는 null.';

-- 확인용
--   select is_nullable from information_schema.columns
--   where table_schema='public' and table_name='users' and column_name='password_hash';
--   → YES 이면 정상
