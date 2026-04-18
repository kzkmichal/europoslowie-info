import type { MetadataRoute } from 'next'
import { getAllMepSlugs, getAllRepresentativeVoteNumbers } from '@/lib/db/queries'

const BASE = 'https://europoslowie.pl'
export const revalidate = 86400

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [mepSlugs, voteNumbers] = await Promise.all([
    getAllMepSlugs(),
    getAllRepresentativeVoteNumbers(),
  ])

  return [
    { url: BASE,                          lastModified: new Date(), changeFrequency: 'daily',   priority: 1.0 },
    { url: `${BASE}/europoslowie`,        lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.9 },
    { url: `${BASE}/glosowania`,          lastModified: new Date(), changeFrequency: 'daily',   priority: 0.8 },
    { url: `${BASE}/top-glosowania`,      lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.7 },
    { url: `${BASE}/o-projekcie`,         lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE}/metodologia`,         lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    ...mepSlugs.map(({ slug, updatedAt }) => ({
      url: `${BASE}/poslowie/${slug}`,
      lastModified: updatedAt ?? new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    ...voteNumbers.map(({ voteNumber, date }) => ({
      url: `${BASE}/glosowania/${voteNumber}`,
      lastModified: date ?? new Date(),
      changeFrequency: 'never' as const,
      priority: 0.6,
    })),
  ]
}
