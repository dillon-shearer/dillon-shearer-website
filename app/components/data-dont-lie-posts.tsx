// app/components/data-dont-lie-posts.tsx
import Link from 'next/link'
import { getBlogPosts, formatDate } from '@/app/blog/utils'

export function DataDontLiePosts() {
  // Filter for Data Don't Lie series posts
  const allPosts = getBlogPosts()
  const dataDontLiePosts = allPosts
    .filter(post => post.metadata.series === 'data-dont-lie')
    .sort((a, b) => {
      if (new Date(a.metadata.publishedAt) > new Date(b.metadata.publishedAt)) {
        return -1
      }
      return 1
    })

  if (dataDontLiePosts.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-700 rounded-lg p-6 border-2 border-dashed border-gray-200 dark:border-gray-600">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <svg className="w-10 h-10 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <p className="font-medium">Coming Soon</p>
          <p className="text-sm">Your first "Data Don't Lie" post will appear here</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {dataDontLiePosts.map((post) => (
        <article key={post.slug} className="bg-white dark:bg-gray-700 rounded-lg p-6 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
          <Link href={`/blog/${post.slug}`} className="block">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                  {post.metadata.title}
                </h3>
                {post.metadata.episode && (
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300 mt-1">
                    Episode {post.metadata.episode}
                  </span>
                )}
              </div>
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