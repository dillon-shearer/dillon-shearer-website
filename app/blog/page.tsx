// app/blog/page.tsx

import { BlogPosts } from '@/app/components/posts'

export const metadata = {
  title: 'Blog | DWD',
  description: 'Read my blog :)',
}

export default function Page() {
  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-16">
        {/* Header Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">
            My Blog
          </h1>
          <p className="text-xl max-w-3xl mx-auto">
            Thoughts, insights, and learnings from my journey in data science and analytics.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <section>
            <BlogPosts />
          </section>
        </div>
      </div>
    </div>
  )
}