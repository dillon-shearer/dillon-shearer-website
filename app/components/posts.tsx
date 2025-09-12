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
      <div className="bg-white dark:bg-gray-700 rounded-lg p-6 border-2 border-dashed border-gray-200 dark:border-gray-600">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <p className="font-medium">No general blog posts yet</p>
          <p className="text-sm">General thoughts and insights will appear here</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {generalPosts.map((post) => (
        <article key={post.slug} className="bg-white dark:bg-gray-700 rounded-lg p-6 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
          <Link href={`/blog/${post.slug}`} className="block">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex-1">
                {post.metadata.title}
              </h3>
              <time className="text-sm text-gray-500 dark:text-gray-400 ml-4 flex-shrink-0">
                {formatDate(post.metadata.publishedAt)}
              </time>
            </div>
            
            <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-2">
              {post.metadata.summary}
            </p>
          </Link>
        </article>
      ))}
    </div>
  )
}