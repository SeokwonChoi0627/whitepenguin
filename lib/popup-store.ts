import 'server-only'

// 팝업 설정 서버 전용 데이터 접근 — service_role 로만 동작한다.

import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { DEFAULT_POPUP_LINK, type PopupSettings } from '@/lib/popup'

export const POPUP_TABLE = 'popup_settings'
const SINGLETON_ID = 1

/** 테이블이 아직 없을 때 PostgREST 가 돌려주는 코드 */
const UNDEFINED_TABLE = '42P01'
const SCHEMA_CACHE_MISS = 'PGRST205'

/**
 * 마이그레이션 적용 전에 쓰는 기본값.
 *
 * 팝업은 원래 코드에 하드코딩돼 있었다. 테이블이 없다고 팝업이 사라지면
 * 마이그레이션을 돌리기 전까지 라이브에서 배너가 없어지므로,
 * 기존과 똑같은 배너를 기본값으로 둔다. 테이블이 생기면 DB 값이 이긴다.
 */
export const FALLBACK_POPUP: PopupSettings = {
  id: SINGLETON_ID,
  is_enabled: true,
  image_url: '/popup-banner.jpg',
  link_href: DEFAULT_POPUP_LINK,
  alt_text: '오픈기념 무료배송 이벤트',
  starts_on: null,
  ends_on: '2026-12-31',
  updated_at: new Date(0).toISOString(),
}

function isMissingTable(code?: string): boolean {
  return code === UNDEFINED_TABLE || code === SCHEMA_CACHE_MISS
}

export async function getPopupSettings(): Promise<PopupSettings> {
  const { data, error } = await getSupabaseAdmin()
    .from(POPUP_TABLE)
    .select('*')
    .eq('id', SINGLETON_ID)
    .maybeSingle()

  if (error) {
    // 테이블 미생성은 "설정 안 함"으로 보고 기존 배너를 유지한다.
    // 그 외 오류는 감추면 원인 파악이 어려워지므로 그대로 올린다.
    if (isMissingTable(error.code)) {
      console.warn('popup_settings 테이블이 없어 기본 배너를 사용합니다. 마이그레이션을 실행하세요.')
      return FALLBACK_POPUP
    }
    throw new Error(error.message)
  }
  return (data as PopupSettings) ?? FALLBACK_POPUP
}

/** 설정 저장 — 행이 없으면 만들고 있으면 덮어쓴다 (단일 행 유지) */
export async function savePopupSettings(
  patch: Partial<Omit<PopupSettings, 'id' | 'updated_at'>>
): Promise<PopupSettings> {
  const current = await getPopupSettings()
  const merged = { ...current, ...patch, id: SINGLETON_ID }
  const { updated_at: _ignored, ...row } = merged

  const { data, error } = await getSupabaseAdmin()
    .from(POPUP_TABLE)
    .upsert(row, { onConflict: 'id' })
    .select('*')
    .single()

  if (error) {
    if (isMissingTable(error.code)) {
      throw new Error(
        'popup_settings 테이블이 없습니다. docs/migrations/2026-09-02-popup-settings.sql 을 먼저 실행하세요.'
      )
    }
    throw new Error(error.message)
  }
  return data as PopupSettings
}
