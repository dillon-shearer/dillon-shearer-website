import GitHubWidget from '@/app/components/github-widget'
import HiddenSnakeButton from '@/app/components/snake-game'
import SplashOverlay from '@/app/components/splash-overlay'
import HeroTitle from '@/app/components/hero-title'
import TripleClickAvatar from '@/app/components/triple-click-avatar'

const capabilityHighlights = [
  {
    title: 'Data intake & approvals',
    detail: 'Design controlled intake flows so requests are triaged, approved, and provisioned without bogging down researchers.',
  },
  {
    title: 'Ops-grade analytics',
    detail: 'Deploy production analytics that ingest daily, surface anomalies, and stay accurate long after the go-live meeting.',
  },
  {
    title: 'Automation & enablement',
    detail: 'Embed automation and assistant workflows that remove repetitive reporting and give operators answers on demand.',
  },
  {
    title: 'Data quality & stewardship',
    detail: 'Maintain vocabularies, mappings, and documentation so downstream models and dashboards always speak the same language.',
  },
]

// NOTE: Keep the triple-click easter egg on the hero image pointing to the gym form.
const skillGroups = [
  { label: 'Languages', items: ['Python', 'SQL', 'R', 'React'] },
  { label: 'Analytics', items: ['Pandas', 'NumPy', 'Scikit-learn', 'Statsmodels'] },
  { label: 'Warehousing', items: ['PostgreSQL', 'Snowflake', 'dbt core'] },
  { label: 'Visualization', items: ['Tableau', 'Power BI', 'Matplotlib', 'Seaborn', 'Recharts'] },
  { label: 'Standards', items: ['SNOMED', 'LOINC', 'HL7 FHIR', 'OMOP'] },
  { label: 'Workflow', items: ['Jupyter', 'GitHub Actions', 'ETL Orchestration'] },
]

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
                  href="http://localhost:3000/contact"
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

          <section className="space-y-12">
            <div className="grid gap-8 lg:grid-cols-[0.45fr_0.55fr]">
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Ways I deliver value</h2>
                <div className="grid gap-4">
                  {capabilityHighlights.map(highlight => (
                    <div key={highlight.title} className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
                      <p className="text-xs uppercase tracking-[0.3em] text-white/60">{highlight.title}</p>
                      <p className="mt-2 text-base text-white/90">{highlight.detail}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Skills</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 auto-rows-fr">
                  {skillGroups.map(group => (
                    <div key={group.label} className="rounded-3xl border border-white/10 bg-black/40 px-4 py-4 flex flex-col">
                      <div className="text-xs uppercase tracking-[0.35em] text-white/50">{group.label}</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {group.items.map(item => (
                          <span
                            key={item}
                            className="px-3 py-1 text-sm bg-white/10 rounded-full border border-white/10"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
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
