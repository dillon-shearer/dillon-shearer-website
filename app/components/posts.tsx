// app/components/posts.tsx
import Link from 'next/link'
import { formatDate, getBlogPosts } from '@/app/blog/utils'

export function BlogPosts() {
  // Filter out Data Don't Lie series posts for general blog
  const allPosts = getBlogPosts()
  const generalPosts = allPosts
    .filter(post => post.metadata.series !== 'data-dont-lie')
    .sort((a, b) => {
      if (new Date(a.metadata.publishedAt) > new Date(b.metadata.publishedAt)) {
        return -1
      }
      return 1
    })

  if (generalPosts.length === 0) {
    return (
      <div className="rounded-xl p-8 border-2 border-dashed text-center" style={{ borderColor: 'var(--border-primary)' }}>
        <div style={{ color: 'var(--text-secondary)' }}>
          <p className="font-medium mb-2">No general blog posts yet</p>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>General thoughts and insights will appear here</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {generalPosts.map((post) => (
        <article
          key={post.slug}
          className="rounded-xl p-6 transition-all"
          style={{
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border-secondary)'
          }}
        >
          <Link href={`/blog/${post.slug}`} className="block group">
            <div className="flex items-start justify-between gap-4 mb-3">
              <h3 className="text-lg font-semibold text-white group-hover:text-[--brand-cyan] transition-colors flex-1">
                {post.metadata.title}
              </h3>
              <time className="text-sm flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                {formatDate(post.metadata.publishedAt)}
              </time>
            </div>

            <p className="text-sm line-clamp-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {post.metadata.summary}
            </p>
          </Link>
        </article>
      ))}
    </div>
  )
}