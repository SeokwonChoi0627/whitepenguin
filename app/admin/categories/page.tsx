import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { CATEGORIES } from '@/lib/categories'

export default function AdminCategoriesPage() {
  return (
    <div className="min-h-screen bg-[#F7F3EE]">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5">
          <h1 className="text-xl font-bold text-[#333333]">카테고리 관리</h1>
          <p className="text-sm text-gray-500 mt-1">
            카테고리를 선택하여 상세 설명을 편집할 수 있습니다.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-100">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.key}
              href={`/admin/categories/${cat.key}`}
              className="flex items-center gap-4 px-5 py-4 hover:bg-[#F7F3EE] transition-colors"
            >
              <span className="text-3xl w-10 text-center flex-shrink-0">{cat.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[#333333]">{cat.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{cat.description}</p>
              </div>
              <ChevronRight size={15} className="text-gray-300 flex-shrink-0" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
