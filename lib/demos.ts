import { Demo } from '@/types/demo'

const demos: Demo[] = [
  {
    slug: 'materials-dashboard',
    title: 'Real-time Materials Dashboard',
    description: 'Interactive inventory management system with real-time analytics, scenario planning, and predictive insights for manufacturing operations. Features dynamic KPIs, supply chain simulation, and responsive design.',
    image: '/images/demos/materials-dashboard-preview.jpg',
    techStack: ['React', 'TypeScript', 'Next.js', 'Tailwind CSS', 'Interactive Charts'],
    category: 'fullstack',
    complexity: 'intermediate',
    buildTime: '2 days',
    status: 'live',
    featured: true,
    githubUrl: 'https://github.com/dillon-shearer/dillon-shearer-website/blob/main/app/demos/materials-dashboard/dashboard.tsx',
    liveUrl: undefined, // Will be the demo page itself
    highlights: [
      'Real-time inventory tracking with status indicators',
      'Interactive scenario planning (stockouts, overstock, seasonal spikes)',
      'Automated KPI calculations and trend analysis',
      'Hidden control panel for comprehensive data manipulation',
      'Responsive design optimized for mobile and desktop',
      'Dynamically generated synthetic materials data'
    ]
  },
  {
    slug: 'health-dashboards',
    title: 'Multi-Platform Health Analytics',
    description: 'Interactive health data visualization across 4 major BI platforms using CDC PLACES data. Same dataset, four different stakeholder perspectives - demonstrating versatility across enterprise analytics tools.',
    image: '/images/demos/health-dashboards-preview.jpg',
    techStack: ['Power BI', 'Tableau', 'Looker Studio', 'Amazon QuickSight', 'CDC PLACES Data', 'Next.js'],
    category: 'data-viz',
    complexity: 'intermediate',
    buildTime: '4 days',
    status: 'in-progress',
    featured: true,
    githubUrl: undefined,
    liveUrl: undefined,
    highlights: [
      'Same healthcare dataset across 4 different BI platforms',
      'Tailored dashboards for different business stakeholders',
      'Real CDC community health data with geographic analysis',
      'Embedded live dashboards with seamless platform switching',
      'Demonstrates proficiency across major enterprise BI tools',
      'Interactive filtering and drill-down capabilities'
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