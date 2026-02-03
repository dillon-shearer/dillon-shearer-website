import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Healthcare Data Services | Dillon Shearer',
  description: 'Specialized healthcare data solutions by Dillon Shearer: clinical data engineering, HL7 FHIR, OMOP, SNOMED, LOINC, and rare disease research data systems.',
}

export default function HealthcareDataPage() {
  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-20">
        {/* Hero Section */}
        <div className="max-w-4xl mx-auto text-center mb-20">
          <h1 className="section-title">Healthcare Data Solutions</h1>
          <p className="section-subtitle">
            Building secure, compliant data systems for healthcare organizations
            with expertise in clinical data standards and rare disease research.
          </p>
        </div>

        {/* Healthcare Experience */}
        <div className="max-w-5xl mx-auto mb-20">
          <div className="card-base p-8">
            <div className="absolute inset-0 bg-gradient-to-br from-[#54b3d6]/5 to-transparent opacity-60 rounded-lg" />
            <div className="relative">
              <h2 className="text-2xl font-bold text-white mb-4">Answer ALS Experience</h2>
              <p className="text-white/70 mb-6 leading-relaxed">
                Currently serving as Data Engineer at Answer ALS, a pioneering rare disease research
                organization. Building data infrastructure and analytics systems that support
                groundbreaking ALS research and clinical trials.
              </p>
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <div className="text-sm font-semibold text-white/90 mb-2">Research Focus</div>
                  <p className="text-sm text-white/60">
                    Multi-omic data integration for neurodegenerative disease research
                  </p>
                </div>
                <div>
                  <div className="text-sm font-semibold text-white/90 mb-2">Data Systems</div>
                  <p className="text-sm text-white/60">
                    Clinical trial data pipelines and patient data management
                  </p>
                </div>
                <div>
                  <div className="text-sm font-semibold text-white/90 mb-2">Collaboration</div>
                  <p className="text-sm text-white/60">
                    Working with clinicians, researchers, and data scientists
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Healthcare Standards Expertise */}
        <div className="max-w-5xl mx-auto mb-20">
          <h2 className="text-2xl font-bold text-white mb-8">Healthcare Data Standards</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="card-base card-hover p-6">
              <div className="absolute inset-0 bg-gradient-to-br from-[#54b3d6]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" />
              <div className="relative">
                <h3 className="text-xl font-semibold text-white mb-3">HL7 FHIR</h3>
                <p className="text-white/60 text-sm leading-relaxed">
                  Fast Healthcare Interoperability Resources - modern standard for exchanging
                  healthcare information electronically. Experience with FHIR resources, APIs,
                  and data mapping.
                </p>
              </div>
            </div>

            <div className="card-base card-hover p-6">
              <div className="absolute inset-0 bg-gradient-to-br from-[#54b3d6]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" />
              <div className="relative">
                <h3 className="text-xl font-semibold text-white mb-3">OMOP Common Data Model</h3>
                <p className="text-white/60 text-sm leading-relaxed">
                  Observational Medical Outcomes Partnership standardized data model for
                  observational healthcare data. Transform source data into OMOP format.
                </p>
              </div>
            </div>

            <div className="card-base card-hover p-6">
              <div className="absolute inset-0 bg-gradient-to-br from-[#54b3d6]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" />
              <div className="relative">
                <h3 className="text-xl font-semibold text-white mb-3">SNOMED CT</h3>
                <p className="text-white/60 text-sm leading-relaxed">
                  Systematized Nomenclature of Medicine - comprehensive clinical terminology.
                  Experience mapping clinical concepts and implementing SNOMED hierarchies.
                </p>
              </div>
            </div>

            <div className="card-base card-hover p-6">
              <div className="absolute inset-0 bg-gradient-to-br from-[#54b3d6]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" />
              <div className="relative">
                <h3 className="text-xl font-semibold text-white mb-3">LOINC</h3>
                <p className="text-white/60 text-sm leading-relaxed">
                  Logical Observation Identifiers Names and Codes - universal standard for
                  identifying lab tests and clinical observations.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Services */}
        <div className="max-w-5xl mx-auto mb-20">
          <h2 className="text-2xl font-bold text-white mb-8">Healthcare Data Services</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="card-base p-6">
              <h3 className="text-lg font-semibold text-white mb-3">Clinical Data Pipelines</h3>
              <p className="text-white/60 text-sm leading-relaxed">
                Design and build ETL pipelines for clinical data from EHRs, labs, imaging systems,
                and wearables. Ensure data quality and completeness throughout the pipeline.
              </p>
            </div>

            <div className="card-base p-6">
              <h3 className="text-lg font-semibold text-white mb-3">Data Governance</h3>
              <p className="text-white/60 text-sm leading-relaxed">
                Implement data governance frameworks for healthcare organizations. Data cataloging,
                lineage tracking, and access controls.
              </p>
            </div>

            <div className="card-base p-6">
              <h3 className="text-lg font-semibold text-white mb-3">Compliance & Security</h3>
              <p className="text-white/60 text-sm leading-relaxed">
                Build systems with HIPAA compliance in mind. PHI handling, encryption at rest
                and in transit, audit logging, and access controls.
              </p>
            </div>

            <div className="card-base p-6">
              <h3 className="text-lg font-semibold text-white mb-3">Healthcare Analytics</h3>
              <p className="text-white/60 text-sm leading-relaxed">
                Create analytics solutions for clinical outcomes, patient populations, and
                quality metrics. Dashboard development for healthcare stakeholders.
              </p>
            </div>
          </div>
        </div>

        {/* Featured Project */}
        <div className="max-w-5xl mx-auto mb-20">
          <h2 className="text-2xl font-bold text-white mb-8">Featured Healthcare Project</h2>
          <Link href="/demos/data-access-portal" className="card-base card-hover p-8 group block">
            <div className="absolute inset-0 bg-gradient-to-br from-[#54b3d6]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" />
            <div className="relative">
              <h3 className="text-2xl font-semibold text-white mb-4">Data Access Portal</h3>
              <p className="text-white/60 leading-relaxed mb-6">
                Enterprise-grade data request system for healthcare research. Implements secure
                data access workflows with API-key authentication, automated exports, email
                notifications, and comprehensive audit logging.
              </p>
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                <div>
                  <div className="text-sm font-semibold text-white/90 mb-1">Access Control</div>
                  <div className="text-sm text-white/60">API-key based security</div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-white/90 mb-1">Data Export</div>
                  <div className="text-sm text-white/60">CSV/ZIP automation</div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-white/90 mb-1">Compliance</div>
                  <div className="text-sm text-white/60">Full audit trail</div>
                </div>
              </div>
              <span className="text-[#54b3d6] text-sm font-medium">
                View Project →
              </span>
            </div>
          </Link>
        </div>

        {/* Trust & Ethics */}
        <div className="max-w-5xl mx-auto mb-20">
          <div className="card-base p-8">
            <div className="absolute inset-0 bg-gradient-to-br from-[#54b3d6]/5 to-transparent opacity-60 rounded-lg" />
            <div className="relative">
              <h2 className="text-2xl font-bold text-white mb-4">Patient-Centered Approach</h2>
              <p className="text-white/70 mb-6 leading-relaxed">
                Healthcare data is deeply personal and deserves the highest level of care and respect.
                My approach prioritizes patient privacy, data security, and ethical use of health
                information in every project.
              </p>
              <div className="grid md:grid-cols-3 gap-6 text-sm">
                <div>
                  <h3 className="font-semibold text-white mb-2">Privacy First</h3>
                  <p className="text-white/60">
                    Design systems with privacy by default, minimize data collection, and
                    implement strong access controls.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-2">Transparent Practices</h3>
                  <p className="text-white/60">
                    Clear documentation, audit trails, and data lineage to ensure
                    accountability and trust.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-2">Ethical Standards</h3>
                  <p className="text-white/60">
                    Committed to using data for good - improving patient outcomes and
                    advancing medical research.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="max-w-3xl mx-auto text-center">
          <div className="card-base p-10">
            <div className="absolute inset-0 bg-gradient-to-br from-[#54b3d6]/10 to-transparent opacity-60 rounded-lg" />
            <div className="relative">
              <h2 className="text-2xl font-bold text-white mb-4">Healthcare Data Project?</h2>
              <p className="text-white/70 mb-8 leading-relaxed">
                Whether you need clinical data pipelines, FHIR implementation, or healthcare
                analytics, I bring both technical expertise and healthcare domain knowledge.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/contact"
                  className="btn-primary"
                >
                  Discuss Your Project
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
