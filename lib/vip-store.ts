import 'server-only'

// VIP 링크 서버 전용 데이터 접근 — service_role 로만 동작한다.

import { randomBytes } from 'crypto'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { VIP_TOKEN_PATTERN, type VipLink, type VipLinkInput } from '@/lib/vip'

export const VIP_TABLE = 'vip_links'

/** 추측할 수 없는 링크 토큰 (192비트) */
export function generateVipToken(): string {
  return randomBytes(24).toString('base64url')
}

function normalize(row: Record<string, unknown>): VipLink {
  return {
    ...(row as unknown as VipLink),
    price_overrides: (row.price_overrides as Record<string, number> | null) ?? {},
  }
}

export async function getVipLinkByToken(token: string): Promise<VipLink | null> {
  if (!VIP_TOKEN_PATTERN.test(token)) return null
  const { data, error } = await getSupabaseAdmin()
    .from(VIP_TABLE)
    .select('*')
    .eq('token', token)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data ? normalize(data) : null
}

export async function getVipLinkById(id: string): Promise<VipLink | null> {
  const { data, error } = await getSupabaseAdmin()
    .from(VIP_TABLE)
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data ? normalize(data) : null
}

export async function listVipLinks(): Promise<VipLink[]> {
  const { data, error } = await getSupabaseAdmin()
    .from(VIP_TABLE)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) throw new Error(error.message)
  return (data ?? []).map(normalize)
}

export async function createVipLink(input: VipLinkInput): Promise<VipLink> {
  const { data, error } = await getSupabaseAdmin()
    .from(VIP_TABLE)
    .insert({ ...input, token: generateVipToken() })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return normalize(data)
}

export async function updateVipLink(id: string, patch: Partial<VipLinkInput> & { token?: string }): Promise<VipLink> {
  const { data, error } = await getSupabaseAdmin()
    .from(VIP_TABLE)
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return normalize(data)
}

export async function deleteVipLink(id: string): Promise<void> {
  const { error } = await getSupabaseAdmin().from(VIP_TABLE).delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function markVipLinkOrdered(id: string): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from(VIP_TABLE)
    .update({ last_ordered_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
}
