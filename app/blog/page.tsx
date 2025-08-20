import { BlogPosts } from '@/app/components/posts'

export const metadata = {
  title: 'Blog',
  description: 'Read my blog.',
}

export default function Page() {
  return (
    <div className="max-w-4xl mx-auto">
      <section>
        <h1 className="font-semibold text-lg mb-8 tracking-tighter">My Blog</h1>
        <BlogPosts />
      </section>
    </div>
  )
}