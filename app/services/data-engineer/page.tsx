import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Data Engineer Services',
  description: 'Hire Dillon Shearer for data engineering services: ETL pipelines, data warehousing, Snowflake/dbt development, and healthcare data systems. Based in Georgia.',
}

export default function DataEngineerPage() {
  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-20">
        {/* Hero Section */}
        <div className="max-w-4xl mx-auto text-center mb-20">
          <h1 className="section-title">Data Engineering Services</h1>
          <p className="section-subtitle">
            Building production-grade data pipelines, ETL systems, and data warehouses
            that power healthcare analytics and business intelligence.
          </p>
        </div>

        {/* Services Overview */}
        <div className="max-w-5xl mx-auto mb-20">
          <h2 className="text-2xl font-bold text-white mb-8">What I Offer</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="card-base card-hover p-6">
              <div className="absolute inset-0 bg-gradient-to-br from-[#54b3d6]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" />
              <div className="relative">
                <h3 className="text-xl font-semibold text-white mb-3">ETL Pipeline Development</h3>
                <p className="text-white/60 text-sm leading-relaxed">
                  Design and implement robust ETL pipelines using Python, SQL, and modern
                  orchestration tools. Experience with batch and streaming data workflows.
                </p>
              </div>
            </div>

            <div className="card-base card-hover p-6">
              <div className="absolute inset-0 bg-gradient-to-br from-[#54b3d6]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" />
              <div className="relative">
                <h3 className="text-xl font-semibold text-white mb-3">Data Warehousing</h3>
                <p className="text-white/60 text-sm leading-relaxed">
                  Build scalable data warehouses using Snowflake, PostgreSQL, and dimensional
                  modeling. Optimize for query performance and cost efficiency.
                </p>
              </div>
            </div>

            <div className="card-base card-hover p-6">
              <div className="absolute inset-0 bg-gradient-to-br from-[#54b3d6]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" />
              <div className="relative">
                <h3 className="text-xl font-semibold text-white mb-3">dbt Development</h3>
                <p className="text-white/60 text-sm leading-relaxed">
                  Transform raw data into analytics-ready datasets using dbt. Build tested,
                  documented, and version-controlled data transformations.
                </p>
              </div>
            </div>

            <div className="card-base card-hover p-6">
              <div className="absolute inset-0 bg-gradient-to-br from-[#54b3d6]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" />
              <div className="relative">
                <h3 className="text-xl font-semibold text-white mb-3">Data Quality & Governance</h3>
                <p className="text-white/60 text-sm leading-relaxed">
                  Implement data validation, monitoring, and governance frameworks. Ensure
                  data accuracy, completeness, and compliance with regulations.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Technologies */}
        <div className="max-w-5xl mx-auto mb-20">
          <h2 className="text-2xl font-bold text-white mb-8">Technologies & Tools</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              'Python',
              'SQL',
              'Snowflake',
              'dbt',
              'PostgreSQL',
              'Pandas',
              'Apache Airflow',
              'Git',
              'Docker',
              'AWS',
              'REST APIs',
              'FastAPI',
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

        {/* Healthcare Specialization */}
        <div className="max-w-5xl mx-auto mb-20">
          <div className="card-base p-8">
            <div className="absolute inset-0 bg-gradient-to-br from-[#54b3d6]/5 to-transparent opacity-60 rounded-lg" />
            <div className="relative">
              <h2 className="text-2xl font-bold text-white mb-4">Healthcare Data Engineering</h2>
              <p className="text-white/70 mb-6 leading-relaxed">
                Specialized experience working with healthcare and clinical data systems at Answer ALS,
                a rare disease research organization. Deep understanding of healthcare data standards
                and compliance requirements.
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-white/90 mb-2">Standards & Formats</h3>
                  <ul className="space-y-1 text-sm text-white/60">
                    <li>• HL7 FHIR (Fast Healthcare Interoperability Resources)</li>
                    <li>• OMOP Common Data Model</li>
                    <li>• SNOMED CT terminology</li>
                    <li>• LOINC codes</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white/90 mb-2">Compliance</h3>
                  <ul className="space-y-1 text-sm text-white/60">
                    <li>• HIPAA compliance awareness</li>
                    <li>• Data privacy and security</li>
                    <li>• PHI handling best practices</li>
                    <li>• Audit logging and monitoring</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Featured Projects */}
        <div className="max-w-5xl mx-auto mb-20">
          <h2 className="text-2xl font-bold text-white mb-8">Featured Projects</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Link href="/demos/gym-dashboard" className="card-base card-hover p-6 group">
              <div className="absolute inset-0 bg-gradient-to-br from-[#54b3d6]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" />
              <div className="relative">
                <h3 className="text-xl font-semibold text-white mb-3">Gym Analytics Dashboard</h3>
                <p className="text-white/60 text-sm leading-relaxed mb-4">
                  Full-stack workout analytics platform with PostgreSQL backend, ETL pipelines
                  for lift data, and AI-powered chat analytics using Claude API.
                </p>
                <span className="text-[#54b3d6] text-sm font-medium">
                  View Demo →
                </span>
              </div>
            </Link>

            <Link href="/demos/data-access-portal" className="card-base card-hover p-6 group">
              <div className="absolute inset-0 bg-gradient-to-br from-[#54b3d6]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" />
              <div className="relative">
                <h3 className="text-xl font-semibold text-white mb-3">Data Access Portal</h3>
                <p className="text-white/60 text-sm leading-relaxed mb-4">
                  Enterprise data request system with API-key based access control, automated
                  CSV/ZIP exports, and email notification workflows.
                </p>
                <span className="text-[#54b3d6] text-sm font-medium">
                  View Demo →
                </span>
              </div>
            </Link>
          </div>
        </div>

        {/* CTA Section */}
        <div className="max-w-3xl mx-auto text-center">
          <div className="card-base p-10">
            <div className="absolute inset-0 bg-gradient-to-br from-[#54b3d6]/10 to-transparent opacity-60 rounded-lg" />
            <div className="relative">
              <h2 className="text-2xl font-bold text-white mb-4">Ready to Build Data Systems?</h2>
              <p className="text-white/70 mb-8 leading-relaxed">
                Let's discuss your data engineering needs. Whether you need ETL pipelines,
                data warehouse design, or healthcare data solutions, I can help.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/contact"
                  className="btn-primary"
                >
                  Get in Touch
                </Link>
                <Link
                  href="/resumes/data-engineer"
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
