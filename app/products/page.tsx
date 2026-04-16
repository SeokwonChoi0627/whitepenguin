import { getProductThumbnails } from '@/app/actions/thumbnails'
import { getSoldOutProducts } from '@/app/actions/sold-out'
import ProductsContent from './ProductsContent'

export default async function ProductsPage() {
  const [thumbnailOverrides, soldOutMap] = await Promise.all([
    getProductThumbnails(),
    getSoldOutProducts(),
  ])
  return <ProductsContent thumbnailOverrides={thumbnailOverrides} soldOutMap={soldOutMap} />
}
