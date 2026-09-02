// 메인 팝업 배너 — 클라이언트/서버 공용 타입과 노출 판정.

import { isDateString, todayString } from '@/lib/kst'

export { todayString }

export interface PopupSettings {
  id: number
  is_enabled: boolean
  image_url: string | null
  link_href: string
  alt_text: string
  /** 노출 시작일 (YYYY-MM-DD, null = 제한 없음) */
  starts_on: string | null
  /** 노출 종료일 (YYYY-MM-DD, 이 날짜까지 포함, null = 제한 없음) */
  ends_on: string | null
  updated_at: string
}

/** 팝업이 화면에 뜰 때 필요한 최소 정보 */
export interface PublicPopup {
  imageUrl: string
  linkHref: string
  altText: string
}

export const DEFAULT_POPUP_LINK = '/products'

/**
 * 지금 팝업을 띄워야 하는지 판정한다.
 *
 * 날짜는 'YYYY-MM-DD' 문자열끼리 비교한다. Date 로 파싱하면 UTC 변환 때문에
 * 한국 시간 기준으로 하루씩 밀리는 문제가 생긴다. 종료일은 그 날까지 포함한다.
 */
export function isPopupVisible(
  settings: Pick<PopupSettings, 'is_enabled' | 'image_url' | 'starts_on' | 'ends_on'> | null,
  today: string = todayString()
): boolean {
  if (!settings) return false
  if (!settings.is_enabled) return false
  if (!settings.image_url) return false
  if (settings.starts_on && today < settings.starts_on) return false
  if (settings.ends_on && today > settings.ends_on) return false
  return true
}

/** 링크는 사이트 내부 경로만 허용한다 (외부 리디렉션 방지) */
export function isSafeInternalPath(href: string): boolean {
  return /^\/(?!\/)[A-Za-z0-9\-._~!$&'()*+,;=:@%/?#[\]]*$/.test(href)
}

export interface PopupCheck {
  ok: boolean
  error?: string
}

export function validatePopupSettings(
  input: Pick<PopupSettings, 'link_href' | 'alt_text' | 'starts_on' | 'ends_on' | 'image_url' | 'is_enabled'>
): PopupCheck {
  if (!input.link_href?.trim()) {
    return { ok: false, error: '이동할 링크를 입력해 주세요.' }
  }
  if (!isSafeInternalPath(input.link_href)) {
    return { ok: false, error: "링크는 '/' 로 시작하는 사이트 내부 경로여야 합니다. (예: /products)" }
  }
  if (input.alt_text.length > 100) {
    return { ok: false, error: '대체 텍스트는 100자 이내로 입력해 주세요.' }
  }
  for (const [label, value] of [['시작일', input.starts_on], ['종료일', input.ends_on]] as const) {
    if (value && !isDateString(value)) {
      return { ok: false, error: `${label} 형식이 올바르지 않습니다.` }
    }
  }
  if (input.starts_on && input.ends_on && input.starts_on > input.ends_on) {
    return { ok: false, error: '시작일이 종료일보다 늦을 수 없습니다.' }
  }
  if (input.is_enabled && !input.image_url) {
    return { ok: false, error: '팝업을 켜려면 배너 이미지를 먼저 등록해 주세요.' }
  }
  return { ok: true }
}

/** 관리자 화면에 보여줄 현재 상태 설명 */
export function describePopupStatus(settings: PopupSettings, today: string = todayString()): string {
  if (!settings.is_enabled) return '꺼짐'
  if (!settings.image_url) return '배너 이미지 없음'
  if (settings.starts_on && today < settings.starts_on) return `${settings.starts_on} 부터 노출 예정`
  if (settings.ends_on && today > settings.ends_on) return `${settings.ends_on} 에 종료됨`
  if (settings.ends_on) return `노출 중 · ${settings.ends_on} 까지`
  return '노출 중 · 종료일 없음'
}
