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
          {/* Data Don't Lie Section */}
          <section>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">
                      Data Don't Lie
                    </h2>
                    <p className="text-purple-600 font-medium">Weekly Series</p>
                  </div>
                </div>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
                  New Series
                </span>
              </div>
              
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                A weekly deep dive into data stories, analysis, and insights that reveal the truth behind the numbers. 
                Exploring trends, debunking myths, and uncovering patterns that matter.
              </p>

              {/* Data Don't Lie posts will appear here */}
              <DataDontLiePosts />
            </div>
          </section>

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

        {/* Newsletter CTA */}
        <div className="max-w-4xl mx-auto">
          <div className="text-center mt-16 p-8 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <h2 className="text-2xl font-bold mb-4">
              Stay Updated
            </h2>
            <p className="mb-6">
              Get notified when new "Data Don't Lie" episodes are published and never miss an insight.
            </p>
            <button className="inline-flex items-center px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors">
              Subscribe to Updates
              <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}