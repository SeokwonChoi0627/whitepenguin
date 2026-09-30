'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, Copy, ExternalLink, Pencil, Plus, Power, RefreshCw, Trash2 } from 'lucide-react'
import { formatDateDots } from '@/lib/kst'
import { PRODUCTS } from '@/lib/products'
import { isVipLinkUsable, type VipLink } from '@/lib/vip'
import VipLinkForm from './VipLinkForm'

function vipUrl(token: string): string {
  return `${window.location.origin}/vip/${token}`
}

function statusOf(link: VipLink): { text: string; className: string } {
  if (!link.is_active) return { text: '중지', className: 'bg-gray-100 text-gray-500' }
  if (!isVipLinkUsable(link)) return { text: '만료', className: 'bg-red-50 text-red-500' }
  return { text: '사용 중', className: 'bg-emerald-50 text-emerald-700' }
}

export default function AdminVipPage() {
  const [links, setLinks] = useState<VipLink[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  /** null = 폼 닫힘, 'new' = 새 링크, VipLink = 수정 */
  const [editing, setEditing] = useState<VipLink | 'new' | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/vip-links')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '불러오지 못했습니다.')
      setLinks(data)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const patch = async (link: VipLink, body: Record<string, unknown>) => {
    const res = await fetch(`/api/vip-links/${link.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) load()
    else setError((await res.json()).error || '변경에 실패했습니다.')
  }

  const regenerate = (link: VipLink) => {
    if (!confirm(`'${link.label}' 링크 주소를 새로 만들까요?\n기존 주소는 즉시 사용할 수 없게 됩니다.`)) return
    patch(link, { regenerate_token: true })
  }

  const remove = async (link: VipLink) => {
    if (!confirm(`'${link.label}' 링크를 삭제할까요?\n지난 발주 기록은 남습니다.`)) return
    const res = await fetch(`/api/vip-links/${link.id}`, { method: 'DELETE' })
    if (res.ok) load()
    else setError((await res.json()).error || '삭제에 실패했습니다.')
  }

  const copy = async (link: VipLink) => {
    try {
      await navigator.clipboard.writeText(vipUrl(link.token))
      setCopiedId(link.id)
      setTimeout(() => setCopiedId((id) => (id === link.id ? null : id)), 1500)
    } catch {
      prompt('아래 주소를 복사하세요.', vipUrl(link.token))
    }
  }

  const onSaved = () => { setEditing(null); load() }

  return (
    <div className="min-h-screen bg-[#F7F3EE]">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5 flex items-center gap-3">
          <Link href="/admin" className="text-gray-400 hover:text-gray-600 transition-colors">
            <ChevronLeft size={22} />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-[#333333]">VIP 시크릿 발주</h1>
            <p className="text-sm text-gray-500 mt-0.5">링크를 받은 고객만 VIP 가격으로 바로 발주할 수 있습니다.</p>
          </div>
          <button
            type="button"
            onClick={() => setEditing(editing === 'new' ? null : 'new')}
            className="flex items-center gap-1.5 bg-[#333333] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#1a1a1a] transition-colors"
          >
            <Plus size={15} />
            새 링크
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 rounded-xl px-4 py-3 text-sm">{error}</div>
        )}

        {editing && (
          <VipLinkForm
            key={editing === 'new' ? 'new' : editing.id}
            link={editing === 'new' ? null : editing}
            onSaved={onSaved}
            onCancel={() => setEditing(null)}
          />
        )}

        {loading ? (
          <p className="text-center text-sm text-gray-400 py-12">불러오는 중…</p>
        ) : links.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm py-12 text-center text-sm text-gray-400">
            아직 발급한 VIP 링크가 없습니다.
          </div>
        ) : (
          <ul className="space-y-3">
            {links.map((link) => {
              const status = statusOf(link)
              const productCount = link.product_ids?.length ?? PRODUCTS.length
              const overrideCount = Object.keys(link.price_overrides).length
              return (
                <li key={link.id} className="bg-white rounded-2xl shadow-sm p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-[#333333]">{link.label}</p>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${status.className}`}>
                          {status.text}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        기본 {link.discount_percent}% 할인
                        {overrideCount > 0 && ` · 개별가 ${overrideCount}개`}
                        {' · '}
                        {link.product_ids === null ? '전체 상품' : `${productCount}개 상품`}
                        {link.expires_at && ` · ${formatDateDots(link.expires_at)}까지`}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {link.company_name ?? '업체명 미입력'}
                        {' · 최근 발주 '}
                        {link.last_ordered_at ? formatDateDots(link.last_ordered_at) : '없음'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => copy(link)}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-[#F7F3EE] text-[#333333] hover:bg-[#EFE6DA] flex-shrink-0"
                    >
                      <Copy size={13} />
                      {copiedId === link.id ? '복사됨' : '링크 복사'}
                    </button>
                  </div>

                  <div className="flex items-center gap-1 mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500 flex-wrap">
                    <a href={`/vip/${link.token}`} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-md hover:bg-gray-100">
                      <ExternalLink size={13} /> 열어보기
                    </a>
                    <button type="button" onClick={() => setEditing(link)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-md hover:bg-gray-100">
                      <Pencil size={13} /> 수정
                    </button>
                    <button type="button" onClick={() => patch(link, { is_active: !link.is_active })}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-md hover:bg-gray-100">
                      <Power size={13} /> {link.is_active ? '중지' : '다시 사용'}
                    </button>
                    <button type="button" onClick={() => regenerate(link)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-md hover:bg-gray-100">
                      <RefreshCw size={13} /> 주소 재발급
                    </button>
                    <button type="button" onClick={() => remove(link)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-md hover:bg-red-50 hover:text-red-600 ml-auto">
                      <Trash2 size={13} /> 삭제
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
