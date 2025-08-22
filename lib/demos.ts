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
  slug: 'health-crisis-detector',
  title: 'Real-Time Health Crisis Detector',
  description: 'AI-powered early warning system that monitors multiple live data streams to predict disease outbreaks and track public health sentiment in real-time. Combines social media analysis, search trends, and epidemiological data for advance outbreak predictions.',
  image: '/images/demos/health-crisis-detector-preview.jpg',
  techStack: [
    'Python',
    'FastAPI', 
    'Apache Kafka',
    'Time Series Analysis',
    'Twitter API',
    'Google Trends API',
    'WebSocket',
    'React',
    'Real-time NLP',
    'Anomaly Detection'
  ],
  category: 'data-viz',
  complexity: 'advanced',
  buildTime: '4 weeks',
  status: 'in-progress',
  featured: true,
  githubUrl: undefined, // Will be added when development starts
  liveUrl: undefined,   // Will be added when deployed
  highlights: [
    'Real-time multi-source data ingestion from social media and health APIs',
    'Advanced NLP sentiment analysis on live health discussions',
    'Predictive outbreak detection 1-2 weeks before official reports',
    'Interactive geographic health sentiment mapping',
    'WebSocket-powered live dashboard with real-time alerts',
    'Multi-modal ML combining text analysis and time series forecasting',
    'Early warning system for emerging health concerns in communities',
    'Integration with CDC data and epidemiological trend analysis'
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