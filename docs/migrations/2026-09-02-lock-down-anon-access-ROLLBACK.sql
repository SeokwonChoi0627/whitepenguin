-- 롤백 — 2026-09-02-lock-down-anon-access.sql 적용 후 사이트가 깨졌을 때만 실행
--
-- ⚠️ 실행하면 개인정보가 다시 공개 노출됩니다.
--    장애를 멈추는 임시 조치로만 쓰고, 원인(대개 SUPABASE_SERVICE_ROLE_KEY 미설정
--    또는 재배포 누락)을 고친 뒤 반드시 다시 잠그세요.

drop policy if exists users_public_read on public.users;
alter table public.users disable row level security;
grant all on public.users to anon, authenticated;

drop policy if exists password_reset_tokens_public_read on public.password_reset_tokens;
alter table public.password_reset_tokens disable row level security;
grant all on public.password_reset_tokens to anon, authenticated;

drop policy if exists quotes_public_read on public.quotes;
alter table public.quotes disable row level security;
grant all on public.quotes to anon, authenticated;

drop policy if exists qna_public_read on public.qna;
alter table public.qna disable row level security;
grant all on public.qna to anon, authenticated;

drop policy if exists reviews_public_read on public.reviews;
alter table public.reviews disable row level security;
grant all on public.reviews to anon, authenticated;

drop policy if exists community_posts_public_read on public.community_posts;
alter table public.community_posts disable row level security;
grant all on public.community_posts to anon, authenticated;

drop policy if exists product_images_public_read on public.product_images;
alter table public.product_images disable row level security;
grant all on public.product_images to anon, authenticated;

drop policy if exists product_sold_out_public_read on public.product_sold_out;
alter table public.product_sold_out disable row level security;
grant all on public.product_sold_out to anon, authenticated;

drop policy if exists product_thumbnails_public_read on public.product_thumbnails;
alter table public.product_thumbnails disable row level security;
grant all on public.product_thumbnails to anon, authenticated;

drop policy if exists product_descriptions_public_read on public.product_descriptions;
alter table public.product_descriptions disable row level security;
grant all on public.product_descriptions to anon, authenticated;

drop policy if exists category_descriptions_public_read on public.category_descriptions;
alter table public.category_descriptions disable row level security;
grant all on public.category_descriptions to anon, authenticated;

alter default privileges in schema public grant all on tables to anon;
