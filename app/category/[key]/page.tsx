import { notFound } from 'next/navigation'
import { PRODUCTS } from '@/lib/products'
import { CATEGORY_MAP } from '@/lib/categories'
import { getCategoryDescription } from '@/app/actions/category-descriptions'
import { getProductThumbnails } from '@/app/actions/thumbnails'
import { getSoldOutProducts } from '@/app/actions/sold-out'
import CategoryPageClient from '@/components/CategoryPageClient'

export default async function CategoryPage({ params }: { params: { key: string } }) {
  const category = CATEGORY_MAP[params.key]
  if (!category) notFound()

  const [descriptionHtml, thumbnailOverrides, soldOutMap] = await Promise.all([
    getCategoryDescription(params.key),
    getProductThumbnails(),
    getSoldOutProducts(),
  ])

  const products = PRODUCTS
    .filter((p) => p.category === params.key)
    .map((p) => ({ ...p, image: thumbnailOverrides[p.id] ?? p.image }))

  return (
    <CategoryPageClient
      category={category}
      products={products}
      descriptionHtml={descriptionHtml}
      soldOutMap={soldOutMap}
    />
  )
}
