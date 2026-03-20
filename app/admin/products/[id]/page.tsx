import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { notFound } from 'next/navigation'
import { PRODUCTS } from '@/lib/products'
import { CATEGORY_MAP } from '@/lib/categories'
import { getProductImages } from '@/app/actions/images'
import { getProductDescription, saveProductDescription, uploadDescriptionImage } from '@/app/actions/descriptions'
import { getProductThumbnails } from '@/app/actions/thumbnails'
import AdminImageManager from '@/components/AdminImageManager'
import dynamic from 'next/dynamic'

const RichTextEditor = dynamic(() => import('@/components/RichTextEditor'), { ssr: false })

export default async function AdminProductPage({ params }: { params: { id: string } }) {
  const product = PRODUCTS.find((p) => p.id === params.id)
  if (!product) notFound()

  const category = CATEGORY_MAP[product.category]
  const [images, descriptionHtml, thumbnailOverrides] = await Promise.all([
    getProductImages(params.id),
    getProductDescription(params.id),
    getProductThumbnails(),
  ])

  const customThumbnail = thumbnailOverrides[params.id] ?? null

  return (
    <div className="min-h-screen bg-[#F7F3EE]">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <Link href="/admin"
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-[#333333]">
            <ChevronLeft size={20} />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-[#333333]">{product.name}</h1>
            <p className="text-xs text-gray-400">{category?.label} · {product.id}</p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <AdminImageManager
          product={product}
          initialThumbnail={customThumbnail}
          initialImages={images}
        />
        <RichTextEditor
          entityId={product.id}
          initialContent={descriptionHtml}
          title="상품 상세 설명"
          previewHref={`/product/${product.id}`}
          saveAction={saveProductDescription}
          uploadImageAction={uploadDescriptionImage}
        />
      </div>
    </div>
  )
}
