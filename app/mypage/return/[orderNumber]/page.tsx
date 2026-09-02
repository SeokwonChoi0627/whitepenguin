import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, PackageX } from 'lucide-react'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import { supabase } from '@/lib/supabase'
import { listActiveReturnsForOrder, sumReturnedQuantities } from '@/lib/return-requests'
import { itemKey } from '@/lib/returns'
import ReturnRequestForm, { type ReturnableItem } from './ReturnRequestForm'

export const dynamic = 'force-dynamic'

interface QuoteRow {
  id: string
  order_number: string
  address: string | null
  representative: string | null
  created_at: string
  cart: { product: { name: string; size?: string }; quantity: number }[] | null
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`
}

/** 발주 cart 를 반품 신청 화면용 품목으로 변환 (동일 상품 줄은 합산) */
function toReturnableItems(
  cart: QuoteRow['cart'],
  alreadyReturned: Map<string, number>
): ReturnableItem[] {
  const merged = new Map<string, { name: string; size?: string; orderedQuantity: number }>()
  for (const line of cart ?? []) {
    const name = line.product?.name
    if (!name) continue
    const key = itemKey(name, line.product.size)
    const existing = merged.get(key)
    merged.set(key, {
      name,
      size: line.product.size,
      orderedQuantity: (existing?.orderedQuantity ?? 0) + line.quantity,
    })
  }

  return Array.from(merged.entries()).map(([key, item]) => ({
    ...item,
    returnableQuantity: Math.max(0, item.orderedQuantity - (alreadyReturned.get(key) ?? 0)),
  }))
}

export default async function ReturnRequestPage({
  params,
}: {
  params: { orderNumber: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth')

  const user = session.user as { id?: string; name?: string; companyName?: string }
  if (!user.id) redirect('/auth')

  const orderNumber = decodeURIComponent(params.orderNumber)

  const { data: quotes } = await supabase
    .from('quotes')
    .select('id, order_number, address, representative, created_at, cart')
    .eq('order_number', orderNumber)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)

  const quote = (quotes?.[0] ?? null) as QuoteRow | null
  if (!quote) {
    return (
      <EmptyState
        title="주문을 찾을 수 없습니다"
        message="본인의 발주 내역에 있는 주문만 반품 신청할 수 있습니다."
      />
    )
  }

  // 기존 반품 신청분 조회는 service_role 키를 요구한다.
  // 실패하면 남은 수량을 계산할 수 없으므로, 잘못된 수량으로 신청받는 대신 안내 화면을 띄운다.
  let alreadyReturned: Map<string, number>
  try {
    alreadyReturned = sumReturnedQuantities(await listActiveReturnsForOrder(user.id, orderNumber))
  } catch (err) {
    console.error('반품 내역 조회 실패 — 반품 신청 화면을 열 수 없습니다:', err)
    return (
      <EmptyState
        title="지금은 반품을 신청할 수 없습니다"
        message="일시적인 오류로 반품 신청 화면을 열지 못했습니다. 잠시 후 다시 시도하시거나 050-6814-0627 로 연락 주세요."
      />
    )
  }

  const items = toReturnableItems(quote.cart, alreadyReturned)
  const hasReturnable = items.some((item) => item.returnableQuantity > 0)

  if (!hasReturnable) {
    return (
      <EmptyState
        title="추가로 반품할 상품이 없습니다"
        message="이 주문의 모든 상품이 이미 반품 신청되었습니다. 진행 상황은 마이페이지에서 확인하실 수 있습니다."
      />
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/mypage" className="text-gray-400 hover:text-gray-600 transition-colors">
          <ChevronLeft size={22} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">반품요청</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            반품할 상품과 환급받으실 계좌를 입력해 주세요.
          </p>
        </div>
      </div>

      <ReturnRequestForm
        orderNumber={quote.order_number}
        orderDate={formatDate(quote.created_at)}
        items={items}
        defaultAddress={quote.address ?? ''}
        defaultHolder={quote.representative ?? user.name ?? ''}
      />
    </div>
  )
}

function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
      <div className="bg-white border border-gray-200 rounded-2xl px-6 py-12 text-center">
        <div className="w-14 h-14 rounded-full bg-[#F7F3EE] text-[#C4A882] flex items-center justify-center mx-auto mb-4">
          <PackageX size={24} />
        </div>
        <h1 className="font-bold text-lg text-gray-900">{title}</h1>
        <p className="text-sm text-gray-500 mt-2 leading-relaxed">{message}</p>
        <Link
          href="/mypage"
          className="inline-block mt-6 bg-[#333333] text-white font-semibold text-sm px-6 py-2.5 rounded-xl hover:bg-[#1a1a1a] transition-colors"
        >
          발주 내역으로
        </Link>
      </div>
    </div>
  )
}
