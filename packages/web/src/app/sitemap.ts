import type { MetadataRoute } from 'next'

const APP_URL = process.env['NEXT_PUBLIC_APP_URL'] ?? 'https://reflog.app'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: APP_URL, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${APP_URL}/u/danielmoliari`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
  ]
}
