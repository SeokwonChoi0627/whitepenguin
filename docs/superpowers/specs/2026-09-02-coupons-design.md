# 쿠폰 / 프로모션 코드 설계

**작성일** 2026-09-02
**대상** 화이트펭귄 B2B 베이킹 도매 사이트

## 목적

1. 회원가입 고객에게 1,000원 할인 쿠폰 지급
2. 운영자가 10% 또는 이벤트 쿠폰을 직접 발행
3. 프로모션 코드 입력 시 할인 적용

## 핵심 결정

### 쿠폰 정책 + 사용기록 모델

사용자마다 쿠폰 인스턴스를 찍어 나눠주는 방식(`user_coupons`) 대신
**정책 1행 + 사용기록**으로 표현한다. 요청된 3가지가 모두 같은 틀에 들어간다.

| 요구사항 | 표현 |
|---|---|
| 가입자 1,000원 쿠폰 | `code = null`, `auto_apply_to_members = true` |
| 10% 이벤트 쿠폰 | `code = 'AUTUMN10'`, `discount_type = 'percent'` |
| 프로모션 코드 | 위와 동일 (코드가 있는 정책) |

발행 배치가 필요 없고, 회원 수만큼 행이 늘지 않는다.
"내 쿠폰"은 *지금 내가 쓸 수 있는 정책 목록*으로 계산한다.

### 1인 1회 제한은 DB 유니크 제약으로

`coupon_redemptions (coupon_id, user_id)` 에 UNIQUE.
앱 코드의 "조회 후 삽입"만으로는 두 탭 동시 제출 시 중복 적용될 수 있다.

쿠폰당 사용 횟수는 **1회 고정**. `max_per_user` 같은 컬럼을 두면 유니크 제약을
쓸 수 없어 경쟁 조건이 생긴다. 필요해지면 그때 확장한다 (YAGNI).

### 할인 계산 순서

```
상품 합계
→ 수량 할인 (10개 10% / 50개 12% / 100개 15%)   기존 로직
→ 쿠폰 할인                                      신규
→ 천원미만 절사 (10만원 이상일 때만)              기존 로직
```

- `percent` 쿠폰은 **수량 할인 적용 후 금액** 기준으로 계산한다
- 수량 할인과 쿠폰은 **중복 적용**한다 (운영자 결정)
- `max_discount_amount` 로 percent 쿠폰의 상한을 둘 수 있다

### 서버가 금액을 재계산한다

클라이언트는 **쿠폰 코드만** 보낸다. 할인 금액을 보내더라도 서버는 무시하고
유효기간·최소금액·중복사용·활성여부를 재검증한 뒤 다시 계산한다.
그러지 않으면 임의의 할인액을 POST 할 수 있다.

## 데이터 모델

```sql
coupons
  id                  uuid pk
  code                text unique        -- null = 코드 없이 전 회원 대상
  name                text not null
  description         text
  discount_type       text not null      -- 'fixed' | 'percent'
  discount_value      integer not null   -- 1000 | 10
  min_order_amount    integer not null default 0
  max_discount_amount integer            -- percent 상한 (nullable)
  starts_at           timestamptz
  expires_at          timestamptz
  max_redemptions     integer            -- 전체 한도 (null = 무제한)
  auto_apply_to_members boolean default false
  is_active           boolean default true
  created_at, updated_at

coupon_redemptions
  id              uuid pk
  coupon_id       uuid not null references coupons(id)
  user_id         text not null
  order_number    text not null
  discount_amount integer not null
  redeemed_at     timestamptz default now()
  UNIQUE (coupon_id, user_id)
```

두 테이블 모두 RLS 로 anon 접근을 차단하고 service_role 로만 접근한다
(`2026-09-02-lock-down-anon-access.sql` 과 동일한 방침).

## 구성 요소

| 파일 | 역할 |
|---|---|
| `lib/pricing.ts` | 할인 계산 단일 출처 (클라이언트·서버 공용) |
| `lib/coupons.ts` | 쿠폰 타입·검증 규칙 (클라이언트·서버 공용) |
| `lib/coupon-store.ts` | 서버 전용 데이터 접근 (service_role) |
| `app/api/coupons/route.ts` | 내 쿠폰 목록 / 관리자 목록·생성 |
| `app/api/coupons/[id]/route.ts` | 관리자 수정·비활성화 |
| `app/api/coupons/validate/route.ts` | 코드 검증 + 할인액 계산 |
| `app/quote/` | 쿠폰 선택 + 프로모션 코드 입력 |
| `app/mypage/MyCoupons.tsx` | 내 쿠폰 목록 |
| `app/admin/coupons/page.tsx` | 쿠폰 관리 + 사용 현황 |
| `app/api/send-quote/route.ts` | 서버 재검증·재계산·사용기록·메일 표기 |

### 기존 코드 정리

할인 계산이 `app/quote/page.tsx` 와 `app/api/send-quote/route.ts` 에 복붙돼 있다.
쿠폰을 얹으면 두 곳이 어긋나는 순간 금액이 틀어지므로 `lib/pricing.ts` 로 합친다.
(`lib/cart.ts` 로 장바구니 로직을 합친 것과 같은 방식)

## 견적서 표기 (주의)

고객에게 나가는 견적서는 **쿠폰이 반영된 최종 금액**을 보여야 한다.
`buildQuoteEmail` 에서 다음 세 곳이 모두 일치해야 한다.

1. 상단 `합계금액 : N원 (금 ...원)` — 한글 금액 표기 포함
2. 상품 테이블 하단 `에누리` 행 아래 **쿠폰 할인 행 추가**
3. 최종 `소계` 행

관리자용 발주 메일에도 쿠폰 할인 줄을 추가한다.

## 알려진 한계

- `max_redemptions`(전체 한도)는 "조회 후 삽입"이라 동시 제출이 몰리면 한두 건
  초과될 수 있다. 완전히 막으려면 DB 잠금이 필요하나 현재 주문량에서는 과하다.
  1인 1회 제한은 유니크 제약으로 확실히 막힌다.
- 주문당 쿠폰 1장만 적용한다.

## 시드 데이터

신규가입 쿠폰을 마이그레이션에서 함께 생성한다.

```
name                  신규가입 축하 쿠폰
discount_type         fixed
discount_value        1000
min_order_amount      30000
auto_apply_to_members true
code                  null
```

기존 회원 35명에게도 적용된다 (정책 방식이라 별도 지급 작업 없음).
