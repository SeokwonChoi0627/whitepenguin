import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { POLICY_EFFECTIVE_DATE } from '@/lib/company'

interface LegalPageProps {
  title: string
  /** 상단 안내 문구 (선택) */
  intro?: string
  children: React.ReactNode
}

/** 이용약관·개인정보처리방침이 공유하는 문서 레이아웃 */
export default function LegalPage({ title, intro, children }: LegalPageProps) {
  return (
    <div className="min-h-screen bg-[#F7F3EE]">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-gray-600 transition-colors">
            <ChevronLeft size={22} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-[#333333]">{title}</h1>
            <p className="text-xs text-gray-400 mt-0.5">시행일 {POLICY_EFFECTIVE_DATE}</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {intro && (
          <p className="text-sm text-gray-600 leading-relaxed bg-white border border-gray-200 rounded-xl px-5 py-4 mb-6">
            {intro}
          </p>
        )}
        <div className="bg-white border border-gray-200 rounded-2xl px-5 sm:px-8 py-8 space-y-8">
          {children}
        </div>
      </div>
    </div>
  )
}

/** 문서 안의 한 조항 */
export function Article({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-bold text-[#333333] text-base mb-2.5">{title}</h2>
      <div className="text-sm text-gray-600 leading-[1.9] space-y-2">{children}</div>
    </section>
  )
}

/** 번호 없는 목록 */
export function List({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="list-disc pl-5 space-y-1.5">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  )
}

/** 표 — 수집 항목·보유 기간처럼 대조가 필요한 내용에 쓴다 */
export function Table({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <table className="w-full border-collapse text-sm min-w-[420px]">
        <thead>
          <tr className="bg-[#F7F3EE]">
            {headers.map((h) => (
              <th
                key={h}
                className="border border-gray-200 px-3 py-2 text-left font-semibold text-[#8A6A3B] text-xs whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} className="border border-gray-200 px-3 py-2 text-gray-600 align-top">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
