import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Data Analyst Services',
  description: 'Hire Dillon Shearer for data analytics services: dashboard development, business intelligence, Power BI/Tableau reporting, and healthcare analytics. Based in Georgia.',
}

export default function DataAnalystPage() {
  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-20">
        {/* Hero Section */}
        <div className="max-w-4xl mx-auto text-center mb-20">
          <h1 className="section-title">Data Analyst Services</h1>
          <p className="section-subtitle">
            Transforming complex data into actionable insights through dashboards,
            statistical analysis, and business intelligence solutions.
          </p>
        </div>

        {/* Services Overview */}
        <div className="max-w-5xl mx-auto mb-20">
          <h2 className="text-2xl font-bold text-white mb-8">Analytics Services</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="card-base card-hover p-6">
              <div className="absolute inset-0 bg-gradient-to-br from-[#54b3d6]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" />
              <div className="relative">
                <h3 className="text-xl font-semibold text-white mb-3">Dashboard Development</h3>
                <p className="text-white/60 text-sm leading-relaxed">
                  Design and build interactive dashboards using Power BI, Tableau, and custom
                  web-based solutions. Focus on clear visualizations and user experience.
                </p>
              </div>
            </div>

            <div className="card-base card-hover p-6">
              <div className="absolute inset-0 bg-gradient-to-br from-[#54b3d6]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" />
              <div className="relative">
                <h3 className="text-xl font-semibold text-white mb-3">Business Intelligence</h3>
                <p className="text-white/60 text-sm leading-relaxed">
                  Create comprehensive BI solutions that help stakeholders make data-driven
                  decisions. KPI tracking, trend analysis, and performance monitoring.
                </p>
              </div>
            </div>

            <div className="card-base card-hover p-6">
              <div className="absolute inset-0 bg-gradient-to-br from-[#54b3d6]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" />
              <div className="relative">
                <h3 className="text-xl font-semibold text-white mb-3">Statistical Analysis</h3>
                <p className="text-white/60 text-sm leading-relaxed">
                  Perform exploratory data analysis, hypothesis testing, and statistical
                  modeling using Python, R, and SQL. Deliver actionable insights.
                </p>
              </div>
            </div>

            <div className="card-base card-hover p-6">
              <div className="absolute inset-0 bg-gradient-to-br from-[#54b3d6]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" />
              <div className="relative">
                <h3 className="text-xl font-semibold text-white mb-3">Reporting Automation</h3>
                <p className="text-white/60 text-sm leading-relaxed">
                  Automate recurring reports and analytics workflows. Schedule email delivery,
                  generate PDFs, and build self-service reporting systems.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tools & Technologies */}
        <div className="max-w-5xl mx-auto mb-20">
          <h2 className="text-2xl font-bold text-white mb-8">Analytics Tools</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              'Power BI',
              'Tableau',
              'SQL',
              'Python',
              'R',
              'Pandas',
              'NumPy',
              'Excel',
              'DAX',
              'Jupyter',
              'Matplotlib',
              'Seaborn',
            ].map((tech) => (
              <div
                key={tech}
                className="card-base p-4 text-center text-sm font-medium text-white/80"
              >
                {tech}
              </div>
            ))}
          </div>
        </div>

        {/* Certification Highlight */}
        <div className="max-w-5xl mx-auto mb-20">
          <div className="card-base p-8">
            <div className="absolute inset-0 bg-gradient-to-br from-[#54b3d6]/5 to-transparent opacity-60 rounded-lg" />
            <div className="relative">
              <h2 className="text-2xl font-bold text-white mb-4">Microsoft Certified Power BI Analyst</h2>
              <p className="text-white/70 mb-4 leading-relaxed">
                Certified in Power BI data analysis (PL-300) with expertise in data modeling,
                DAX calculations, and dashboard design following Microsoft best practices.
              </p>
              <Link
                href="/certifications"
                className="text-[#54b3d6] hover:text-[#54b3d6]/80 text-sm font-medium"
              >
                View Certifications →
              </Link>
            </div>
          </div>
        </div>

        {/* Featured Dashboard */}
        <div className="max-w-5xl mx-auto mb-20">
          <h2 className="text-2xl font-bold text-white mb-8">Featured Dashboard</h2>
          <Link href="/demos/gym-dashboard" className="card-base card-hover p-8 group block">
            <div className="absolute inset-0 bg-gradient-to-br from-[#54b3d6]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" />
            <div className="relative">
              <h3 className="text-2xl font-semibold text-white mb-4">Gym Analytics Dashboard</h3>
              <p className="text-white/60 leading-relaxed mb-6">
                Interactive workout analytics platform featuring time-series charts, heatmaps,
                and body diagram visualizations. Includes AI-powered chat analytics using Claude API
                for natural language queries and insights.
              </p>
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                <div>
                  <div className="text-2xl font-bold text-[#54b3d6] font-mono" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    50K+
                  </div>
                  <div className="text-sm text-white/60">Data Points</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#54b3d6] font-mono" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    12+
                  </div>
                  <div className="text-sm text-white/60">Visualizations</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#54b3d6] font-mono" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    Real-time
                  </div>
                  <div className="text-sm text-white/60">Updates</div>
                </div>
              </div>
              <span className="text-[#54b3d6] text-sm font-medium">
                Explore Dashboard →
              </span>
            </div>
          </Link>
        </div>

        {/* Data Engineer vs Data Analyst */}
        <div className="max-w-5xl mx-auto mb-20">
          <h2 className="text-2xl font-bold text-white mb-8">Data Engineer vs Data Analyst</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="card-base p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Data Engineer</h3>
              <ul className="space-y-2 text-sm text-white/60">
                <li>• Builds data pipelines and infrastructure</li>
                <li>• Focuses on data architecture and ETL</li>
                <li>• Works with databases and warehouses</li>
                <li>• Ensures data quality and availability</li>
                <li>• Technologies: Python, SQL, Airflow, dbt</li>
              </ul>
              <Link
                href="/services/data-engineer"
                className="text-[#54b3d6] hover:text-[#54b3d6]/80 text-sm font-medium inline-block mt-4"
              >
                Learn More →
              </Link>
            </div>

            <div className="card-base p-6 border-[#54b3d6]/30">
              <h3 className="text-lg font-semibold text-white mb-4">Data Analyst (You are here)</h3>
              <ul className="space-y-2 text-sm text-white/60">
                <li>• Analyzes data for business insights</li>
                <li>• Creates dashboards and reports</li>
                <li>• Performs statistical analysis</li>
                <li>• Communicates findings to stakeholders</li>
                <li>• Technologies: Power BI, SQL, Python, R</li>
              </ul>
            </div>
          </div>
          <p className="text-white/60 text-sm mt-6 text-center">
            I offer both services. Need help deciding? <Link href="/contact" className="text-[#54b3d6] hover:text-[#54b3d6]/80">Let's chat</Link>.
          </p>
        </div>

        {/* CTA Section */}
        <div className="max-w-3xl mx-auto text-center">
          <div className="card-base p-10">
            <div className="absolute inset-0 bg-gradient-to-br from-[#54b3d6]/10 to-transparent opacity-60 rounded-lg" />
            <div className="relative">
              <h2 className="text-2xl font-bold text-white mb-4">Ready to Unlock Your Data?</h2>
              <p className="text-white/70 mb-8 leading-relaxed">
                Let's discuss your analytics needs. Whether you need dashboards, reports,
                or deep statistical analysis, I can help turn your data into insights.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/contact"
                  className="btn-primary"
                >
                  Get in Touch
                </Link>
                <Link
                  href="/resumes/data-analyst"
                  className="btn-secondary"
                >
                  View Resume
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
