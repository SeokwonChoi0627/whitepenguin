-- 공개 anon 키로 접근 가능하던 테이블 잠금
-- 2026-09-02  (2026-09-02 프로덕션 적용 완료)
--
-- ⚠️ 실행 순서를 지키세요. 틀리면 사이트가 다운됩니다.
--    1) Vercel 환경변수에 SUPABASE_SERVICE_ROLE_KEY 추가
--    2) 재배포 (서버가 service_role 로 접근하도록)
--    3) 그 다음에 이 SQL 실행
--
-- 배경
--   NEXT_PUBLIC_SUPABASE_ANON_KEY 는 브라우저 JS 에 실려 누구나 꺼낼 수 있다.
--   그 키로 아래가 전부 조회 가능한 상태였다:
--     users                 이메일 + bcrypt password_hash + 이름/전화/사업자번호/주소
--     password_reset_tokens 비밀번호 재설정 토큰 (계정 탈취로 직결)
--     quotes                주문자 이름·전화·이메일·배송지
--     qna                   비공개 문의 내용과 작성자 이메일
--   익명 INSERT 권한도 열려 있어 데이터 위조가 가능했다.
--
--   앱은 이 테이블들을 전부 서버(서버 컴포넌트 / API 라우트)에서만 다루고,
--   브라우저용 anon 클라이언트는 스토리지 업로드에만 쓰므로
--   anon 권한을 걷어내도 기능 영향이 없다.
--
-- 문장을 일부러 하나씩 펼쳐 썼다. DO 루프로 묶으면 중간에 무엇이 적용되고
-- 무엇이 안 됐는지 결과에서 구분되지 않는다.

-- ─────────────────────────────────────────────────────────────
-- 1. 민감 테이블 — anon 접근 완전 차단
-- ─────────────────────────────────────────────────────────────
alter table public.users enable row level security;
revoke all on public.users from anon, authenticated;
grant all on public.users to service_role;

alter table public.password_reset_tokens enable row level security;
revoke all on public.password_reset_tokens from anon, authenticated;
grant all on public.password_reset_tokens to service_role;

alter table public.quotes enable row level security;
revoke all on public.quotes from anon, authenticated;
grant all on public.quotes to service_role;

alter table public.qna enable row level security;
revoke all on public.qna from anon, authenticated;
grant all on public.qna to service_role;

-- ─────────────────────────────────────────────────────────────
-- 2. 공개 콘텐츠 테이블 — 읽기는 허용, 익명 쓰기만 차단
-- ─────────────────────────────────────────────────────────────
alter table public.reviews enable row level security;
revoke all on public.reviews from anon, authenticated;
grant select on public.reviews to anon, authenticated;
grant all on public.reviews to service_role;
drop policy if exists reviews_public_read on public.reviews;
create policy reviews_public_read on public.reviews for select to anon, authenticated using (true);

alter table public.community_posts enable row level security;
revoke all on public.community_posts from anon, authenticated;
grant select on public.community_posts to anon, authenticated;
grant all on public.community_posts to service_role;
drop policy if exists community_posts_public_read on public.community_posts;
create policy community_posts_public_read on public.community_posts for select to anon, authenticated using (true);

alter table public.product_images enable row level security;
revoke all on public.product_images from anon, authenticated;
grant select on public.product_images to anon, authenticated;
grant all on public.product_images to service_role;
drop policy if exists product_images_public_read on public.product_images;
create policy product_images_public_read on public.product_images for select to anon, authenticated using (true);

alter table public.product_sold_out enable row level security;
revoke all on public.product_sold_out from anon, authenticated;
grant select on public.product_sold_out to anon, authenticated;
grant all on public.product_sold_out to service_role;
drop policy if exists product_sold_out_public_read on public.product_sold_out;
create policy product_sold_out_public_read on public.product_sold_out for select to anon, authenticated using (true);

alter table public.product_thumbnails enable row level security;
revoke all on public.product_thumbnails from anon, authenticated;
grant select on public.product_thumbnails to anon, authenticated;
grant all on public.product_thumbnails to service_role;
drop policy if exists product_thumbnails_public_read on public.product_thumbnails;
create policy product_thumbnails_public_read on public.product_thumbnails for select to anon, authenticated using (true);

alter table public.product_descriptions enable row level security;
revoke all on public.product_descriptions from anon, authenticated;
grant select on public.product_descriptions to anon, authenticated;
grant all on public.product_descriptions to service_role;
drop policy if exists product_descriptions_public_read on public.product_descriptions;
create policy product_descriptions_public_read on public.product_descriptions for select to anon, authenticated using (true);

alter table public.category_descriptions enable row level security;
revoke all on public.category_descriptions from anon, authenticated;
grant select on public.category_descriptions to anon, authenticated;
grant all on public.category_descriptions to service_role;
drop policy if exists category_descriptions_public_read on public.category_descriptions;
create policy category_descriptions_public_read on public.category_descriptions for select to anon, authenticated using (true);
-- visit_daily 는 2026-07-12-visitor-stats.sql 에서 의도적으로 anon 읽기 +
-- increment_visit RPC 실행을 허용했으므로 그대로 둔다 (비민감 집계 데이터).

-- ─────────────────────────────────────────────────────────────
-- 3. 앞으로 만들 테이블도 기본적으로 anon 에 열리지 않도록
-- ─────────────────────────────────────────────────────────────
alter default privileges in schema public revoke all on tables from anon;

-- ─────────────────────────────────────────────────────────────
-- 검증 — 적용 후 아래를 실행하면 민감 테이블은 rls=true, anon읽기=false 여야 한다
-- ─────────────────────────────────────────────────────────────
-- select c.relname, c.relrowsecurity as rls,
--        has_table_privilege('anon', c.oid, 'SELECT') as anon_select,
--        has_table_privilege('anon', c.oid, 'INSERT') as anon_insert
-- from pg_class c join pg_namespace n on n.oid = c.relnamespace
-- where n.nspname='public' and c.relkind='r'
-- order by c.relname;
