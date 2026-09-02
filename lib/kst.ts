// 한국 시간(KST) 날짜 처리 — 시간대 관련 계산은 전부 여기를 거친다.
//
// 서버 로컬 시간을 그대로 쓰면 안 된다. Vercel 서버는 UTC 로 동작하므로
// 한국 시간 00:00~09:00 사이에는 날짜가 하루 밀린다.
// 실제로 "종료일이 지난 팝업이 오전에 계속 노출되는" 문제가 있었다.

/** 사이트 기준 시간대 — 운영자도 고객도 한국이다 */
export const SITE_TIME_ZONE = 'Asia/Seoul'

/** KST 기준 UTC 오프셋 (한국은 서머타임이 없어 연중 고정이다) */
const KST_OFFSET = '+09:00'

/** 'en-CA' 로케일이 YYYY-MM-DD 형식을 준다 */
const DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: SITE_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** 한국 기준 오늘 (YYYY-MM-DD) */
export function todayString(now: Date = new Date()): string {
  return DATE_FORMATTER.format(now)
}

/** 어떤 시각을 한국 기준 날짜 문자열로 (YYYY-MM-DD) */
export function toDateString(value: Date | string): string {
  return DATE_FORMATTER.format(typeof value === 'string' ? new Date(value) : value)
}

/** 날짜 문자열이 YYYY-MM-DD 형식인지 */
export function isDateString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

/**
 * 'YYYY-MM-DD' 를 그 날 한국 시간 끝(23:59:59.999)의 ISO 문자열로.
 *
 * 유효기간을 저장할 때 쓴다. new Date('2026-12-31').toISOString() 을 쓰면
 * UTC 자정 = 한국 12/31 오전 9시가 되어, 그 날 오전에 이미 만료된다.
 */
export function endOfDayIso(dateString: string): string {
  return new Date(`${dateString}T23:59:59.999${KST_OFFSET}`).toISOString()
}

/** 'YYYY-MM-DD' 를 그 날 한국 시간 시작(00:00:00)의 ISO 문자열로 */
export function startOfDayIso(dateString: string): string {
  return new Date(`${dateString}T00:00:00.000${KST_OFFSET}`).toISOString()
}

/** 한국 기준 날짜를 'YYYY.MM.DD' 로 표시 */
export function formatDateDots(value: Date | string): string {
  return toDateString(value).replace(/-/g, '.')
}
