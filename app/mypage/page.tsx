import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Package, FileText, MessageSquare, Settings, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const MENU = [
  { icon: <Package size={20} />, label: '발주 내역', href: '/mypage' },
  { icon: <FileText size={20} />, label: '발주서 작성', href: '/quote' },
  { icon: <MessageSquare size={20} />, label: '커뮤니티', href: '/community' },
  { icon: <Settings size={20} />, label: '계정 설정', href: '#' },
]

type Quote = {
  id: string
  order_number: string
  company_name: string
  cart: { product: { name: string; size?: string }; quantity: number }[]
  final_total: number
  discount_rate: number
  created_at: string
}

export default async function MyPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth')
  }

  const user = session.user as any

  const { data: quotes } = await supabase
    .from('quotes')
    .select('id, order_number, company_name, cart, final_total, discount_rate, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

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
            {user.phone && (
              <p className="text-[#EDE4D8] text-xs mt-0.5">{user.phone}</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 왼쪽: 메뉴 */}
        <div className="md:col-span-1">
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {MENU.map((item, i) => (
              <Link
                key={i}
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

        {/* 오른쪽: 발주 내역 */}
        <div className="md:col-span-2">
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">최근 발주 내역</h3>
            </div>

            {!quotes || quotes.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-sm">
                <p className="text-3xl mb-2">📋</p>
                아직 발주 내역이 없습니다.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {(quotes as Quote[]).map((q) => {
                  const date = new Date(q.created_at)
                  const dateStr = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
                  const itemCount = q.cart.reduce((sum, item) => sum + item.quantity, 0)
                  const firstItem = q.cart[0]
                  const productSummary = firstItem
                    ? `${firstItem.product.name}${firstItem.product.size ? ` (${firstItem.product.size})` : ''}${q.cart.length > 1 ? ` 외 ${q.cart.length - 1}종` : ''}`
                    : '-'

                  return (
                    <div key={q.id} className="px-5 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-gray-400">{dateStr}</span>
                            <span className="text-xs text-gray-300">·</span>
                            <span className="text-xs font-mono text-gray-400">#{q.order_number}</span>
                          </div>
                          <p className="text-sm font-semibold text-gray-900 truncate">{productSummary}</p>
                          <p className="text-xs text-gray-500 mt-0.5">총 {itemCount}개</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-black text-[#333333]">
                            {q.final_total.toLocaleString()}원
                          </p>
                          {q.discount_rate > 0 && (
                            <span className="text-xs text-[#C4A882] font-semibold">
                              {q.discount_rate * 100}% 할인 적용
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="px-5 py-4 border-t border-gray-100 bg-gray-50">
              <Link
                href="/quote"
                className="flex items-center justify-center gap-2 w-full bg-[#333333] text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-[#1a1a1a] transition-colors"
              >
                새 발주서 작성
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
