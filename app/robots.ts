import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/vip/'],
    },
    sitemap: 'https://whitepenguin.co.kr/sitemap.xml',
  }
}
