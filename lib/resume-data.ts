// =============================================================================
// Master Resume Data System v2.0
// =============================================================================
// Single source of truth for all resume content. Each variant is explicitly
// curated - no fallback logic. Edit bullet IDs in variantContent to control
// what appears on each resume.
// =============================================================================

export type ResumeVariant = 'data-engineer' | 'data-analyst' | 'python-developer'

export const ALL_VARIANTS: ResumeVariant[] = ['data-engineer', 'data-analyst', 'python-developer']

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ContactInfo {
  name: string
  email: string
  linkedin: string
  github: string
  website: string
  location: string
}

export interface ImpactMetric {
  value: string
  label: string
}

export interface VariantContent {
  slug: ResumeVariant
  displayName: string
  shortDescription: string
  headline: string
  summary: string
  accentColor: string
  isPrimary: boolean
  focusAreas: string[]
  impactMetrics: ImpactMetric[]
  skillsSpotlight: string[]
  signatureProjectIds: string[]
  // Explicit bullet selection per job (company -> bullet IDs)
  experienceBullets: Record<string, string[]>
}

export interface ExperienceBullet {
  id: string
  text: string
}

export interface Experience {
  id: string
  company: string
  role: string
  roleVariants?: Partial<Record<ResumeVariant, string>>
  location: string
  startDate: string
  endDate: string
  bullets: ExperienceBullet[]
}

export interface Education {
  school: string
  degree: string
  field: string
  year: string
}

export interface Certification {
  name: string
  issuer: string
  date: string
  credentialId?: string
}

export interface Project {
  id: string
  name: string
  description: string
  tech: string[]
  url?: string
}

// ---------------------------------------------------------------------------
// Contact Info
// ---------------------------------------------------------------------------

export const contactInfo: ContactInfo = {
  name: 'Dillon Shearer',
  email: 'dillshearer@outlook.com',
  linkedin: 'linkedin.com/in/dillonshearer',
  github: 'github.com/dillon-shearer',
  website: 'datawithdillon.com',
  location: 'Newnan, Georgia',
}

// ---------------------------------------------------------------------------
// Variant Content (Per-Variant Curated Blocks)
// ---------------------------------------------------------------------------

export const variantContent: VariantContent[] = [
  // =========================================================================
  // DATA ENGINEER
  // =========================================================================
  {
    slug: 'data-engineer',
    displayName: 'Data Engineer',
    shortDescription: 'Pipelines, infrastructure, and data reliability',
    headline: 'Data Engineer',
    summary:
      'Data engineer with 4+ years building production pipelines, standardizing multi-source datasets, and automating data operations in regulated healthcare environments. Architected ETL workflows processing millions of clinical and genomic records, built automation that saves 15+ hours weekly, and maintain data infrastructure serving 470+ researchers. Strong foundation in Python, SQL, and Azure cloud services with hands-on OMOP CDM and healthcare terminology mapping.',
    accentColor: '#54b3d6',
    isPrimary: true,
    focusAreas: [
      'Pipeline Development & Orchestration',
      'Data Modeling & Standardization',
      'Cloud Infrastructure & Automation',
    ],
    impactMetrics: [
      { value: '15+ hrs/week', label: 'Automation Savings' },
      { value: '9 Sources', label: 'Systems Integrated' },
      { value: '1,200+', label: 'Participant Records' },
      { value: '50M+', label: 'Records Processed' },
    ],
    skillsSpotlight: [
      'Python',
      'SQL',
      'Azure',
      'PostgreSQL',
      'ETL/ELT',
      'OMOP CDM',
      'Snowflake',
      'Data Modeling',
    ],
    signatureProjectIds: ['variant-reporting', 'dua-tracking'],
    experienceBullets: {
      'answer-als': ['aals-de-1', 'aals-de-2', 'aals-de-3', 'aals-de-4', 'aals-de-5', 'aals-de-6'],
      'equity-quotient': ['eq-de-1', 'eq-de-2', 'eq-de-3'],
      'rare-x': ['rx-de-1', 'rx-de-2'],
      'across-healthcare': ['ah-de-1', 'ah-de-2'],
    },
  },

  // =========================================================================
  // DATA ANALYST
  // =========================================================================
  {
    slug: 'data-analyst',
    displayName: 'Data Analyst',
    shortDescription: 'Insights, dashboards, and decision enablement',
    headline: 'Data Analyst',
    summary:
      'Data analyst with 4+ years translating complex healthcare datasets into actionable insights for researchers and executives. Built dashboards and reporting systems used by 470+ stakeholders, validated clinical data across 9 source systems, and delivered analyses that shaped research priorities and operational decisions. Skilled in SQL, Python, and modern BI tools with deep experience in data quality, metric definition, and clear communication of findings.',
    accentColor: '#a78bfa',
    isPrimary: false,
    focusAreas: [
      'Dashboard Development & BI',
      'Data Quality & Validation',
      'Stakeholder Reporting & Insights',
    ],
    impactMetrics: [
      { value: '470+', label: 'Researchers Served' },
      { value: '7', label: 'Dashboards Delivered' },
      { value: '35%', label: 'Query Time Reduced' },
      { value: '15M+', label: 'Rows Analyzed' },
    ],
    skillsSpotlight: [
      'SQL',
      'Python',
      'Tableau',
      'Power BI',
      'Pandas',
      'Looker',
      'Excel',
      'Data Validation',
    ],
    signatureProjectIds: ['dua-tracking', 'gym-dashboard'],
    experienceBullets: {
      'answer-als': ['aals-da-1', 'aals-da-2', 'aals-da-3', 'aals-da-4', 'aals-da-5'],
      'equity-quotient': ['eq-da-1', 'eq-da-2', 'eq-da-3', 'eq-da-4'],
      'rare-x': ['rx-da-1', 'rx-da-2'],
      'across-healthcare': ['ah-da-1', 'ah-da-2'],
    },
  },

  // =========================================================================
  // PYTHON DEVELOPER
  // =========================================================================
  {
    slug: 'python-developer',
    displayName: 'Full-Stack Python Developer',
    shortDescription: 'Applications, automation, and tooling',
    headline: 'Full-Stack Python Developer',
    summary:
      'Full-stack Python developer with 4+ years shipping data-driven web applications, automation tools, and internal platforms for research operations. Built applications serving 470+ users, created automation saving 15+ hours weekly, and deployed production systems handling genomic data at scale. Python and SQL core paired with React/Next.js frontends, Azure cloud services, and conversational AI integrations.',
    accentColor: '#34d399',
    isPrimary: false,
    focusAreas: [
      'Web Application Development',
      'Automation & Tooling',
      'API Design & Integration',
    ],
    impactMetrics: [
      { value: '470+', label: 'Users Served' },
      { value: '15+ hrs/week', label: 'Manual Work Eliminated' },
      { value: '300+', label: 'Chatbot Conversations' },
      { value: '5+', label: 'Production Apps Shipped' },
    ],
    skillsSpotlight: [
      'Python',
      'FastAPI',
      'Flask',
      'React',
      'Next.js',
      'PostgreSQL',
      'Panel',
      'Bokeh',
    ],
    signatureProjectIds: ['data-access-portal', 'variant-reporting'],
    experienceBullets: {
      'answer-als': ['aals-py-1', 'aals-py-2', 'aals-py-3', 'aals-py-5'],
      'equity-quotient': ['eq-py-1', 'eq-py-2'],
      'rare-x': ['rx-py-1', 'rx-py-2'],
      'across-healthcare': ['ah-py-1', 'ah-py-2', 'ah-py-3'],
    },
  },
]

// ---------------------------------------------------------------------------
// Experience (Master Bullet Pool)
// ---------------------------------------------------------------------------

export const experiences: Experience[] = [
  {
    id: 'answer-als',
    company: 'Answer ALS',
    role: 'Data Scientist',
    location: 'Remote',
    startDate: 'Feb 2022',
    endDate: 'Present',
    bullets: [
      // --- Data Engineer Bullets ---
      {
        id: 'aals-de-1',
        text: 'Architected and maintain ETL pipelines processing 1,200+ participant records from 9 disparate clinical sources, unifying data into a standardized master index that powers the research data portal.',
      },
      {
        id: 'aals-de-2',
        text: 'Built automated user management pipeline running 3x weekly, eliminating 15+ hours of manual processing through Python scripts handling agreement tracking, renewal monitoring, and committee reporting.',
      },
      {
        id: 'aals-de-3',
        text: 'Engineered OMOP Common Data Model transformations mapping raw clinical data to SNOMED CT, LOINC, and RxNorm terminologies, enabling cross-institutional research compatibility.',
      },
      {
        id: 'aals-de-4',
        text: 'Designed and implemented Azure data infrastructure including blob storage organization, automated file inventory systems, and cross-source validation pipelines for clinical data releases.',
      },
      {
        id: 'aals-de-5',
        text: 'Created Looker semantic layer with intermediate tables standardizing external dataset curation, reducing analyst onboarding time and ensuring consistent metric definitions.',
      },
      {
        id: 'aals-de-6',
        text: 'Own the data dictionary across 9 source systems, validating schema changes per release cycle and maintaining documentation that serves as the source of truth for 470+ researchers.',
      },

      // --- Data Analyst Bullets ---
      {
        id: 'aals-da-1',
        text: 'Built real-time DUA tracking dashboard providing visibility into 470+ researcher agreements, surfacing renewal deadlines and approval status that reduced compliance gaps by 40%.',
      },
      {
        id: 'aals-da-2',
        text: 'Deliver monthly board-level metrics on data access trends, request volumes, and platform utilization, directly informing resource allocation and strategic priorities.',
      },
      {
        id: 'aals-da-3',
        text: 'Validate clinical data integrity across each release cycle, identifying and coordinating corrections for discrepancies before research distribution.',
      },
      {
        id: 'aals-da-4',
        text: 'Curate master participant index from 9 sources, maintaining the single filterable document that enables researchers to identify cohorts across 1,200+ participants.',
      },
      {
        id: 'aals-da-5',
        text: 'Standardized external dataset specifications through Looker intermediate tables, enabling consistent joins and reducing ad-hoc data prep time by 60%.',
      },

      // --- Python Developer Bullets ---
      {
        id: 'aals-py-1',
        text: 'Built and deployed Variant Reporting web application (Panel/Bokeh) serving genomic researchers, replacing manual workflows with on-demand report generation across 50K+ variants and millions of genome calls.',
      },
      {
        id: 'aals-py-2',
        text: 'Developed "Lou," a conversational AI agent handling 300+ researcher interactions monthly, including onboarding guidance, data access support, and FAQ resolution via Botpress with Microsoft Bot Service migration underway.',
      },
      {
        id: 'aals-py-3',
        text: 'Shipped full-stack internal tools with Python backends and React/Next.js frontends: data access portal (470+ users), analytics dashboard, and automated reporting utilities.',
      },
      {
        id: 'aals-py-4',
        text: 'Created DUA tracking automation (Python, Pandas, Azure Blob) managing 470+ user agreements with auto-generated committee reports, renewal alerts, and audit trails - saving 15+ hours weekly.',
      },
      {
        id: 'aals-py-5',
        text: 'Lead technical requirements for platform features, writing specifications, defining acceptance criteria, and validating implementations against research team needs.',
      },
    ],
  },
  {
    id: 'equity-quotient',
    company: 'Equity Quotient',
    role: 'Data Analyst',
    location: 'Remote',
    startDate: 'Sep 2022',
    endDate: 'Apr 2023',
    bullets: [
      // --- Data Engineer Bullets ---
      {
        id: 'eq-de-1',
        text: 'Designed and built Snowflake data models ingesting 12 datasets with 150+ standardized fields, powering 7 client dashboards and 30 KPI widgets with sub-second query performance.',
      },
      {
        id: 'eq-de-2',
        text: 'Engineered ETL pipelines processing 15M+ rows of U.S. Census and HMDA data, creating tract-to-county crosswalks and pre-aggregated tables that reduced dashboard load times by 35%.',
      },
      {
        id: 'eq-de-3',
        text: 'Built SQL views and staging tables with documented transformation logic, establishing patterns adopted by data engineering for production workflows.',
      },

      // --- Data Analyst Bullets ---
      {
        id: 'eq-da-1',
        text: 'Sourced, cleaned, and modeled 12 datasets to power client reporting, delivering 7 dashboards and 30 KPI widgets tracking demographic and economic equity metrics.',
      },
      {
        id: 'eq-da-2',
        text: 'Delivered ad-hoc analyses slicing data by geography, race, income, and industry, providing narrative insights that shaped client strategy and public messaging.',
      },
      {
        id: 'eq-da-3',
        text: 'Partnered with product team to validate widget logic changes, documenting baseline-vs-updated comparisons and quantifying impact on client-facing metrics.',
      },
      {
        id: 'eq-da-4',
        text: 'Investigated intersections across healthcare, demographic, and economic datasets, surfacing actionable insights that informed stakeholder decision-making.',
      },

      // --- Python Developer Bullets ---
      {
        id: 'eq-py-1',
        text: 'Built Python data pipelines transforming 15M+ rows of Census and HMDA data into widget-ready aggregates, automating previously manual data prep workflows.',
      },
      {
        id: 'eq-py-2',
        text: 'Developed reusable Python utilities for data validation and transformation, reducing analyst time spent on data quality checks by 50%.',
      },
    ],
  },
  {
    id: 'rare-x',
    company: 'RARE-X',
    role: 'Data Standards Intern',
    location: 'Remote',
    startDate: 'Jun 2021',
    endDate: 'Feb 2022',
    bullets: [
      // --- Data Engineer Bullets ---
      {
        id: 'rx-de-1',
        text: 'Mapped internal data structures to standardized health terminologies, ensuring interoperability across rare disease datasets and external research platforms.',
      },
      {
        id: 'rx-de-2',
        text: 'Built JSON schemas for the Data Collection Platform defining field types, validation rules, and entity relationships that enforced data quality at ingestion.',
      },

      // --- Data Analyst Bullets ---
      {
        id: 'rx-da-1',
        text: 'Aligned internal data structures with external health data standards, enabling cross-dataset analysis and accelerating researcher time-to-insight.',
      },
      {
        id: 'rx-da-2',
        text: 'Developed e-Consent documentation meeting legal and regulatory standards, supporting compliant patient data collection across multiple rare disease studies.',
      },

      // --- Python Developer Bullets ---
      {
        id: 'rx-py-1',
        text: 'Transformed data dictionaries into JSON schemas with programmatic validation rules, reducing manual data quality checks and standardizing platform ingestion.',
      },
      {
        id: 'rx-py-2',
        text: 'Built tooling to generate e-Consent documents meeting regulatory requirements, automating document creation for patient-facing data collection workflows.',
      },
    ],
  },
  {
    id: 'across-healthcare',
    company: 'Across Healthcare',
    role: 'Software Quality Assurance Intern',
    roleVariants: {
      'python-developer': 'Software Developer Intern',
    },
    location: 'Atlanta, GA',
    startDate: 'May 2021',
    endDate: 'Feb 2022',
    bullets: [
      // --- Data Engineer Bullets ---
      {
        id: 'ah-de-1',
        text: 'Integrated survey response data into normalized database structures, handling schema mapping and data migration for clinical data collection workflows.',
      },
      {
        id: 'ah-de-2',
        text: 'Created and maintained data dictionaries ensuring compliance with healthcare data standards (HIPAA, HL7) across the platform.',
      },

      // --- Data Analyst Bullets ---
      {
        id: 'ah-da-1',
        text: 'Maintained data dictionaries ensuring platform compliance with healthcare data standards, serving as reference documentation for clinical data workflows.',
      },
      {
        id: 'ah-da-2',
        text: 'Validated survey data collection processes, identifying gaps in data quality and recommending improvements adopted by the development team.',
      },

      // --- Python Developer Bullets ---
      {
        id: 'ah-py-1',
        text: 'Built reusable survey components for clinical data collection, contributing to an internal library used across multiple healthcare applications.',
      },
      {
        id: 'ah-py-2',
        text: 'Developed Selenium test automation framework reducing manual QA effort by 70% and improving release confidence through consistent regression coverage.',
      },
      {
        id: 'ah-py-3',
        text: 'Integrated survey response data into backend systems, writing migration scripts and validation logic for clinical data workflows.',
      },
    ],
  },
]

// ---------------------------------------------------------------------------
// Education
// ---------------------------------------------------------------------------

export const education: Education[] = [
  {
    school: 'University of West Georgia',
    degree: 'Bachelor of Business Administration',
    field: 'Management Information Systems',
    year: '2022',
  },
]

// ---------------------------------------------------------------------------
// Certifications
// ---------------------------------------------------------------------------

export const certifications: Certification[] = [
  {
    name: 'Protecting Human Research Participants',
    issuer: 'PHRP Online Training, Inc.',
    date: 'Apr 2025',
    credentialId: '3004648',
  },
]

// ---------------------------------------------------------------------------
// Projects (Master Pool)
// ---------------------------------------------------------------------------

export const projects: Project[] = [
  {
    id: 'variant-reporting',
    name: 'Variant Reporting Application',
    description:
      'Production genomic variant reporting tool serving ALS researchers. Built with Panel (Bokeh) and backed by Azure SQL pipelines with BCP bulk loading. Processes 50K+ variants across 939 participants with millions of genome calls, replacing manual workflows with on-demand report generation.',
    tech: ['Python', 'Panel/Bokeh', 'Azure SQL', 'BCP', 'Pandas'],
  },
  {
    id: 'dua-tracking',
    name: 'DUA Tracking System',
    description:
      'Automation platform managing 470+ data use agreements for research compliance. Handles user lifecycle tracking, generates committee reports, monitors renewal deadlines, and maintains audit trails. Saves 15+ hours weekly of manual administrative work.',
    tech: ['Python', 'Pandas', 'Azure Blob Storage', 'XlsxWriter'],
  },
  {
    id: 'data-access-portal',
    name: 'Data Access Portal',
    description:
      'Full-stack application managing research data access requests with role-based workflows, automated email notifications, and comprehensive audit logging. Serves 470+ researchers with self-service request tracking and admin dashboards.',
    tech: ['Next.js', 'TypeScript', 'PostgreSQL', 'Tailwind CSS', 'Resend'],
    url: '/demos/data-access-portal',
  },
  {
    id: 'gym-dashboard',
    name: 'Fitness Analytics Dashboard',
    description:
      'Interactive fitness tracking application with data entry, trend visualization, and AI-powered workout insights. Features real-time charting, progress analytics, and conversational interface for exploring training data.',
    tech: ['React', 'Next.js', 'PostgreSQL', 'Recharts', 'OpenAI API'],
    url: '/demos/gym-dashboard',
  },
  {
    id: 'saipe-analysis',
    name: 'SAIPE Poverty Analysis',
    description:
      'Comprehensive analysis of Small Area Income and Poverty Estimates across U.S. counties. Identified regional patterns in poverty rates and median income, with visualizations informing policy discussions.',
    tech: ['Python', 'Pandas', 'Matplotlib', 'Seaborn'],
  },
  {
    id: 'drug-utilization',
    name: 'Drug Utilization Analysis',
    description:
      'State-by-state analysis of chronic condition drug utilization patterns and costs. Delivered insights on prescription trends with policy implications for healthcare resource allocation.',
    tech: ['Python', 'Pandas', 'SQLite', 'Matplotlib', 'Seaborn'],
  },
]

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

export function getVariantContent(slug: ResumeVariant): VariantContent | undefined {
  return variantContent.find((v) => v.slug === slug)
}

export function getVariantMeta(slug: ResumeVariant): VariantContent | undefined {
  return getVariantContent(slug)
}

export function getAllVariantMeta(): VariantContent[] {
  return variantContent
}

export function getResumeData(variant: ResumeVariant) {
  const content = getVariantContent(variant)
  if (!content) return null

  // Build experiences with only the selected bullets for this variant
  const filteredExperiences = experiences
    .map((exp) => {
      const selectedBulletIds = content.experienceBullets[exp.id] || []
      const selectedBullets = selectedBulletIds
        .map((id) => exp.bullets.find((b) => b.id === id))
        .filter((b): b is ExperienceBullet => b !== undefined)

      if (selectedBullets.length === 0) return null

      // Use variant-specific role if defined
      const role = exp.roleVariants?.[variant] || exp.role

      return {
        ...exp,
        role,
        bullets: selectedBullets,
      }
    })
    .filter((exp): exp is NonNullable<typeof exp> => exp !== null)

  // Get signature projects
  const signatureProjects = content.signatureProjectIds
    .map((id) => projects.find((p) => p.id === id))
    .filter((p): p is Project => p !== undefined)

  return {
    contact: contactInfo,
    meta: content,
    experiences: filteredExperiences,
    education,
    certifications,
    skillsSpotlight: content.skillsSpotlight,
    focusAreas: content.focusAreas,
    impactMetrics: content.impactMetrics,
    projects: signatureProjects,
  }
}

export function isValidVariant(slug: string): slug is ResumeVariant {
  return ALL_VARIANTS.includes(slug as ResumeVariant)
}
