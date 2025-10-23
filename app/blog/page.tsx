// app/blog/page.tsx
import { BlogPosts } from '@/app/components/posts'
import { DataDontLiePosts } from '@/app/components/data-dont-lie-posts'

export const metadata = {
  title: 'Blog | DWD',
  description: 'Read my blog :)',
}

export default function Page() {
  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header Section */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">
            My Blog
          </h1>
          <p className="text-xl max-w-3xl mx-auto">
            Thoughts, insights, and learnings from my journey in data science and analytics.
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-12">
          {/* General Blog Section */}
          <section>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-8">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold">
                    General Blog
                  </h2>
                  <p className="text-blue-600 font-medium">Thoughts & Insights</p>
                </div>
              </div>
              
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                General thoughts, tutorials, and insights from my experiences in data science, 
                analytics, and technology.
              </p>

              <div className="space-y-4">
                <BlogPosts />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}