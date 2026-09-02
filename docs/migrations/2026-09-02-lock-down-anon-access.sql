-- 공개 anon 키로 접근 가능한 테이블 잠금
-- 2026-09-02
--
-- ⚠️ 반드시 아래 순서를 지켜서 실행하세요. 순서가 틀리면 사이트가 다운됩니다.
--    1) Vercel 환경변수에 SUPABASE_SERVICE_ROLE_KEY 추가
--    2) 그 상태로 재배포 (서버가 service_role 로 접근하도록)
--    3) 그 다음에 이 SQL 실행
--
-- 배경
--   NEXT_PUBLIC_SUPABASE_ANON_KEY 는 브라우저 JS 에 그대로 실려 누구나 꺼낼 수 있다.
--   그 키로 아래 데이터가 전부 조회 가능한 상태였다:
--     users                 이메일 + bcrypt password_hash + 이름/전화/사업자번호/주소
--     password_reset_tokens 비밀번호 재설정 토큰 (계정 탈취로 직결)
--     quotes                주문자 이름·전화·이메일·배송지
--     qna                   비공개 문의 내용과 작성자 이메일
--   또한 익명 INSERT 권한도 열려 있어 데이터 위조가 가능했다.
--
--   애플리케이션 코드는 이 테이블들을 전부 서버(서버 컴포넌트 / API 라우트)에서만
--   읽고 쓴다. 브라우저용 anon 클라이언트는 스토리지 업로드에만 쓰인다.
--   따라서 anon 권한을 걷어내도 정상 기능에는 영향이 없다.

-- ─────────────────────────────────────────────────────────────
-- 1. 민감 테이블 — anon 접근 완전 차단
-- ─────────────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['users','password_reset_tokens','quotes','qna'] loop
    if to_regclass('public.'||t) is not null then
      execute format('alter table public.%I enable row level security', t);
      execute format('revoke all on public.%I from anon, authenticated', t);
      execute format('grant all on public.%I to service_role', t);
      raise notice '잠금 완료(전체 차단): %', t;
    else
      raise notice '건너뜀(테이블 없음): %', t;
    end if;
  end loop;
end $$;

-- ─────────────────────────────────────────────────────────────
-- 2. 공개 콘텐츠 테이블 — 읽기는 허용, 쓰기만 차단
--    (상품 이미지·품절 여부 등은 공개 데이터라 읽기를 막을 이유가 없다.
--     다만 익명 INSERT/UPDATE/DELETE 는 위조 통로이므로 걷어낸다.)
-- ─────────────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'reviews','community_posts','product_images','product_sold_out',
    'product_thumbnails','product_descriptions','category_descriptions'
  ] loop
    if to_regclass('public.'||t) is not null then
      execute format('alter table public.%I enable row level security', t);
      execute format('revoke all on public.%I from anon, authenticated', t);
      execute format('grant select on public.%I to anon, authenticated', t);
      execute format('grant all on public.%I to service_role', t);

      execute format('drop policy if exists %I on public.%I', t||'_public_read', t);
      execute format(
        'create policy %I on public.%I for select to anon, authenticated using (true)',
        t||'_public_read', t
      );
      raise notice '잠금 완료(읽기만 허용): %', t;
    else
      raise notice '건너뜀(테이블 없음): %', t;
    end if;
  end loop;
end $$;

-- visit_daily 는 2026-07-12-visitor-stats.sql 에서 의도적으로 anon 읽기 +
-- increment_visit RPC 실행을 허용했으므로 그대로 둔다 (비민감 집계 데이터).

-- ─────────────────────────────────────────────────────────────
-- 3. 앞으로 만들 테이블도 기본적으로 anon 에 열리지 않도록
-- ─────────────────────────────────────────────────────────────
alter default privileges in schema public revoke all on tables from anon;

-- ─────────────────────────────────────────────────────────────
-- 검증 — anon 으로 users 를 읽으면 아무 행도 안 나와야 한다
--   select * from public.users limit 1;   (service_role 로는 보임)
-- 실제 확인은 아래 명령으로:
--   curl -s "$SUPABASE_URL/rest/v1/users?select=id&limit=1" \
--        -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY"
--   → 401 또는 빈 배열이면 정상
-- ─────────────────────────────────────────────────────────────
