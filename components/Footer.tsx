import Link from 'next/link'
import { COMPANY, COMPANY_DISCLOSURES } from '@/lib/company'

export default function Footer() {
  return (
    <footer className="bg-[#1a1a1a] text-gray-400 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* 브랜드 로고 */}
          <div className="col-span-1 md:col-span-2">
            <div className="mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-footer.png" alt="White Penguin" className="h-14 w-auto object-contain" />
            </div>
            <p className="text-sm leading-relaxed text-gray-300">
              베이킹 전문 도구의 B2B, B2C 파트너.<br />
              카페·베이커리·제과 업체를 위한 전문 도매 공급 플랫폼입니다.
            </p>
            <p className="mt-4 text-xs text-gray-400">
              쇼핑몰{' '}
              <a
                href={COMPANY.smartStoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#C4A882] transition-colors"
              >
                smartstore.naver.com/whitepenguin
              </a>
            </p>
          </div>

          {/* 메뉴 */}
          <div>
            <h4 className="text-white font-semibold mb-3 text-sm">바로가기</h4>
            <ul className="space-y-2 text-sm">
              {[
                { href: '/products', label: '상품' },
                { href: '/quote', label: '발주서' },
                { href: '/community', label: '커뮤니티' },
                { href: '/reviews', label: '리뷰' },
                { href: '/qna', label: 'Q&A' },
                { href: '/mypage', label: '마이페이지' },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="hover:text-[#C4A882] transition-colors">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* 카테고리 */}
          <div>
            <h4 className="text-white font-semibold mb-3 text-sm">상품 카테고리</h4>
            <ul className="space-y-2 text-sm">
              {['반느통', '제과틀', '쿠키틀', '푸딩틀', '도구', '소모품'].map((c) => (
                <li key={c}>
                  <Link href="/products" className="hover:text-[#C4A882] transition-colors">{c}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/*
          전자상거래법 제10조 법정 표시 사항.
          상호·대표자·영업소 소재지·연락처·사업자등록번호·통신판매업 신고번호가
          사이트에서 확인 가능해야 한다. 값은 lib/company.ts 한 곳에서 관리한다.
        */}
        <div className="mt-10 pt-8 border-t border-gray-700">
          <h4 className="text-white font-semibold mb-3 text-sm">사업자 정보</h4>
          <dl className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-gray-400">
            {COMPANY_DISCLOSURES.map((item) => (
              <div key={item.label} className="flex gap-1.5">
                <dt className="text-gray-500">{item.label}</dt>
                <dd className="text-gray-300">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-700 text-xs text-gray-300 flex flex-col sm:flex-row justify-between gap-2">
          <p>© 2026 화이트펭귄. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-white transition-colors">이용약관</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">개인정보처리방침</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
