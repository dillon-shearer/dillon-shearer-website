import GitHubWidget from '@/app/components/github-widget'
import HiddenSnakeButton from '@/app/components/snake-game'
import SplashOverlay from '@/app/components/splash-overlay'
import HeroTitle from '@/app/components/hero-title'
import TripleClickAvatar from '@/app/components/triple-click-avatar'

// NOTE: Keep the triple-click easter egg on the hero image pointing to the gym form.
const bentoCards = {
  featured: {
    label: 'Core Focus',
    title: 'Full-Stack Data Engineering',
    subtitle: 'From intake to insight',
    description: 'I design controlled intake flows and deploy production analytics that ingest daily, surface anomalies, and stay accurate long after the go-live meeting.',
    skills: ['Python', 'SQL', 'PostgreSQL', 'Snowflake', 'dbt'],
  },
  automation: {
    label: 'Capability',
    title: 'Automation & AI',
    description: 'Embed automation and assistant workflows that remove repetitive reporting and give operators answers on demand.',
    skills: ['GitHub Actions', 'ETL', 'Jupyter'],
  },
  healthcare: {
    label: 'Specialization',
    title: 'Healthcare Standards',
    description: 'Maintain vocabularies, mappings, and documentation so downstream models and dashboards always speak the same language.',
    skills: ['SNOMED', 'LOINC', 'HL7 FHIR', 'OMOP'],
  },
  toolkit: {
    label: 'Toolkit',
    title: 'Technical Stack',
    skills: ['Python', 'SQL', 'R', 'React', 'Pandas', 'NumPy', 'Scikit-learn', 'Tableau', 'Power BI', 'Recharts', 'Matplotlib', 'Seaborn'],
  },
}

export default function HomePage() {
  return (
    <>
      <div className="min-h-screen bg-black text-white">
        <div className="max-w-7xl mx-auto px-6 pt-10 pb-16">
          <header className="text-center mb-16">
            <div className="flex flex-col items-center gap-6">
              <TripleClickAvatar
                redirectPath="/demos/gym-dashboard/form"
                className="w-40 h-40 rounded-full border border-white/10 shadow-2xl cursor-pointer"
              />
              <div className="text-center">
                <HeroTitle />
                <p className="mt-4 text-lg text-white/80 max-w-3xl mx-auto">
                  I work end to end across the data lifecycle for health teams: sourcing and modeling messy clinical inputs, building the automation and analytics that sit on top, and delivering stories decision makers can trust.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto justify-center">
                <a
                  href="/contact"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 transition-colors font-semibold"
                >
                  Contact Me
                </a>
                <a
                  href="/demos"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-xl border border-white/30 hover:border-white font-semibold"
                >
                  View interactive demos
                </a>
                <a
                  href="/Dillon_Shearer_Resume.pdf"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-xl border border-white/20 hover:border-white/60 font-semibold text-white/80"
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Download resume
                </a>
              </div>
            </div>
          </header>

          {/* Bento Grid Section */}
          <section className="space-y-6">
            <h2 className="text-sm uppercase tracking-[0.3em] text-white/50">
              What I Do
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
              {/* Left Column - Featured + Toolkit stacked */}
              <div className="flex flex-col gap-4">
                {/* Card 1 - Featured: Full-Stack Data Engineering (60%) */}
                <div className="bento-card-featured group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#54b3d6]/10 via-white/[0.05] to-transparent p-6 lg:p-8 flex-[0.6] min-h-[180px] transition-all duration-300 ease-out hover:border-[#54b3d6]/30 hover:shadow-[0_8px_40px_rgba(84,179,214,0.12)]">
                  <div className="bento-glow-orb absolute -top-24 -right-24 w-48 h-48 bg-[#54b3d6]/20 rounded-full blur-3xl opacity-50 group-hover:opacity-70 transition-opacity duration-500" />
                  <div className="relative z-10">
                    <p className="text-xs uppercase tracking-[0.3em] text-[#54b3d6]">{bentoCards.featured.label}</p>
                    <h3 className="mt-2 text-2xl lg:text-3xl font-semibold text-white">{bentoCards.featured.title}</h3>
                    <p className="mt-1 text-sm text-white/50">{bentoCards.featured.subtitle}</p>
                    <p className="mt-3 text-base text-white/80 leading-relaxed">
                      {bentoCards.featured.description}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {bentoCards.featured.skills.map(skill => (
                        <span key={skill} className="px-3 py-1.5 text-xs font-medium bg-white/5 text-white/60 rounded-full border border-white/5 transition-colors duration-200 group-hover:bg-white/10 group-hover:text-white/80">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Card 4 - Technical Toolkit (40%) */}
                <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-transparent p-6 flex-[0.4] min-h-[160px] transition-all duration-300 ease-out hover:border-white/20 hover:shadow-[0_8px_40px_rgba(84,179,214,0.08)]">
                  <div className="flex flex-col gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-white/50">{bentoCards.toolkit.label}</p>
                      <h3 className="mt-2 text-xl font-semibold text-white">{bentoCards.toolkit.title}</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {bentoCards.toolkit.skills.map(skill => (
                        <span key={skill} className="px-2.5 py-1 text-xs bg-white/5 text-white/50 rounded-full border border-white/5 transition-colors duration-200 group-hover:text-white/70">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Automation + Healthcare stacked */}
              <div className="flex flex-col gap-4">
                {/* Card 2 - Automation & AI */}
                <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-6 flex-1 transition-all duration-300 ease-out hover:border-white/20 hover:shadow-[0_8px_40px_rgba(84,179,214,0.08)]">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/50">{bentoCards.automation.label}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">{bentoCards.automation.title}</h3>
                  <p className="mt-3 text-sm text-white/70 leading-relaxed">
                    {bentoCards.automation.description}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {bentoCards.automation.skills.map(skill => (
                      <span key={skill} className="px-2.5 py-1 text-xs bg-white/5 text-white/50 rounded-full border border-white/5 transition-colors duration-200 group-hover:text-white/70">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Card 3 - Healthcare Standards */}
                <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-6 flex-1 transition-all duration-300 ease-out hover:border-white/20 hover:shadow-[0_8px_40px_rgba(84,179,214,0.08)]">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/50">{bentoCards.healthcare.label}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">{bentoCards.healthcare.title}</h3>
                  <p className="mt-3 text-sm text-white/70 leading-relaxed">
                    {bentoCards.healthcare.description}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {bentoCards.healthcare.skills.map(skill => (
                      <span key={skill} className="px-2.5 py-1 text-xs bg-white/5 text-white/50 rounded-full border border-white/5 transition-colors duration-200 group-hover:text-white/70">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="mt-10 space-y-6">
            <GitHubWidget />
            <div>
              <HiddenSnakeButton />
            </div>
          </div>
        </div>
      </div>
      <SplashOverlay />
    </>
  )
}
