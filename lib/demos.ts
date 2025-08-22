// Update: lib/demos.ts
import { Demo } from '@/types/demo'

const demos: Demo[] = [
  {
    slug: 'materials-dashboard',
    title: 'Real-time Materials Dashboard',
    description: 'Interactive inventory management system with real-time analytics, scenario planning, and predictive insights for manufacturing operations. Features dynamic KPIs, supply chain simulation, and responsive design.',
    image: '/images/demos/materials-dashboard-preview.jpg',
    techStack: ['React', 'TypeScript', 'Next.js', 'Tailwind CSS', 'Interactive Charts'],
    category: 'fullstack',
    complexity: 'advanced',
    buildTime: '2 days',
    status: 'live',
    featured: true,
    githubUrl: 'https://github.com/dillon-shearer',
    liveUrl: undefined, // Will be the demo page itself
    highlights: [
      'Real-time inventory tracking with status indicators',
      'Interactive scenario planning (stockouts, overstock, seasonal spikes)',
      'Automated KPI calculations and trend analysis',
      'Hidden control panel for comprehensive data manipulation',
      'Responsive design optimized for mobile and desktop',
      'Dynamically generated synthetic materials data'
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