import { Demo } from '@/types/demo'

const demos: Demo[] = [
  {
    slug: 'data-access-portal',
    title: 'Data Access Workflow Portal',
    description:
      'End to end data access workflow that mirrors how research teams request, review, and retrieve scoped API keys. Includes requester intake, admin triage with approvals, and gated API delivery backed by live data.',
    image: '/images/demos/data-access-portal-preview.jpg',
    techStack: ['Next.js', 'TypeScript', 'Tailwind CSS', 'Vercel Postgres', 'Resend'],
    category: 'fullstack',
    complexity: 'intermediate',
    buildTime: '6 days',
    status: 'live',
    featured: true,
    githubUrl:
      'https://github.com/dillon-shearer/dillon-shearer-website/tree/main/app/demos/data-access-portal',
    liveUrl: 'https://www.datawithdillon.com/demos/data-access-portal',
    highlights: [
      'Requester intake form that validates metadata, collaborators, and dataset scopes against the Vercel Postgres store.',
      'Admin console with real time status changes, request filtering, and instant API key issuance.',
      'Secure data download room that unlocks datasets only for approved scopes.',
      'Email notifications powered by Resend that deliver the scoped key to the requester automatically.',
      'Shared component system that keeps the workflow story consistent across requester and admin lanes.',
    ],
  },
  {
    slug: 'materials-dashboard',
    title: 'Materials Dashboard (Synthetic Data)',
    description: 'Interactive inventory management system with real-time analytics, scenario planning, and predictive insights for manufacturing operations. Features dynamic KPIs, supply chain simulation, and responsive design.',
    image: '/images/demos/materials-dashboard-preview.jpg',
    techStack: ['React', 'TypeScript', 'Next.js', 'Tailwind CSS', 'Interactive Charts'],
    category: 'fullstack',
    complexity: 'beginner',
    buildTime: '2 days',
    status: 'live',
    featured: false,
    githubUrl: 'https://github.com/dillon-shearer/dillon-shearer-website/blob/main/app/demos/materials-dashboard/dashboard.tsx',
    liveUrl: 'https://www.datawithdillon.com/demos/materials-dashboard', // Will be the demo page itself
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
    slug: 'gym-dashboard',
    title: 'Gym Data Tracker',
    description: 'My real-time personal fitness tracking dashboard with workout history, lift analytics, and progress visualization. Daily updates of gym lift data with comprehensive volume calculations and performance metrics.',
    image: '/images/demos/gym-dashboard-preview.jpg',
    techStack: ['React', 'Tailwind CSS', 'PostgreSQL', 'API Endpoints'],
    category: 'fullstack',
    complexity: 'intermediate',
    buildTime: '3 days',
    status: 'live',
    featured: true,
    githubUrl: 'https://github.com/dillon-shearer/dillon-shearer-website/blob/main/app/demos/gym-dashboard/dashboard.tsx',
    liveUrl: 'https://www.datawithdillon.com/demos/gym-dashboard', // Will be the demo page itself
    highlights: [
      'Track weight, reps, and sets for major lifts',
      'Automatic volume calculations and KPI tracking',
      'Clean, minimal interface focused on core metrics',
      'Workout history with sortable data tables',
      'Responsive dark theme design',
      'Real-time statistics dashboard'
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
