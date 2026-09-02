'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, Copy, Eye, EyeOff, RotateCcw } from 'lucide-react'
import {
  RETURN_REASON_MAP,
  RETURN_STATUSES,
  RETURN_STATUS_MAP,
  maskAccountNumber,
  productLabel,
  type ReturnRequestRecord,
  type ReturnStatus,
} from '@/lib/returns'

type StatusFilter = ReturnStatus | 'all'

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  ...RETURN_STATUSES.map((s) => ({ value: s.value as StatusFilter, label: s.label })),
]

export default function AdminReturnsPage() {
  const [requests, setRequests] = useState<ReturnRequestRecord[]>([])
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/returns?scope=all')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '목록을 불러오지 못했습니다.')
      setRequests(data as ReturnRequestRecord[])
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '목록을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const applyUpdate = (updated: ReturnRequestRecord) => {
    setRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
  }

  const visible = useMemo(
    () => (filter === 'all' ? requests : requests.filter((r) => r.status === filter)),
    [requests, filter]
  )

  const counts = useMemo(() => {
    const map = new Map<StatusFilter, number>([['all', requests.length]])
    for (const request of requests) {
      map.set(request.status, (map.get(request.status) ?? 0) + 1)
    }
    return map
  }, [requests])

  return (
    <div className="min-h-screen bg-[#F7F3EE]">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5 flex items-center gap-3">
          <Link href="/admin" className="text-gray-400 hover:text-gray-600 transition-colors">
            <ChevronLeft size={22} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-[#333333]">반품요청 관리</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              접수된 반품요청의 환급계좌를 확인하고 처리 상태를 변경합니다.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {/* 상태 필터 */}
        <div className="flex gap-2 flex-wrap mb-5">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                filter === f.value
                  ? 'bg-[#333333] text-white'
                  : 'bg-white text-gray-500 hover:text-[#333333] border border-gray-200'
              }`}
            >
              {f.label}
              <span className="ml-1.5 opacity-60">{counts.get(f.value) ?? 0}</span>
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 rounded-xl px-4 py-3 text-sm mb-5">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-center text-gray-400 text-sm py-16">불러오는 중...</p>
        ) : visible.length === 0 ? (
          <div className="bg-white rounded-2xl py-16 text-center">
            <RotateCcw size={26} className="text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400">해당 상태의 반품요청이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {visible.map((request) => (
              <ReturnCard key={request.id} request={request} onUpdated={applyUpdate} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── 반품요청 카드 ─────────────────────────────────────────────

function ReturnCard({
  request,
  onUpdated,
}: {
  request: ReturnRequestRecord
  onUpdated: (updated: ReturnRequestRecord) => void
}) {
  const [showAccount, setShowAccount] = useState(false)
  const [note, setNote] = useState(request.admin_note ?? '')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [copied, setCopied] = useState(false)

  const status = RETURN_STATUS_MAP[request.status]
  const reason = RETURN_REASON_MAP[request.reason]
  const createdAt = new Date(request.created_at)
  const pad = (n: number) => String(n).padStart(2, '0')
  const dateStr = `${createdAt.getFullYear()}.${pad(createdAt.getMonth() + 1)}.${pad(createdAt.getDate())} ${pad(createdAt.getHours())}:${pad(createdAt.getMinutes())}`

  const patch = async (payload: { status?: ReturnStatus; adminNote?: string }) => {
    setSaving(true)
    setSaveError('')
    try {
      const res = await fetch(`/api/returns/${request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '변경에 실패했습니다.')
      onUpdated(data as ReturnRequestRecord)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : '변경에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const copyAccount = async () => {
    try {
      await navigator.clipboard.writeText(
        `${request.refund_bank} ${request.refund_account} ${request.refund_holder}`
      )
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setSaveError('클립보드 복사에 실패했습니다.')
    }
  }

  return (
    <article className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* 헤더 */}
      <header className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-100">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-bold text-sm text-[#333333]">
              {request.return_number}
            </span>
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${status?.badgeClass ?? 'bg-gray-100 text-gray-500'}`}
            >
              {status?.label ?? request.status}
            </span>
            {reason?.customerPaysShipping && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-500">
                배송비 고객부담
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {dateStr} · 주문 #{request.order_number}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-bold text-gray-900">{request.company_name || '-'}</p>
          <p className="text-xs text-gray-400 mt-0.5">{request.representative}</p>
        </div>
      </header>

      <div className="px-5 py-4 space-y-4">
        {/* 품목 + 사유 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="반품 품목">
            <ul className="space-y-0.5">
              {request.items.map((item, idx) => (
                <li key={`${item.name}-${idx}`} className="text-sm text-gray-800">
                  {productLabel(item.name, item.size)}
                  <span className="text-gray-400 ml-1.5">
                    {item.quantity}개 / 발주 {item.orderedQuantity}개
                  </span>
                </li>
              ))}
            </ul>
          </Field>
          <Field label="사유">
            <p className="text-sm text-gray-800">{reason?.label ?? request.reason}</p>
            {request.reason_detail && (
              <p className="text-xs text-gray-500 mt-1 whitespace-pre-wrap leading-relaxed">
                {request.reason_detail}
              </p>
            )}
          </Field>
        </div>

        {/* 연락처 · 회수지 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="연락처">
            <p className="text-sm text-gray-800">{request.phone || '-'}</p>
            <p className="text-xs text-gray-400">{request.email || '-'}</p>
          </Field>
          <Field label="회수지">
            <p className="text-sm text-gray-800 leading-relaxed">
              {request.pickup_address}
              {request.pickup_address_detail ? ` ${request.pickup_address_detail}` : ''}
            </p>
          </Field>
        </div>

        {/* 환급 계좌 */}
        <div className="bg-[#FFF8E7] border border-[#E8D9B5] rounded-xl px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#8A6A3B] mb-1">환급 계좌</p>
              <p className="text-sm text-gray-900">
                <span className="font-semibold">{request.refund_bank}</span>
                <span className="font-mono ml-2 tracking-wide">
                  {showAccount ? request.refund_account : maskAccountNumber(request.refund_account)}
                </span>
                <span className="text-gray-500 ml-2">({request.refund_holder})</span>
              </p>
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              <IconButton
                label={showAccount ? '계좌번호 가리기' : '계좌번호 보기'}
                onClick={() => setShowAccount((v) => !v)}
              >
                {showAccount ? <EyeOff size={14} /> : <Eye size={14} />}
              </IconButton>
              <IconButton label="계좌 정보 복사" onClick={copyAccount}>
                <Copy size={14} />
              </IconButton>
            </div>
          </div>
          {copied && <p className="text-xs text-[#8A6A3B] mt-1.5">복사했습니다.</p>}
        </div>

        {/* 증빙 사진 */}
        {request.photos?.length > 0 && (
          <Field label={`증빙 사진 (${request.photos.length}장)`}>
            <div className="flex gap-2 flex-wrap">
              {request.photos.map((url) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-20 h-20 rounded-xl overflow-hidden border border-gray-200 block"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="증빙 사진" className="w-full h-full object-cover" />
                </a>
              ))}
            </div>
          </Field>
        )}

        {/* 처리 */}
        <div className="border-t border-gray-100 pt-4 space-y-3">
          <div className="flex gap-1.5 flex-wrap">
            {RETURN_STATUSES.map((option) => (
              <button
                key={option.value}
                type="button"
                disabled={saving || option.value === request.status}
                onClick={() => patch({ status: option.value })}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:cursor-not-allowed ${
                  option.value === request.status
                    ? 'bg-[#333333] text-white'
                    : 'border border-gray-200 text-gray-500 hover:border-[#C4A882] hover:text-[#C4A882] disabled:opacity-40'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="고객에게 보일 처리 메모 (예: 3/5 회수 예정)"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EDE4D8] focus:border-[#C4A882]"
            />
            <button
              type="button"
              disabled={saving || note === (request.admin_note ?? '')}
              onClick={() => patch({ adminNote: note })}
              className="px-4 py-2 bg-[#333333] text-white text-xs font-semibold rounded-lg hover:bg-[#1a1a1a] transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            >
              메모 저장
            </button>
          </div>

          {saveError && <p className="text-xs text-red-500">{saveError}</p>}
        </div>
      </div>
    </article>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 mb-1">{label}</p>
      {children}
    </div>
  )
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="w-8 h-8 rounded-lg border border-[#E8D9B5] bg-white text-[#8A6A3B] flex items-center justify-center hover:bg-[#F7F3EE] transition-colors"
    >
      {children}
    </button>
  )
}
