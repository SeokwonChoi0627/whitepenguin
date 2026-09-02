import {
  RETURN_REASON_MAP,
  RETURN_STATUS_MAP,
  productLabel,
  type ReturnItem,
  type ReturnReason,
  type ReturnStatus,
} from '@/lib/returns'

export interface ReturnSummary {
  id: string
  return_number: string
  order_number: string
  reason: ReturnReason
  items: ReturnItem[]
  status: ReturnStatus
  admin_note: string | null
  created_at: string
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`
}

export default function ReturnHistory({ returns }: { returns: ReturnSummary[] }) {
  if (returns.length === 0) return null

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mt-6">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="font-bold text-gray-900">반품 신청 내역</h3>
      </div>

      <div className="divide-y divide-gray-100">
        {returns.map((request) => {
          const status = RETURN_STATUS_MAP[request.status]
          const reason = RETURN_REASON_MAP[request.reason]
          const itemSummary = request.items
            .map((i) => `${productLabel(i.name, i.size)} ${i.quantity}개`)
            .join(', ')

          return (
            <div key={request.id} className="px-5 py-4">
              <div className="flex items-start justify-between gap-3 mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs text-gray-400">{formatDate(request.created_at)}</span>
                  <span className="text-xs text-gray-300">·</span>
                  <span className="text-xs font-mono text-gray-400 truncate">
                    {request.return_number}
                  </span>
                </div>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${status?.badgeClass ?? 'bg-gray-100 text-gray-500'}`}
                >
                  {status?.label ?? request.status}
                </span>
              </div>

              <p className="text-sm font-semibold text-gray-900">{itemSummary}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                주문 #{request.order_number} · {reason?.label ?? request.reason}
              </p>

              {request.admin_note && (
                <p className="text-xs text-gray-600 bg-[#F7F3EE] rounded-lg px-3 py-2 mt-2 leading-relaxed">
                  {request.admin_note}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
