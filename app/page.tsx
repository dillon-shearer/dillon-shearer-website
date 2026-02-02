import GitHubWidget from '@/app/components/github-widget'
import SplashOverlay from '@/app/components/splash-overlay'
import HeroTitle from '@/app/components/hero-title'
import TripleClickAvatar from '@/app/components/triple-click-avatar'
import AnimatedCardStack from '@/app/components/animated-card-stack'
import MagneticButton from '@/app/components/magnetic-button'

// NOTE: Keep the triple-click easter egg on the hero image pointing to the gym form.
const cardStackData = [
  {
    label: 'Core Focus',
    title: 'Full-Stack Data Engineering',
    subtitle: 'From intake to insight',
    description: 'I design controlled intake flows and deploy production analytics that ingest daily, surface anomalies, and stay accurate long after the go-live meeting.',
    skills: ['Python', 'SQL', 'PostgreSQL', 'Snowflake', 'dbt'],
    accentColor: '#54b3d6',
  },
  {
    label: 'Capability',
    title: 'Automation & AI',
    description: 'Embed automation and assistant workflows that remove repetitive reporting and give operators answers on demand.',
    skills: ['GitHub Actions', 'ETL', 'Jupyter', 'Claude API', 'LangChain'],
  },
  {
    label: 'Specialization',
    title: 'Healthcare Standards',
    description: 'Maintain vocabularies, mappings, and documentation so downstream models and dashboards always speak the same language.',
    skills: ['SNOMED', 'LOINC', 'HL7 FHIR', 'OMOP'],
  },
  {
    label: 'Toolkit',
    title: 'Technical Stack',
    description: 'Full-stack capabilities across data engineering, analytics, and web development.',
    skills: ['Python', 'SQL', 'R', 'React', 'Pandas', 'NumPy', 'Scikit-learn', 'Tableau', 'Power BI', 'Recharts', 'Matplotlib', 'Seaborn'],
  },
]

export default function HomePage() {
  return (
    <>
      <div className="min-h-screen bg-black text-white">
        <div className="max-w-7xl mx-auto px-6 pt-10 pb-24">
          <header className="text-center mb-24">
            <div className="flex flex-col items-center gap-6">
              <TripleClickAvatar
                redirectPath="/demos/gym-dashboard/form"
                className="w-40 h-40 rounded-full border border-white/10 shadow-2xl cursor-pointer"
              />
              <div className="text-center">
                <HeroTitle />
                <p className="mt-4 text-lg text-white/80 max-w-3xl mx-auto">
                  Data-centric software engineer working end to end across the data lifecycle. Currently building analytics, pipelines, and AI tooling for healthcare and life-science teams.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto justify-center">
                <MagneticButton
                  href="/contact"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 transition-colors font-semibold"
                >
                  Contact Me
                </MagneticButton>
                <MagneticButton
                  href="/demos"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-xl border border-white/30 hover:border-white font-semibold"
                >
                  View interactive demos
                </MagneticButton>
                <MagneticButton
                  href="/resumes"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-xl border border-white/20 hover:border-white/60 font-semibold text-white/80"
                >
                  View Role-Specific Resumes
                </MagneticButton>
              </div>
            </div>
          </header>

          {/* Card Stack Section */}
          <section className="space-y-8">
            <h2 className="text-sm uppercase tracking-[0.3em] text-white/50">
              What I Do
            </h2>

            <AnimatedCardStack cards={cardStackData} />
          </section>

          <div className="mt-16">
            <GitHubWidget />
          </div>
        </div>
      </div>
      <SplashOverlay />
    </>
  )
}
