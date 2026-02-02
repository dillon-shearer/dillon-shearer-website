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
      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Header Section */}
        <div className="text-center mb-20">
          <div className="mb-6">
            <p className="section-label">Writing</p>
          </div>
          <h1 className="section-title">
            My Blog
          </h1>
          <p className="section-subtitle max-w-2xl mx-auto">
            Thoughts, insights, and learnings from my journey in data science and analytics.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* General Blog Section */}
          <section>
            <div className="card-base p-8">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(84, 179, 214, 0.15)' }}>
                  <svg className="w-5 h-5" style={{ color: 'var(--brand-cyan)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    General Blog
                  </h2>
                </div>
              </div>

              <div className="space-y-5">
                <BlogPosts />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}