// lib/demos.ts
import { Demo } from '@/types/demo'

// Sample demo data - replace with your actual projects
const demos: Demo[] = [
  {
    slug: 'dashboard-analytics',
    title: 'Real-time Materials Dashboard',
    description: 'A custom comprehensive dashboard showing real-time data with interactive charts, filters, and responsive design.',
    image: '/images/demos/dashboard-preview.jpg',
    techStack: ['Python', 'Matplotlib'],
    category: 'fullstack',
    complexity: 'advanced',
    buildTime: '2 weeks',
    status: 'in-progress',
    featured: true,
    githubUrl: 'https://github.com/dillon-shearer',
    liveUrl: 'https://your-dashboard-demo.vercel.app',
    highlights: [
      'Real-time data streaming',
      'Interactive data visualization',
      'Responsive design',
      'Performance optimized'
    ]
  }
]

export function getAllDemos(): Demo[] {
  return demos.sort((a, b) => {
    // Featured first, then by complexity, then alphabetical
    if (a.featured && !b.featured) return -1
    if (!a.featured && b.featured) return 1
    
    const complexityOrder = { advanced: 3, intermediate: 2, beginner: 1 }
    const complexityDiff = complexityOrder[b.complexity] - complexityOrder[a.complexity]
    
    if (complexityDiff !== 0) return complexityDiff
    
    return a.title.localeCompare(b.title)
  })
}

export function getDemoBySlug(slug: string): Demo | undefined {
  return demos.find(demo => demo.slug === slug)
}

export function getDemosByCategory(category: Demo['category']): Demo[] {
  return demos.filter(demo => demo.category === category)
}

export function getFeaturedDemos(): Demo[] {
  return demos.filter(demo => demo.featured)
}