# DB 공개 접근 차단 가이드

## 무엇이 문제였나

`NEXT_PUBLIC_SUPABASE_ANON_KEY` 는 이름 그대로 **브라우저 JS 에 실려 나가는 공개 값**입니다.
개발자 도구만 열면 누구나 꺼낼 수 있고, 그 키로 Supabase REST API 를 직접 호출할 수 있습니다.

2026-09-02 점검 결과, 이 키만으로 아래 데이터가 전부 조회 가능한 상태였습니다.

| 테이블 | 노출된 내용 | 위험도 |
|---|---|---|
| `password_reset_tokens` | 비밀번호 재설정 토큰 | **치명** — 관리자 포함 임의 계정 탈취 |
| `users` (35건) | 이메일 + bcrypt `password_hash` + 이름·전화·사업자번호·주소 | **치명** — 자격증명 유출 |
| `quotes` (44건) | 주문자 이름·전화·이메일·배송지 | **높음** — 고객 개인정보 |
| `qna` (10건) | 비공개 문의 내용 + 작성자 이메일 | **높음** — 앱의 비공개 처리 우회됨 |
| `reviews`, `community_posts`, 상품 관련 | 공개 콘텐츠 | 낮음 (단, 익명 위조 가능했음) |

추가로 **익명 INSERT 권한도 열려 있었습니다.** (`users` 에 익명 삽입 시도가
권한이 아니라 NOT NULL 제약으로만 거부됨 = 권한 검사는 통과)

> `password_reset_tokens` 는 점검 시점에 비어 있었지만, 누군가 비밀번호 찾기를
> 누르는 순간 그 토큰이 공개 조회 가능해집니다. 가장 급한 항목이었습니다.

## 해결 방식

애플리케이션 코드는 이 테이블들을 **전부 서버(서버 컴포넌트 / API 라우트)에서만** 다룹니다.
브라우저용 anon 클라이언트(`lib/supabase-browser.ts`)는 **스토리지 업로드에만** 쓰입니다.
따라서 anon 의 테이블 권한을 걷어내도 기능에는 영향이 없습니다.

- `lib/supabase.ts` (서버 클라이언트) → `SUPABASE_SERVICE_ROLE_KEY` 사용
- 민감 테이블 → anon 권한 전면 회수 + RLS
- 공개 콘텐츠 테이블 → 읽기만 허용, 익명 쓰기 차단

## 적용 순서 (⚠️ 순서 중요)

**이 순서를 지키지 않으면 사이트가 다운됩니다.**

### 1단계 — Vercel 환경변수 추가

Vercel → 프로젝트 → Settings → Environment Variables

```
SUPABASE_SERVICE_ROLE_KEY = (Supabase → Settings → API → service_role)
```

Production / Preview / Development 모두 체크. **`NEXT_PUBLIC_` 접두사를 붙이면 안 됩니다.**

### 2단계 — 재배포

환경변수는 재배포해야 반영됩니다. Vercel → Deployments → 최신 배포 → Redeploy.

배포 후 로그에 아래 경고가 **없어야** 정상입니다:

```
[supabase] SUPABASE_SERVICE_ROLE_KEY 가 없어 anon 키로 동작합니다.
```

### 3단계 — 잠금 SQL 실행

Supabase → SQL Editor 에서 실행:

```
docs/migrations/2026-09-02-lock-down-anon-access.sql
```

### 4단계 — 확인

- 사이트 정상 동작 확인: 메인 / 상품 / 리뷰 / 커뮤니티 / 로그인 / 마이페이지
- anon 키로 `users` 조회 시 빈 배열 또는 401 이 나오는지 확인

## 문제가 생기면

`docs/migrations/2026-09-02-lock-down-anon-access-ROLLBACK.sql` 실행 → 즉시 원복됩니다.
대부분의 원인은 1~2단계 누락(service_role 키 미설정 또는 재배포 안 함)입니다.
원복은 개인정보가 다시 노출되는 상태이므로, 원인을 고친 뒤 반드시 다시 잠그세요.

## 적용 결과 (2026-09-02)

프로덕션 적용 후 anon 키로 실제 확인한 결과:

| 대상 | 결과 |
|---|---|
| `users` / `password_reset_tokens` / `quotes` / `qna` / `return_requests` | **HTTP 401 차단** ✅ |
| 공개 콘텐츠 7개 테이블 | 읽기 정상 ✅ |
| `users` / `quotes` / `reviews` 익명 INSERT | **42501 permission denied** ✅ |
| 사이트 전체 (메인·상품·리뷰·커뮤니티·Q&A·발주서·로그인) | 정상 ✅ |

## 유출 대응

이미 공개돼 있던 기간이 있으므로, 아래를 함께 검토하세요.

1. **전체 사용자 비밀번호 재설정 안내** — bcrypt 해시라 즉시 로그인은 어렵지만,
   이메일+해시 조합이 노출된 이상 오프라인 크래킹·크리덴셜 스터핑 대상입니다.
2. **키 재발급은 불필요합니다.** anon 키는 원래 브라우저에 공개되는 값이라 유출된 것이 아니라,
   그 키에 부여된 **권한이 과했던 것**이 문제였습니다. 권한을 걷어냈으므로 키는 그대로 둬도 됩니다.
   service_role 키는 노출된 적이 없습니다.
3. **개인정보 유출 신고 의무 검토** — 개인정보보호법상 신고 대상 여부는 법률 자문을 받으세요.

> 2026-09-02 기준, 운영자 판단으로 1번(비밀번호 재설정 안내)은 시행하지 않기로 했습니다.
> 잠금 이전에 데이터를 수집해 간 주체가 있다면 해당 이메일·해시는 회수되지 않습니다.
