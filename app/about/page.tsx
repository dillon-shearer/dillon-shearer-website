import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About Dillon Shearer | Data-Centric Software Engineer',
  description: 'Data-centric software engineer building data systems, analytics, and applications. Currently focused on healthcare and life sciences.',
  openGraph: {
    title: 'About Dillon Shearer | Data-Centric Software Engineer',
    description: 'Data-centric software engineer building data systems, analytics, and applications. Currently focused on healthcare and life sciences.',
    type: 'website',
  },
}

const skills = {
  visualization: ['Tableau', 'Power BI', 'Recharts', 'Matplotlib', 'Seaborn'],
  analytics: ['Python', 'SQL', 'R', 'Pandas', 'NumPy'],
  engineering: ['dbt', 'Snowflake', 'PostgreSQL', 'ETL'],
  ai: ['LLM Agents', 'RAG', 'Prompt Engineering'],
}

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Header Section */}
        <header className="text-center mb-20">
          <div className="mb-6">
            <p className="section-label">
              About Me
            </p>
          </div>
          <h1 className="section-title">
            About Dillon Shearer
          </h1>
          <p className="section-subtitle max-w-2xl mx-auto">
            Data-Centric Software Engineer building data systems, analytics, and applications. Currently focused on healthcare and life sciences.
          </p>
        </header>

        {/* Story Section */}
        <section className="mb-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Journey Card */}
            <div className="card-accent card-hover group relative overflow-hidden p-8">
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-[--brand-cyan]/20 rounded-full blur-3xl opacity-50 group-hover:opacity-70 transition-opacity duration-500" />
              <div className="relative z-10">
                <p className="text-label mb-4" style={{ color: 'var(--brand-cyan)' }}>The Journey</p>
                <h2 className="text-2xl font-bold mb-5" style={{ color: 'var(--text-primary)' }}>
                  From Curious Graduate to Data Scientist
                </h2>
                <div className="space-y-4">
                  <p className="leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    After graduating with my MIS degree from UWG, I wasn't sure which direction
                    to take my career. An internship as a QA/BA at a rare disease data platform
                    opened my eyes to the impact that clean, well-structured data can have on real lives.
                  </p>
                  <p className="leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    That experience led me to my current role as a data scientist at Answer ALS,
                    where I've been learning and growing ever since.
                  </p>
                </div>
              </div>
            </div>

            {/* Passion Card */}
            <div className="card-base card-hover p-8">
              <p className="text-label mb-4" style={{ color: 'var(--text-secondary)' }}>What Drives Me</p>
              <h2 className="text-2xl font-bold mb-5" style={{ color: 'var(--text-primary)' }}>
                Variety & Impact
              </h2>
              <div className="space-y-4">
                <p className="leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  What I love most about this work is the variety. Healthcare data challenges
                  don't fit into neat categories, so I've embraced everything from building
                  AI agents to creating executive dashboards to implementing data transformation tools.
                </p>
                <p className="leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  Behind every data point is a patient, a family, or a researcher working toward
                  better treatments. That's what keeps me focused on getting it right.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* What I Do Section */}
        <section className="mb-20">
          <div className="mb-8">
            <p className="section-label">
              What I Do
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Visualization */}
            <div className="card-base card-hover p-6">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: 'rgba(84, 179, 214, 0.15)' }}>
                <svg className="w-5 h-5" style={{ color: 'var(--brand-cyan)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2.5 text-white">Data Visualization</h3>
              <p className="text-sm mb-4 text-white/60">Creating compelling stories from complex datasets</p>
              <div className="flex flex-wrap gap-2">
                {skills.visualization.map(skill => (
                  <span key={skill} className="badge-base badge-secondary">
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Analytics */}
            <div className="card-base card-hover p-6">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: 'rgba(139, 92, 246, 0.15)' }}>
                <svg className="w-5 h-5" style={{ color: 'rgb(192, 132, 252)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2.5 text-white">Analytics & Reporting</h3>
              <p className="text-sm mb-4 text-white/60">Building dashboards and automated reports</p>
              <div className="flex flex-wrap gap-2">
                {skills.analytics.map(skill => (
                  <span key={skill} className="badge-base badge-secondary">
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Engineering */}
            <div className="card-base card-hover p-6">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: 'rgba(34, 197, 94, 0.15)' }}>
                <svg className="w-5 h-5" style={{ color: 'rgb(134, 239, 172)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2.5 text-white">Data Engineering</h3>
              <p className="text-sm mb-4 text-white/60">Cleaning, structuring, and pipeline development</p>
              <div className="flex flex-wrap gap-2">
                {skills.engineering.map(skill => (
                  <span key={skill} className="badge-base badge-secondary">
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* AI */}
            <div className="card-base card-hover p-6">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: 'rgba(249, 115, 22, 0.15)' }}>
                <svg className="w-5 h-5" style={{ color: 'rgb(251, 146, 60)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2.5 text-white">AI Implementation</h3>
              <p className="text-sm mb-4 text-white/60">Developing agents and intelligent solutions</p>
              <div className="flex flex-wrap gap-2">
                {skills.ai.map(skill => (
                  <span key={skill} className="badge-base badge-secondary">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* My Approach Section */}
        <section className="mb-20">
          <div className="card-base text-center p-10">
            <p className="text-label mb-4" style={{ color: 'var(--text-secondary)' }}>My Approach</p>
            <h2 className="text-2xl font-bold mb-5 text-white">
              Technical Rigor Meets Genuine Curiosity
            </h2>
            <p className="leading-relaxed max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
              I believe that the best data work happens when you combine technical rigor
              with genuine curiosity about the problems you're solving. I'm always learning
              something new, whether that's mastering a new tool, diving deeper into a domain
              area, or finding better ways to communicate complex insights to diverse stakeholders.
            </p>
          </div>
        </section>

        {/* CTA Section */}
        <section className="max-w-2xl mx-auto">
          <div className="card-accent text-center p-12">
            <h2 className="text-3xl font-bold mb-5 text-white">
              Let's Connect
            </h2>
            <p className="mb-8 max-w-md mx-auto leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Interested in discussing data challenges, especially in healthcare
              and life sciences? I'd love to hear from you.
            </p>
            <a
              href="/contact"
              className="btn-primary"
            >
              Get in Touch
            </a>
          </div>
        </section>
      </div>
    </div>
  )
}
