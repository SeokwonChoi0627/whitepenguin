import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { notFound } from 'next/navigation'
import { CATEGORY_MAP } from '@/lib/categories'
import { getCategoryDescription, saveCategoryDescription, uploadCategoryDescriptionImage } from '@/app/actions/category-descriptions'
import dynamic from 'next/dynamic'

const RichTextEditor = dynamic(() => import('@/components/RichTextEditor'), { ssr: false })

export default async function AdminCategoryPage({ params }: { params: { key: string } }) {
  const category = CATEGORY_MAP[params.key]
  if (!category) notFound()

  const descriptionHtml = await getCategoryDescription(params.key)

  return (
    <div className="min-h-screen bg-[#F7F3EE]">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <Link href="/admin/categories"
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-[#333333]">
            <ChevronLeft size={20} />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-[#333333]">
              {category.emoji} {category.label}
            </h1>
            <p className="text-xs text-gray-400">{category.description}</p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <RichTextEditor
          entityId={params.key}
          initialContent={descriptionHtml}
          title={`${category.label} 카테고리 설명`}
          previewHref={`/category/${params.key}`}
          saveAction={saveCategoryDescription}
          uploadImageAction={uploadCategoryDescriptionImage}
        />
      </div>
    </div>
  )
}
