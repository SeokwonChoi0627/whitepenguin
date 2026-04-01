import { MetadataRoute } from 'next'
import { PRODUCTS } from '@/lib/products'
import { CATEGORIES } from '@/lib/categories'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://whitepenguin.co.kr'

  const staticPages: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: 'weekly', priority: 1.0 },
    { url: `${base}/products`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/quote`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/reviews`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
    { url: `${base}/qna`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/community`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.5 },
  ]

  const categoryPages: MetadataRoute.Sitemap = CATEGORIES.map((cat) => ({
    url: `${base}/category/${cat.key}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  const productPages: MetadataRoute.Sitemap = PRODUCTS.map((product) => ({
    url: `${base}/product/${product.id}`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.6,
  }))

  return [...staticPages, ...categoryPages, ...productPages]
}
