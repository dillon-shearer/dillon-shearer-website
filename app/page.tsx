import GitHubWidget from '@/app/components/github-widget'
import SplashOverlay from '@/app/components/splash-overlay'
import HeroTitle from '@/app/components/hero-title'
import TripleClickAvatar from '@/app/components/triple-click-avatar'
import AnimatedCardStack from '@/app/components/animated-card-stack'
import MagneticButton from '@/app/components/magnetic-button'
import AnalyticsWidget from '@/app/components/analytics-widget'

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
      <div className="min-h-screen">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <header className="text-center mb-32">
            <div className="flex flex-col items-center gap-8">
              <TripleClickAvatar
                redirectPath="/demos/gym-dashboard/form"
                className="w-40 h-40 rounded-full border border-white/10 shadow-2xl cursor-pointer"
              />
              <div className="text-center space-y-3">
                <HeroTitle />
                <p className="text-lg leading-relaxed max-w-2xl mx-auto text-white/60">
                  Data-centric software engineer working end to end across the data lifecycle. Currently building analytics, pipelines, and AI tooling for healthcare and life-science teams.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3.5 w-full sm:w-auto justify-center">
                <MagneticButton
                  href="/contact"
                  className="btn-primary"
                >
                  Contact Me
                </MagneticButton>
                <MagneticButton
                  href="/demos"
                  className="btn-secondary"
                >
                  View Interactive Demos
                </MagneticButton>
                <MagneticButton
                  href="/resumes"
                  className="btn-secondary"
                >
                  View Role-Specific Resumes
                </MagneticButton>
              </div>
            </div>
          </header>

          {/* Card Stack Section */}
          <section className="mb-20">
            <div className="mb-8">
              <p className="section-label">
                What I Do
              </p>
            </div>

            <AnimatedCardStack cards={cardStackData} />
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AnalyticsWidget />
            <GitHubWidget />
          </section>
        </div>
      </div>
      <SplashOverlay />
    </>
  )
}
