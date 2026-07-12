# 방문자 통계 (Visitor Analytics) 설계

작성일: 2026-07-12

## 목표

화이트펭귄 홈페이지 관리자 페이지(`/admin`)에서 **오늘 순방문자수**와 **누적 순방문자수**를 확인할 수 있게 한다.

## 범위 (Scope)

- 신규 기능 추가만 수행한다. 기존 코드/테이블/동작은 변경하지 않는다.
- 유일한 기존 파일 수정: `app/layout.tsx`에 `<VisitTracker/>` 컴포넌트 한 줄 삽입 (모든 페이지에서 방문을 감지하기 위해 불가피, 사용자 승인됨).

## 정의

- **순방문자(unique visitor)**: 한 방문자가 하루에 여러 번 들어와도 1로 집계.
- **오늘 방문자수**: 오늘(Asia/Seoul 기준) 날짜의 순방문자 수.
- **누적 방문자수**: 서비스 시작 이후 매일 순방문자 수의 합계.
- **"오늘" 기준 타임존**: Asia/Seoul(KST)로 고정. Vercel 서버는 UTC이므로 날짜 계산 시 명시적으로 KST로 변환한다.

## 추적 방식

**Route Handler + 쿠키 기반 dedup** (브레인스토밍에서 A안으로 채택).

- 루트 레이아웃에 클라이언트 컴포넌트 `<VisitTracker/>`를 두고, 마운트 시 `/api/visit`에 POST 한 번 호출.
- 서버(route handler)가 쿠키 `wp_seen`(값: `YYYY-MM-DD`, KST 기준)을 확인.
  - 쿠키의 날짜가 오늘과 다르면(또는 쿠키 없음) → 오늘 첫 방문 → 카운트 +1 후 쿠키를 오늘 날짜로 갱신.
  - 쿠키의 날짜가 오늘과 같으면 → 이미 집계됨 → 아무것도 하지 않음(dedup).
- 쿠키 만료: 익일 자정(KST) 또는 그 이상. 최소한 당일 재방문이 중복 집계되지 않으면 된다. 구현은 `Max-Age`를 넉넉히(예: 2일) 주고 값(날짜)으로 판별한다.

middleware 방식(B)과 외부 애널리틱스(C)는 각각 부정확성/목적 불일치로 배제.

## 데이터 스키마

신규 마이그레이션 파일 `docs/migrations/2026-07-12-visitor-stats.sql`.

```sql
create table if not exists visit_daily (
  date  date primary key,
  count integer not null default 0
);

-- 동시 방문 시 레이스 컨디션 방지를 위한 원자적 증가 RPC
create or replace function increment_visit(d date) returns void as $$
  insert into visit_daily(date, count) values (d, 1)
  on conflict (date) do update set count = visit_daily.count + 1;
$$ language sql;
```

- 오늘 방문자 = `visit_daily`에서 오늘 날짜 row의 `count` (없으면 0).
- 누적 방문자 = 모든 row `count`의 합.

### RLS / 키 정책

- 기존 `lib/supabase.ts`는 anon 키 사용. `increment_visit` RPC는 `security definer` 없이도 anon이 실행 가능해야 하므로, Supabase에서 함수 실행 권한을 anon role에 부여하거나, 필요 시 RPC를 `security definer`로 설정한다. 구현 단계에서 anon 키로 `rpc('increment_visit')` 및 `visit_daily` select가 동작하는지 검증한다.
- 서비스롤 키 추가는 지양(환경변수/보안 표면 최소화). anon으로 불가할 경우에만 대안 검토.

## 신규/수정 파일

| 파일 | 유형 | 역할 |
|------|------|------|
| `docs/migrations/2026-07-12-visitor-stats.sql` | 신규 | 위 스키마 + RPC |
| `app/api/visit/route.ts` | 신규 | POST 시 쿠키 확인 → 오늘 첫 방문이면 `increment_visit` 호출 + 쿠키 세팅 |
| `components/VisitTracker.tsx` | 신규 | 마운트 시 `/api/visit`에 POST하는 클라이언트 컴포넌트 |
| `app/actions/visit-stats.ts` | 신규 | `getVisitStats()` → `{ today: number, total: number }` 반환 (서버액션) |
| `app/layout.tsx` | 수정(1줄) | `<VisitTracker/>` 삽입 |
| `app/admin/page.tsx` | 수정 | 최상단에 방문자 통계 카드 추가 (오늘/누적) |

> 참고: `app/admin/page.tsx`는 신규 카드 추가이므로 "기존 동작 변경 없음" 원칙 하의 순수 추가. `app/layout.tsx`는 승인된 1줄 삽입.

## 데이터 흐름

```
방문자 → 페이지 로드 → VisitTracker 마운트 → POST /api/visit
  → 쿠키 wp_seen 확인
     · 오늘(KST) 날짜와 다르면 → increment_visit(오늘) + 쿠키 갱신
     · 같으면 → no-op (dedup)

관리자 → /admin → getVisitStats()
  → today = visit_daily[오늘].count, total = sum(count)
  → 카드에 "오늘 N명 / 누적 M명" 표시
```

## 관리자 화면

- `app/admin/page.tsx` 최상단(관리자 헤더 아래 첫 카드)에 방문자 통계 섹션 추가.
- 기존 카드 스타일(`bg-white rounded-2xl shadow-sm`, 브랜드 골드 `#C4A882` 아이콘) 재사용.
- 표시 내용: 오늘 방문자수, 누적 방문자수 두 숫자.

## 에러 처리

- `/api/visit`: Supabase 오류나 RPC 실패 시에도 사용자 페이지에 영향 없도록 조용히 실패(200 또는 204 반환, 로깅만). 방문 집계는 best-effort.
- `getVisitStats()`: 조회 실패 시 `{ today: 0, total: 0 }` 폴백으로 관리자 페이지가 깨지지 않게 한다.
- `VisitTracker`: fetch 실패는 무시(사용자 경험에 영향 없음).

## 테스트/검증

- 마이그레이션 적용 후 Supabase에서 `visit_daily`, `increment_visit`가 anon 키로 동작하는지 확인.
- 로컬에서 첫 방문 시 count 증가, 같은 브라우저 재방문 시 미증가(dedup) 확인.
- 날짜 경계(KST 자정) 넘어가면 새 날짜로 집계되는지 확인.
- `/admin`에서 오늘/누적 숫자가 올바르게 표시되는지 확인.

## 비범위 (Non-goals / YAGNI)

- 봇 필터링, 지역/디바이스 분석, 그래프/차트, 기간 선택 등은 하지 않는다(요청 범위 밖).
- 관리자 본인 방문 제외 로직은 넣지 않는다(단순성 우선).
