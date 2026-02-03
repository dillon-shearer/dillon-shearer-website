import { notFound } from 'next/navigation'
import { CustomMDX } from '@/app/components/mdx'
import { formatDate, getBlogPosts } from '@/app/blog/utils'
import { baseUrl } from '@/app/sitemap'
import Breadcrumbs from '@/app/components/breadcrumbs'

// Updated type for Next.js 15
type Params = {
  params: Promise<{
    slug: string
  }>
}

export async function generateStaticParams() {
  let posts = getBlogPosts()

  return posts.map((post) => ({
    slug: post.slug,
  }))
}

// Make this async and await params
export async function generateMetadata({ params }: Params) {
  const { slug } = await params
  let post = getBlogPosts().find((post) => post.slug === slug)
  if (!post) {
    return
  }

  let {
    title,
    publishedAt: publishedTime,
    summary: description,
    image,
  } = post.metadata
  let ogImage = image
    ? image
    : `${baseUrl}/og?title=${encodeURIComponent(title)}`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      publishedTime,
      url: `${baseUrl}/blog/${post.slug}`,
      images: [
        {
          url: ogImage,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  }
}

// Make this async and await params
export default async function Blog({ params }: Params) {
  const { slug } = await params
  let post = getBlogPosts().find((post) => post.slug === slug)

  if (!post) {
    notFound()
  }

  const breadcrumbItems = [
    { name: 'Blog', url: `${baseUrl}/blog` },
    { name: post.metadata.title, url: `${baseUrl}/blog/${post.slug}` },
  ]

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="max-w-4xl mx-auto">
          <Breadcrumbs items={breadcrumbItems} />

          <script
            type="application/ld+json"
            suppressHydrationWarning
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'BlogPosting',
                headline: post.metadata.title,
                datePublished: post.metadata.publishedAt,
                dateModified: post.metadata.publishedAt,
                description: post.metadata.summary,
                image: post.metadata.image
                  ? `${baseUrl}${post.metadata.image}`
                  : `${baseUrl}/og?title=${encodeURIComponent(post.metadata.title)}`,
                url: `${baseUrl}/blog/${post.slug}`,
                author: {
                  '@type': 'Person',
                  name: 'Dillon Shearer',
                  url: baseUrl,
                  sameAs: [
                    'https://github.com/dillon-shearer',
                    'https://www.linkedin.com/in/dillonshearer/',
                  ],
                },
                publisher: {
                  '@type': 'Person',
                  name: 'Dillon Shearer',
                },
                mainEntityOfPage: {
                  '@type': 'WebPage',
                  '@id': `${baseUrl}/blog/${post.slug}`,
                },
              }),
            }}
          />

          {/* Header with series info if applicable */}
          {post.metadata.series && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="badge-base badge-primary">
                  <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  {post.metadata.series === 'data-dont-lie' ? 'Data Don\'t Lie' : post.metadata.series}
                  {post.metadata.episode && ` • Episode ${post.metadata.episode}`}
                </span>
              </div>
            </div>
          )}

          <h1 className="text-4xl font-bold mb-4 text-white">
            {post.metadata.title}
          </h1>

          <div className="flex items-center gap-3 mb-8 text-sm text-white/60">
            <span>By</span>
            <a
              href="/about"
              className="text-[#54b3d6] hover:text-[#54b3d6]/80 transition-colors font-medium"
            >
              Dillon Shearer
            </a>
            <span>•</span>
            <time dateTime={post.metadata.publishedAt}>
              {formatDate(post.metadata.publishedAt)}
            </time>
          </div>

          <article className="prose prose-neutral dark:prose-invert max-w-none">
            <CustomMDX source={post.content} />
          </article>

          {/* Author bio */}
          <div className="mt-12 p-6 border border-white/10 rounded-lg bg-white/[0.02]">
            <div className="flex items-start gap-4">
              <img
                src="/ds.jpg"
                alt="Dillon Shearer"
                className="w-16 h-16 rounded-full"
              />
              <div>
                <h3 className="font-bold text-white mb-2">About the Author</h3>
                <p className="text-white/60 text-sm mb-3">
                  <strong className="text-white">Dillon Shearer</strong> is a Data Engineer and Data Analyst
                  specializing in healthcare analytics and AI implementation. Currently working at Answer ALS,
                  building data systems for rare disease research.
                </p>
                <a
                  href="/about"
                  className="text-[#54b3d6] hover:text-[#54b3d6]/80 text-sm font-medium"
                >
                  Learn more about Dillon →
                </a>
              </div>
            </div>
          </div>

          {/* Back to blog link */}
          <div className="mt-16 pt-8">
            <div className="divider" />
            <a
              href="/blog"
              className="link-primary inline-flex items-center text-sm mt-8"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Blog
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}