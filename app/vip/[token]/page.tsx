import type { Metadata } from 'next'
import { PRODUCTS } from '@/lib/products'
import { getSoldOutProducts } from '@/app/actions/sold-out'
import { getProductThumbnails } from '@/app/actions/thumbnails'
import { buildVipCatalog, isVipLinkUsable } from '@/lib/vip'
import { getVipLinkByToken } from '@/lib/vip-store'
import VipOrderClient from './VipOrderClient'

// 링크마다 가격이 다르므로 절대 캐시하지 않는다
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '화이트펭귄 | VIP 발주',
  robots: { index: false, follow: false, nocache: true },
  // 주소에 든 토큰이 외부 사이트로 Referer 에 실려 나가지 않도록
  referrer: 'no-referrer',
}

function InvalidLink() {
  return (
    <div className="min-h-[60vh] bg-[#F7F3EE] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm px-8 py-10 text-center max-w-sm">
        <p className="text-3xl mb-3">🔒</p>
        <h1 className="font-bold text-[#333333]">사용할 수 없는 링크입니다</h1>
        <p className="text-sm text-gray-500 mt-2 leading-relaxed">
          링크가 만료되었거나 주소가 올바르지 않습니다.
          <br />
          담당자에게 새 링크를 요청해 주세요.
        </p>
      </div>
    </div>
  )
}

export default async function VipOrderPage({ params }: { params: { token: string } }) {
  const link = await getVipLinkByToken(params.token)
  if (!link || !isVipLinkUsable(link)) return <InvalidLink />

  const [soldOut, thumbnails] = await Promise.all([getSoldOutProducts(), getProductThumbnails()])
  const catalog = buildVipCatalog(PRODUCTS, link, soldOut).map((item) => ({
    ...item,
    image: thumbnails[item.id] ?? item.image,
  }))

  return (
    <VipOrderClient
      token={params.token}
      catalog={catalog}
      contact={{
        company_name: link.company_name,
        representative: link.representative,
        phone: link.phone,
        email: link.email,
        address: link.address,
        business_number: link.business_number,
      }}
    />
  )
}
