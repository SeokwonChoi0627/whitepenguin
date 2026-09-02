-- 롤백 — 2026-09-02-lock-down-anon-access.sql 적용 후 사이트가 깨졌을 때만 실행
--
-- ⚠️ 이걸 실행하면 개인정보가 다시 공개 노출됩니다.
--    장애를 멈추는 임시 조치로만 쓰고, 원인(대개 SUPABASE_SERVICE_ROLE_KEY 미설정)을
--    고친 뒤 반드시 다시 잠그세요.

do $$
declare t text;
begin
  foreach t in array array[
    'users','password_reset_tokens','quotes','qna',
    'reviews','community_posts','product_images','product_sold_out',
    'product_thumbnails','product_descriptions','category_descriptions'
  ] loop
    if to_regclass('public.'||t) is not null then
      execute format('drop policy if exists %I on public.%I', t||'_public_read', t);
      execute format('alter table public.%I disable row level security', t);
      execute format('grant all on public.%I to anon, authenticated', t);
      raise notice '롤백됨: %', t;
    end if;
  end loop;
end $$;

alter default privileges in schema public grant all on tables to anon;
