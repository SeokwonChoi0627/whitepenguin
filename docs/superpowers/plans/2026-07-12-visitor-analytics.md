# 방문자 통계 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 관리자 페이지(`/admin`)에서 오늘/누적 순방문자수를 확인할 수 있게 한다.

**Architecture:** 루트 레이아웃의 클라이언트 컴포넌트 `<VisitTracker/>`가 페이지 로드 시 `/api/visit`에 POST → 서버가 쿠키로 당일 dedup 후 Supabase RPC `increment_visit`로 카운트 증가. 관리자 페이지는 서버액션 `getVisitStats()`로 오늘/누적을 조회해 표시.

**Tech Stack:** Next.js 14 App Router, Supabase(anon key, `@supabase/supabase-js`), TypeScript. 테스트 프레임워크 없음 → 검증은 `npm run build`/`npm run lint` + 브라우저 수동 확인.

**제약:** 신규 추가만. 기존 파일 수정은 (1) `app/layout.tsx` 1줄 삽입, (2) `app/admin/page.tsx` 카드 추가 — 둘 다 사용자 승인됨. 그 외 기존 코드/테이블/동작 변경 금지.

---

## 파일 구조

| 파일 | 유형 | 책임 |
|------|------|------|
| `docs/migrations/2026-07-12-visitor-stats.sql` | Create | `visit_daily` 테이블 + `increment_visit` RPC |
| `app/api/visit/route.ts` | Create | POST 방문 집계(쿠키 dedup + RPC 호출) |
| `components/VisitTracker.tsx` | Create | 마운트 시 `/api/visit`에 POST |
| `app/actions/visit-stats.ts` | Create | `getVisitStats()` → `{ today, total }` |
| `app/layout.tsx` | Modify | `<VisitTracker/>` 1줄 삽입 |
| `app/admin/page.tsx` | Modify | 방문자 통계 카드 추가 |

---

### Task 1: DB 마이그레이션 (visit_daily 테이블 + RPC)

**Files:**
- Create: `docs/migrations/2026-07-12-visitor-stats.sql`

- [ ] **Step 1: 마이그레이션 SQL 작성**

`docs/migrations/2026-07-12-visitor-stats.sql`:

```sql
-- 방문자 통계: 일자별 순방문자 카운트
create table if not exists visit_daily (
  date  date primary key,
  count integer not null default 0
);

-- 동시 방문 레이스 방지용 원자적 증가 함수
create or replace function increment_visit(d date) returns void as $$
  insert into visit_daily(date, count) values (d, 1)
  on conflict (date) do update set count = visit_daily.count + 1;
$$ language sql security definer;

-- anon 역할이 조회/실행할 수 있도록 권한 부여
grant select on visit_daily to anon;
grant execute on function increment_visit(date) to anon;
```

- [ ] **Step 2: Supabase에 적용**

Supabase 대시보드 → SQL Editor에 위 내용을 붙여넣고 실행. (또는 사용자가 실행하도록 안내)
Expected: `Success. No rows returned`

- [ ] **Step 3: 적용 검증**

SQL Editor에서:
```sql
select increment_visit(current_date);
select * from visit_daily;
```
Expected: `visit_daily`에 오늘 날짜 row가 count=1로 존재. (검증 후 `delete from visit_daily;`로 초기화)

- [ ] **Step 4: Commit**

```bash
git add docs/migrations/2026-07-12-visitor-stats.sql
git commit -m "feat(analytics): visit_daily 테이블 및 increment_visit RPC 마이그레이션"
```

---

### Task 2: 방문 집계 API Route Handler

**Files:**
- Create: `app/api/visit/route.ts`

의존: Task 1(`increment_visit` RPC), 기존 `lib/supabase.ts`의 `supabase` export.

- [ ] **Step 1: route handler 작성**

`app/api/visit/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabase } from '@/lib/supabase'

// 이 라우트는 매 요청 실행되어야 하므로 캐시 비활성화
export const dynamic = 'force-dynamic'

// Asia/Seoul 기준 오늘 날짜(YYYY-MM-DD)
function todayKST(): string {
  const now = new Date()
  // UTC+9로 이동시킨 뒤 ISO 날짜 부분만 사용
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return kst.toISOString().slice(0, 10)
}

export async function POST() {
  try {
    const today = todayKST()
    const jar = cookies()
    const seen = jar.get('wp_seen')?.value

    // 오늘 이미 집계된 방문자면 아무것도 하지 않음(dedup)
    if (seen === today) {
      return new NextResponse(null, { status: 204 })
    }

    // 오늘 첫 방문 → 카운트 증가
    await supabase.rpc('increment_visit', { d: today })

    jar.set('wp_seen', today, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 2, // 2일(당일 재방문 중복 방지에 충분)
    })

    return new NextResponse(null, { status: 204 })
  } catch {
    // 방문 집계는 best-effort — 실패해도 사용자 경험에 영향 없음
    return new NextResponse(null, { status: 204 })
  }
}
```

- [ ] **Step 2: 빌드 확인**

Run: `npm run build`
Expected: 빌드 성공, `/api/visit` 라우트가 목록에 나타남.

- [ ] **Step 3: Commit**

```bash
git add app/api/visit/route.ts
git commit -m "feat(analytics): 방문 집계 API 라우트(쿠키 dedup + RPC)"
```

---

### Task 3: VisitTracker 클라이언트 컴포넌트

**Files:**
- Create: `components/VisitTracker.tsx`

- [ ] **Step 1: 컴포넌트 작성**

`components/VisitTracker.tsx`:

```tsx
'use client'

import { useEffect } from 'react'

// 페이지 로드 시 한 번 방문 집계 API를 호출한다.
// 실패는 무시(사용자 경험에 영향 없음). UI는 렌더링하지 않는다.
export default function VisitTracker() {
  useEffect(() => {
    fetch('/api/visit', { method: 'POST' }).catch(() => {})
  }, [])

  return null
}
```

- [ ] **Step 2: 빌드 확인**

Run: `npm run build`
Expected: 빌드 성공.

- [ ] **Step 3: Commit**

```bash
git add components/VisitTracker.tsx
git commit -m "feat(analytics): VisitTracker 클라이언트 컴포넌트"
```

---

### Task 4: 루트 레이아웃에 VisitTracker 삽입

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: 현재 레이아웃 확인**

Run: `sed -n '1,60p' app/layout.tsx` (또는 Read 도구)
목적: import 위치와 `<body>` 내부 구조 파악. 기존 Provider/children 배치를 건드리지 않는다.

- [ ] **Step 2: import 추가**

파일 상단 import 블록에 추가:

```tsx
import VisitTracker from '@/components/VisitTracker'
```

- [ ] **Step 3: `<body>` 내부에 컴포넌트 삽입**

`<body>` 태그 바로 안쪽(children 렌더링 근처)에 한 줄 추가. 예:

```tsx
<body className={...}>
  <VisitTracker />
  {/* 기존 내용 그대로 */}
  ...
</body>
```

주의: 기존 요소는 순서/속성 변경 없이 유지. `<VisitTracker/>`는 아무것도 렌더링하지 않으므로 레이아웃에 시각적 영향 없음.

- [ ] **Step 4: 빌드 확인**

Run: `npm run build`
Expected: 빌드 성공.

- [ ] **Step 5: 방문 집계 동작 확인(수동)**

Run: `npm run dev` 후 브라우저로 홈 접속.
- 최초 접속 시 Network 탭에서 `POST /api/visit` → 204 확인.
- Supabase `visit_daily`에서 오늘 count가 1 증가.
- 새로고침 시 재요청은 가지만 count는 증가하지 않음(쿠키 dedup). 다른 시크릿창으로 접속 시 +1.

- [ ] **Step 6: Commit**

```bash
git add app/layout.tsx
git commit -m "feat(analytics): 루트 레이아웃에 VisitTracker 삽입"
```

---

### Task 5: getVisitStats 서버액션

**Files:**
- Create: `app/actions/visit-stats.ts`

기존 `app/actions/sold-out.ts` 패턴(`'use server'` + `supabase.from(...)`)을 따른다.

- [ ] **Step 1: 서버액션 작성**

`app/actions/visit-stats.ts`:

```ts
'use server'

import { supabase } from '@/lib/supabase'

// Asia/Seoul 기준 오늘 날짜(YYYY-MM-DD)
function todayKST(): string {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000)
  return kst.toISOString().slice(0, 10)
}

export interface VisitStats {
  today: number
  total: number
}

export async function getVisitStats(): Promise<VisitStats> {
  try {
    const { data, error } = await supabase
      .from('visit_daily')
      .select('date, count')

    if (error || !data) return { today: 0, total: 0 }

    const today = todayKST()
    const total = data.reduce((sum, row) => sum + (row.count ?? 0), 0)
    const todayRow = data.find((row) => row.date === today)

    return { today: todayRow?.count ?? 0, total }
  } catch {
    return { today: 0, total: 0 }
  }
}
```

- [ ] **Step 2: 빌드 확인**

Run: `npm run build`
Expected: 빌드 성공.

- [ ] **Step 3: Commit**

```bash
git add app/actions/visit-stats.ts
git commit -m "feat(analytics): getVisitStats 서버액션(오늘/누적 조회)"
```

---

### Task 6: 관리자 페이지에 방문자 통계 카드 추가

**Files:**
- Modify: `app/admin/page.tsx`

기존 카드 스타일(`bg-white rounded-2xl shadow-sm`, 브랜드 골드 `#C4A882`)을 재사용. 기존 섹션은 그대로 두고 최상단에 통계 카드만 추가.

- [ ] **Step 1: import 추가**

기존 액션 import 블록(5~7줄 근처)에 추가:

```tsx
import { getVisitStats } from '@/app/actions/visit-stats'
```

lucide-react import에 `Users` 아이콘 추가(기존 import 라인 확장):

```tsx
import { ChevronRight, ImageIcon, LayoutGrid, MessageSquare, Users } from 'lucide-react'
```

- [ ] **Step 2: Promise.all에 통계 조회 추가**

기존:
```tsx
const [allImages, soldOutMap, thumbnailOverrides] = await Promise.all([
  getAllProductImages(),
  getSoldOutProducts(),
  getProductThumbnails(),
])
```
수정 후:
```tsx
const [allImages, soldOutMap, thumbnailOverrides, visitStats] = await Promise.all([
  getAllProductImages(),
  getSoldOutProducts(),
  getProductThumbnails(),
  getVisitStats(),
])
```

- [ ] **Step 3: 통계 카드 JSX 삽입**

`<div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">` 바로 다음, 첫 번째 섹션(게시글·리뷰 관리) **앞에** 삽입:

```tsx
{/* ── 방문자 통계 ── */}
<div>
  <div className="flex items-center gap-2 mb-3">
    <Users size={16} className="text-[#C4A882]" />
    <h2 className="font-semibold text-[#333333]">방문자 통계</h2>
  </div>
  <div className="bg-white rounded-2xl shadow-sm overflow-hidden grid grid-cols-2 divide-x divide-gray-100">
    <div className="px-5 py-5 text-center">
      <p className="text-xs text-gray-400 mb-1">오늘 방문자</p>
      <p className="text-2xl font-bold text-[#333333]">
        {visitStats.today.toLocaleString()}
        <span className="text-sm font-normal text-gray-400 ml-1">명</span>
      </p>
    </div>
    <div className="px-5 py-5 text-center">
      <p className="text-xs text-gray-400 mb-1">누적 방문자</p>
      <p className="text-2xl font-bold text-[#C4A882]">
        {visitStats.total.toLocaleString()}
        <span className="text-sm font-normal text-gray-400 ml-1">명</span>
      </p>
    </div>
  </div>
</div>
```

- [ ] **Step 4: 빌드 확인**

Run: `npm run build`
Expected: 빌드 성공.

- [ ] **Step 5: 화면 확인(수동)**

Run: `npm run dev` 후 관리자 계정으로 `/admin` 접속.
Expected: 최상단에 "방문자 통계" 카드가 오늘/누적 두 숫자로 표시됨. 앞서 방문으로 집계된 값과 일치.

- [ ] **Step 6: Commit**

```bash
git add app/admin/page.tsx
git commit -m "feat(analytics): 관리자 페이지 방문자 통계 카드 추가"
```

---

### Task 7: 최종 검증 및 배포 확인

**Files:** 없음(검증만)

- [ ] **Step 1: 전체 빌드/린트**

Run: `npm run build && npm run lint`
Expected: 모두 통과.

- [ ] **Step 2: 배포 후 프로덕션 확인**

`main` 병합/푸시 → Vercel 자동 배포 후:
- 홈 접속 시 `POST /api/visit` 204 확인.
- `/admin`에서 오늘/누적 숫자 증가 확인.
- Vercel(UTC) 환경에서 "오늘" 경계가 KST로 맞는지 확인(자정 전후 스팟체크).

- [ ] **Step 3: 최종 커밋(필요 시)**

검증 중 수정이 없으면 생략.

---

## Self-Review 결과

- **Spec 커버리지:** 순방문자 정의(Task 2·5 dedup/집계), 오늘/누적(Task 5·6), KST 타임존(Task 2·5 `todayKST`), 4개 신규 파일 + 2개 승인된 수정(Task 1~6), 에러 폴백(Task 2 best-effort, Task 5 `{0,0}` 폴백), RLS/anon 권한(Task 1 grant). 모두 매핑됨.
- **플레이스홀더:** 없음(모든 코드 스텝에 실제 코드 포함).
- **타입 일관성:** `increment_visit(d date)` ↔ `rpc('increment_visit', { d })`, `VisitStats { today, total }` ↔ Task 6 사용부, `visit_daily(date, count)` 컬럼명 일관.
