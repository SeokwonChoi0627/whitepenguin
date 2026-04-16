import { PRODUCTS } from '@/lib/products'
import { CATEGORY_MAP } from '@/lib/categories'
import { getProductImages } from '@/app/actions/images'
import { getProductDescription } from '@/app/actions/descriptions'
import { getProductThumbnails } from '@/app/actions/thumbnails'
import { isSoldOut } from '@/app/actions/sold-out'
import { notFound } from 'next/navigation'
import ProductDetailClient from '@/components/ProductDetailClient'

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
  const product = PRODUCTS.find((p) => p.id === params.id)
  if (!product) notFound()

  const category = CATEGORY_MAP[product.category]
  const [extraImages, descriptionHtml, thumbnailOverrides, soldOut] = await Promise.all([
    getProductImages(params.id),
    getProductDescription(params.id),
    getProductThumbnails(),
    isSoldOut(params.id),
  ])

  // 썸네일 오버라이드 적용
  const thumbnail = thumbnailOverrides[params.id] ?? product.image
  const allImages = [...(thumbnail ? [thumbnail] : []), ...extraImages]

  return (
    <ProductDetailClient
      product={product}
      category={category}
      images={allImages}
      descriptionHtml={descriptionHtml}
      soldOut={soldOut}
    />
  )
}
