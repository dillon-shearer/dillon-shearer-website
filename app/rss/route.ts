import { baseUrl } from 'app/sitemap'
import { getBlogPosts } from 'app/blog/utils'

const channelTitle = 'Data With Dillon'
const channelDescription = 'Updates from Dillon Shearer on analytics, healthcare data, and build logs.'

const escapeXml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

export async function GET() {
  const posts = await getBlogPosts()
  const sorted = posts.sort((a, b) => (
    new Date(a.metadata.publishedAt) > new Date(b.metadata.publishedAt) ? -1 : 1
  ))

  const itemsXml = sorted
    .map(post => {
      const link = `${baseUrl}/blog/${post.slug}`
      return `    <item>
      <title>${escapeXml(post.metadata.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <description>${escapeXml(post.metadata.summary || '')}</description>
      <pubDate>${new Date(post.metadata.publishedAt).toUTCString()}</pubDate>
    </item>`
    })
    .join('\n')

  const feedUrl = `${baseUrl}/rss`
  const rssFeed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${channelTitle}</title>
    <link>${baseUrl}</link>
    <description>${channelDescription}</description>
    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml" />
${itemsXml}
  </channel>
</rss>`

  return new Response(rssFeed, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 's-maxage=600, stale-while-revalidate=3600',
    },
  })
}
