// types/demo.ts
export interface Demo {
  slug: string
  title: string
  description: string
  image: string
  techStack: string[]
  category: 'frontend' | 'fullstack' | 'data-viz' | 'component' | 'api'
  complexity: 'beginner' | 'intermediate' | 'advanced'
  buildTime: string
  status: 'live' | 'in-progress'
  featured: boolean
  githubUrl?: string
  liveUrl?: string
  demoUrl?: string
  highlights: string[]
}