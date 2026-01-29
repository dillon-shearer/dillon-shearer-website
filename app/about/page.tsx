import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About | DWD',
  description: 'Data-centric software engineer building data systems, analytics, and applications. Currently focused on healthcare and life sciences.',
  openGraph: {
    title: 'About | Data With Dillon',
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
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Header Section */}
        <header className="text-center mb-16">
          <p className="text-sm uppercase tracking-[0.3em] text-[#54b3d6] mb-4">
            About Me
          </p>
          <h1 className="text-4xl lg:text-5xl font-bold mb-6">
            Data-Centric Software Engineer
          </h1>
          <p className="text-xl text-white/80 max-w-3xl mx-auto leading-relaxed">
            Building data systems, analytics, and applications. Currently focused on healthcare and life sciences.
          </p>
        </header>

        {/* Story Section */}
        <section className="mb-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Journey Card */}
            <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#54b3d6]/10 via-white/[0.05] to-transparent p-8 transition-all duration-300 hover:border-[#54b3d6]/30">
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#54b3d6]/20 rounded-full blur-3xl opacity-50 group-hover:opacity-70 transition-opacity duration-500" />
              <div className="relative z-10">
                <p className="text-xs uppercase tracking-[0.3em] text-[#54b3d6] mb-3">The Journey</p>
                <h2 className="text-2xl font-semibold mb-4">From Curious Graduate to Data Scientist</h2>
                <p className="text-white/70 leading-relaxed mb-4">
                  After graduating with my MIS degree from UWG, I wasn't sure which direction
                  to take my career. An internship as a QA/BA at a rare disease data platform
                  opened my eyes to the impact that clean, well-structured data can have on real lives.
                </p>
                <p className="text-white/70 leading-relaxed">
                  That experience led me to my current role as a data scientist at Answer ALS,
                  where I've been learning and growing ever since.
                </p>
              </div>
            </div>

            {/* Passion Card */}
            <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-8 transition-all duration-300 hover:border-white/20">
              <div className="relative z-10">
                <p className="text-xs uppercase tracking-[0.3em] text-white/50 mb-3">What Drives Me</p>
                <h2 className="text-2xl font-semibold mb-4">Variety & Impact</h2>
                <p className="text-white/70 leading-relaxed mb-4">
                  What I love most about this work is the variety. Healthcare data challenges
                  don't fit into neat categories, so I've embraced everything from building
                  AI agents to creating executive dashboards to implementing data transformation tools.
                </p>
                <p className="text-white/70 leading-relaxed">
                  Behind every data point is a patient, a family, or a researcher working toward
                  better treatments. That's what keeps me focused on getting it right.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* What I Do Section */}
        <section className="mb-12">
          <h2 className="text-sm uppercase tracking-[0.3em] text-white/50 mb-6">
            What I Do
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Visualization */}
            <div className="group rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-transparent p-6 transition-all duration-300 hover:border-white/20">
              <div className="w-10 h-10 rounded-xl bg-[#54b3d6]/20 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-[#54b3d6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Data Visualization</h3>
              <p className="text-white/60 text-sm mb-4">Creating compelling stories from complex datasets</p>
              <div className="flex flex-wrap gap-1.5">
                {skills.visualization.map(skill => (
                  <span key={skill} className="px-2 py-1 text-xs bg-white/5 text-white/50 rounded-full border border-white/5">
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Analytics */}
            <div className="group rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-transparent p-6 transition-all duration-300 hover:border-white/20">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Analytics & Reporting</h3>
              <p className="text-white/60 text-sm mb-4">Building dashboards and automated reports</p>
              <div className="flex flex-wrap gap-1.5">
                {skills.analytics.map(skill => (
                  <span key={skill} className="px-2 py-1 text-xs bg-white/5 text-white/50 rounded-full border border-white/5">
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Engineering */}
            <div className="group rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-transparent p-6 transition-all duration-300 hover:border-white/20">
              <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Data Engineering</h3>
              <p className="text-white/60 text-sm mb-4">Cleaning, structuring, and pipeline development</p>
              <div className="flex flex-wrap gap-1.5">
                {skills.engineering.map(skill => (
                  <span key={skill} className="px-2 py-1 text-xs bg-white/5 text-white/50 rounded-full border border-white/5">
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* AI */}
            <div className="group rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-transparent p-6 transition-all duration-300 hover:border-white/20">
              <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">AI Implementation</h3>
              <p className="text-white/60 text-sm mb-4">Developing agents and intelligent solutions</p>
              <div className="flex flex-wrap gap-1.5">
                {skills.ai.map(skill => (
                  <span key={skill} className="px-2 py-1 text-xs bg-white/5 text-white/50 rounded-full border border-white/5">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* My Approach Section */}
        <section className="mb-12">
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent p-8 text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-white/50 mb-3">My Approach</p>
            <h2 className="text-2xl font-semibold mb-4">Technical Rigor Meets Genuine Curiosity</h2>
            <p className="text-white/70 leading-relaxed max-w-3xl mx-auto">
              I believe that the best data work happens when you combine technical rigor
              with genuine curiosity about the problems you're solving. I'm always learning
              something new, whether that's mastering a new tool, diving deeper into a domain
              area, or finding better ways to communicate complex insights to diverse stakeholders.
            </p>
          </div>
        </section>

        {/* CTA Section */}
        <section className="max-w-2xl mx-auto">
          <div className="text-center rounded-3xl border border-white/10 bg-gradient-to-br from-[#54b3d6]/5 via-white/[0.03] to-transparent p-10">
            <h2 className="text-2xl font-semibold mb-3">
              Let's Connect
            </h2>
            <p className="text-white/60 mb-8 max-w-md mx-auto">
              Interested in discussing data challenges, especially in healthcare
              and life sciences? I'd love to hear from you.
            </p>
            <a
              href="/contact"
              className="inline-flex items-center justify-center px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 transition-colors font-semibold"
            >
              Get in Touch
            </a>
          </div>
        </section>
      </div>
    </div>
  )
}
