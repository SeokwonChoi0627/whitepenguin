import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Package, FileText, MessageSquare, RotateCcw, Settings, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { listUserReturnRequests } from '@/lib/return-requests'
import OrderHistory, { type OrderSummary } from './OrderHistory'
import ReturnHistory, { type ReturnSummary } from './ReturnHistory'

const MENU = [
  { icon: <Package size={20} />, label: '발주 내역', href: '/mypage' },
  { icon: <FileText size={20} />, label: '발주서 작성', href: '/quote' },
  { icon: <RotateCcw size={20} />, label: '반품 신청 내역', href: '/mypage#returns' },
  { icon: <MessageSquare size={20} />, label: '커뮤니티', href: '/community' },
  { icon: <Settings size={20} />, label: '계정 설정', href: '/mypage/settings' },
]

/**
 * 반품 내역 조회는 service_role 키를 요구한다.
 * 아직 설정 전이거나 조회에 실패해도 발주 내역은 그대로 보여야 하므로 빈 배열로 대체한다.
 */
async function loadReturnsSafely(userId: string): Promise<ReturnSummary[]> {
  try {
    return (await listUserReturnRequests(userId)) as ReturnSummary[]
  } catch (err) {
    console.error('반품 내역 조회 실패 (발주 내역은 정상 표시):', err)
    return []
  }
}

export default async function MyPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth')

  const user = session.user as {
    id?: string
    name?: string
    email?: string
    phone?: string
    companyName?: string
  }

  const [{ data: quotes }, returns] = await Promise.all([
    supabase
      .from('quotes')
      .select('id, order_number, company_name, cart, final_total, discount_rate, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20),
    user.id ? loadReturnsSafely(user.id) : Promise.resolve<ReturnSummary[]>([]),
  ])

  const orders = (quotes ?? []) as OrderSummary[]
  const returnedOrderNumbers = new Set(returns.map((r) => r.order_number))

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 프로필 */}
      <div className="bg-[#333333] rounded-2xl p-6 text-white mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-2xl">
            🐧
          </div>
          <div>
            <h2 className="font-bold text-lg">{user.companyName || user.name}</h2>
            <p className="text-[#EDE4D8] text-sm">{user.email}</p>
            {user.phone && <p className="text-[#EDE4D8] text-xs mt-0.5">{user.phone}</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 왼쪽: 메뉴 */}
        <div className="md:col-span-1">
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {MENU.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors border-b last:border-b-0 border-gray-100"
              >
                <span className="text-gray-400">{item.icon}</span>
                <span className="flex-1 text-sm font-medium text-gray-700">{item.label}</span>
                <ChevronRight size={14} className="text-gray-300" />
              </Link>
            ))}
          </div>
        </div>

        {/* 오른쪽: 발주 내역 + 반품 신청 내역 */}
        <div className="md:col-span-2">
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">최근 발주 내역</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                주문별 반품요청은 각 항목의 버튼으로 신청하실 수 있습니다.
              </p>
            </div>

            <OrderHistory orders={orders} returnedOrderNumbers={returnedOrderNumbers} />

            <div className="px-5 py-4 border-t border-gray-100 bg-gray-50">
              <Link
                href="/quote"
                className="flex items-center justify-center gap-2 w-full bg-[#333333] text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-[#1a1a1a] transition-colors"
              >
                새 발주서 작성
              </Link>
            </div>
          </div>

          <div id="returns" className="scroll-mt-24">
            <ReturnHistory returns={returns} />
          </div>
        </div>
      </div>
    </div>
  )
}
