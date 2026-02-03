import { getBlogPosts } from 'app/blog/utils'

export const baseUrl = 'https://datawithdillon.com'

export default async function sitemap() {
  let blogs = getBlogPosts().map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: post.metadata.publishedAt,
  }))

  let routes = [
    // Core pages
    '',
    '/about',
    '/contact',
    '/blog',

    // Services
    '/services/data-engineer',
    '/services/data-analyst',
    '/services/healthcare-data',

    // Resumes
    '/resumes',
    '/resumes/comprehensive',
    '/resumes/data-engineer',
    '/resumes/data-analyst',
    '/resumes/python-developer',

    // Demos
    '/demos',
    '/demos/gym-dashboard',
    '/demos/gym-dashboard/form',
    '/demos/data-access-portal',
    '/demos/data-access-portal/request',
    '/demos/data-access-portal/admin',
    '/demos/data-access-portal/data-download',
    '/demos/dillons-data-cleaner',

    // Education/Resources
    '/certifications',
    '/jupyter',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString().split('T')[0],
  }))

  return [...routes, ...blogs]
}
