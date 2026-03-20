import { getProductThumbnails } from '@/app/actions/thumbnails'
import ProductsContent from './ProductsContent'

export default async function ProductsPage() {
  const thumbnailOverrides = await getProductThumbnails()
  return <ProductsContent thumbnailOverrides={thumbnailOverrides} />
}
