// =============================================================================
// Master Resume Data System
// =============================================================================
// Single source of truth for all resume content. Each resume variant pulls
// from this data, filtering by variant tags. Edit this file to update any
// resume. The individual pages derive automatically.
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

export interface VariantMeta {
  slug: ResumeVariant
  displayName: string
  shortDescription: string
  headline: string
  summary: string
  accentColor: string
  isPrimary: boolean
  previewSkills: string[]
}

export interface ExperienceBullet {
  text: string
  variants: ResumeVariant[]
}

export interface Experience {
  company: string
  role: string
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
  variants: ResumeVariant[]
}

export interface Skill {
  name: string
  category: string
  variants: ResumeVariant[]
}

export interface Project {
  name: string
  description: string
  tech: string[]
  variants: ResumeVariant[]
  url?: string
}

// ---------------------------------------------------------------------------
// Contact Info (shared across all variants)
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
// Variant Metadata
// ---------------------------------------------------------------------------

export const variantMeta: VariantMeta[] = [
  {
    slug: 'data-engineer',
    displayName: 'Data Engineer / Analytics Engineer',
    shortDescription: 'Designing and building data systems',
    headline: 'Data Engineer / Analytics Engineer',
    summary:
      'Data engineer with 3+ years of experience building and maintaining data pipelines, curating multi-source clinical datasets, and automating data workflows in healthcare research. Skilled at unifying disparate data sources into standardized, queryable formats and building the tooling that keeps data operations running. Currently managing data infrastructure for a 1,200+ participant ALS research platform.',
    accentColor: '#54b3d6',
    isPrimary: true,
    previewSkills: ['Python', 'SQL', 'Azure', 'ETL', 'PostgreSQL'],
  },
  {
    slug: 'data-analyst',
    displayName: 'Data Analyst',
    shortDescription: 'Interpreting and visualizing data',
    headline: 'Data Analyst',
    summary:
      'Data analyst with 3+ years of experience turning complex healthcare datasets into actionable insights. Proficient in SQL, Python, and modern BI tools for exploratory analysis, dashboard creation, and stakeholder reporting. Experienced curating clinical data across 9 source systems serving 470+ researchers, with a focus on data quality, validation, and clear communication of findings.',
    accentColor: '#a78bfa',
    isPrimary: false,
    previewSkills: ['SQL', 'Python', 'Tableau', 'Pandas', 'Power BI'],
  },
  {
    slug: 'python-developer',
    displayName: 'Full-Stack Python Developer',
    shortDescription: 'Building data-powered applications',
    headline: 'Full-Stack Python Developer (Data-Oriented)',
    summary:
      'Full-stack Python developer focused on building data-driven applications for research and operations teams. Experienced shipping web applications, automation tools, and conversational agents that replace manual processes and surface data through interactive interfaces. Python and SQL backbone paired with modern frontend frameworks and Azure cloud services.',
    accentColor: '#34d399',
    isPrimary: false,
    previewSkills: ['Python', 'React', 'Next.js', 'Azure', 'TypeScript'],
  },
]

// ---------------------------------------------------------------------------
// Experience
// ---------------------------------------------------------------------------
// Tag each bullet with the variants it should appear in.
// Use ALL_VARIANTS for bullets that belong everywhere.
// ---------------------------------------------------------------------------

export const experiences: Experience[] = [
  {
    company: 'Answer ALS',
    role: 'Data Scientist',
    location: 'Remote',
    startDate: 'Feb 2022',
    endDate: 'Present',
    bullets: [
      // --- Data Engineer bullets ---
      {
        text: 'Curate and maintain a master data index from 9 disparate sources, unifying 1,274+ participant records into a single filterable document that powers the research data portal.',
        variants: ['data-engineer', 'data-analyst'],
      },
      {
        text: 'Develop and maintain ETL pipelines for clinical data drops, performing validation, transformation, and standardization across each release cycle.',
        variants: ['data-engineer'],
      },
      {
        text: 'Contribute to OMOP Common Data Model transformations, mapping raw clinical data to standardized terminologies including SNOMED CT, LOINC, and RxNorm.',
        variants: ['data-engineer', 'data-analyst'],
      },
      {
        text: 'Built a Python-based DUA tracking system that automated user management, agreement monitoring, and committee reporting, saving approximately 15 hours per week across the team.',
        variants: ['data-engineer', 'python-developer'],
      },
      {
        text: 'Manage data operations in Azure, including scripting for file inventory, batch renaming, cross-source comparisons, and storage organization.',
        variants: ['data-engineer'],
      },
      {
        text: 'Created Looker intermediate tables to standardize external dataset curation, enabling other datasets to match internal index specifications.',
        variants: ['data-engineer', 'data-analyst'],
      },
      {
        text: 'Validated and maintained the data dictionary across 9 source systems, ensuring documented specifications match delivered data.',
        variants: ['data-engineer', 'data-analyst'],
      },
      // --- Data Analyst bullets ---
      {
        text: 'Produce board-level reporting metrics on data access requests, approvals, and usage trends over time for leadership presentations.',
        variants: ['data-analyst'],
      },
      {
        text: 'Built a DUA tracking dashboard that gives the team real-time visibility into 470+ user agreements, sign dates, renewal deadlines, and committee review status.',
        variants: ['data-analyst'],
      },
      {
        text: 'Validate data integrity across clinical data drops, identifying discrepancies and coordinating corrections before research release.',
        variants: ['data-analyst'],
      },
      // --- Python Developer bullets ---
      {
        text: 'Built and deployed a Variant Reporting web application using Panel (Bokeh), replacing a static local tool. Designed Azure SQL data pipelines with BCP loading protocols, enabling researchers to generate genomic reports on demand.',
        variants: ['python-developer'],
      },
      {
        text: 'Develop and maintain "Lou," a conversational agent (Botpress, migrating to Microsoft Bot Service) that handles researcher interactions, including training data creation, behavior testing, and iterative refinement from user feedback.',
        variants: ['python-developer'],
      },
      {
        text: 'Built full-stack internal tools with Python backends and React/Next.js frontends, including a data access portal, analytics dashboard, and data cleaning utility.',
        variants: ['python-developer'],
      },
      {
        text: 'Created a DUA tracking automation in Python (Pandas, Azure Storage Blob) that manages 470+ user agreements, generates committee blurbs, and tracks renewal deadlines, saving ~15 hours/week of manual processing.',
        variants: ['python-developer'],
      },
      {
        text: 'Write and manage requirements for the technical team, testing implementations and defining acceptance criteria for platform features.',
        variants: ALL_VARIANTS,
      },
    ],
  },
  {
    company: 'Equity Quotient',
    role: 'Data Analyst',
    location: 'Remote',
    startDate: 'Sep 2022',
    endDate: 'Apr 2023',
    bullets: [
      {
        text: 'Sourced, cleaned, and modeled 12 datasets in Snowflake to power 7 dashboards and 30 KPI widgets for client reporting.',
        variants: ['data-engineer', 'data-analyst'],
      },
      {
        text: 'Built SQL views and staging tables that standardized 150 plus fields, reduced dashboard query times by about 35 percent, and documented logic for handoff to data engineering.',
        variants: ['data-engineer', 'data-analyst'],
      },
      {
        text: 'Ingested and transformed U.S. Census and HMDA data totaling about 15 million rows, creating tract and county crosswalks plus widget-ready aggregates with Python and SQL.',
        variants: ['data-engineer', 'data-analyst', 'python-developer'],
      },
      {
        text: 'Delivered ad hoc analyses for client questions, slicing by geography, race, income, and industry to support narrative insights.',
        variants: ['data-analyst'],
      },
      {
        text: 'Partnered with product to validate new widget logic, comparing baseline versus updated results and documenting impact.',
        variants: ['data-analyst'],
      },
      {
        text: 'Investigated intersections across healthcare, demographic, and income datasets to surface actionable insights for stakeholders.',
        variants: ['data-analyst'],
      },
    ],
  },
  {
    company: 'RARE-X',
    role: 'Data Standards Intern',
    location: 'Remote',
    startDate: 'Jun 2021',
    endDate: 'Feb 2022',
    bullets: [
      {
        text: 'Mapped and aligned internal data structures to standardized health data sources, ensuring interoperability across rare disease datasets.',
        variants: ['data-engineer', 'data-analyst'],
      },
      {
        text: 'Transformed data dictionaries and built JSON schemas for the Data Collection Platform, defining field types, validation rules, and relationships.',
        variants: ['data-engineer', 'python-developer'],
      },
      {
        text: 'Developed e-Consent documents to meet legal, regulatory, and functional standards for patient data collection.',
        variants: ALL_VARIANTS,
      },
    ],
  },
  {
    company: 'Across Healthcare',
    role: 'Software Quality Assurance Intern',
    location: 'In Person',
    startDate: 'May 2021',
    endDate: 'Feb 2022',
    bullets: [
      {
        text: 'Built survey code for clinical data collection, contributing reusable components to an internal survey library.',
        variants: ['python-developer'],
      },
      {
        text: 'Integrated survey response data into new database structures, handling schema mapping and data migration.',
        variants: ['data-engineer', 'python-developer'],
      },
      {
        text: 'Automated QA test workflows using Selenium, reducing manual testing effort and improving release confidence.',
        variants: ['python-developer'],
      },
      {
        text: 'Created and maintained data dictionaries to ensure compliance with healthcare data standards across the platform.',
        variants: ['data-engineer', 'data-analyst'],
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
    year: 'Aug 2018 - Jul 2022',
  },
]

// ---------------------------------------------------------------------------
// Certifications
// ---------------------------------------------------------------------------

export const certifications: Certification[] = [
  {
    name: 'Protecting Human Research Participants (PHRP)',
    issuer: 'PHRP Online Training, Inc.',
    date: 'Apr 2025',
    credentialId: '3004648',
    variants: ALL_VARIANTS,
  },
]

// ---------------------------------------------------------------------------
// Skills
// ---------------------------------------------------------------------------

export const skills: Skill[] = [
  // Programming
  { name: 'Python', category: 'Programming', variants: ALL_VARIANTS },
  { name: 'SQL', category: 'Programming', variants: ALL_VARIANTS },
  { name: 'R', category: 'Programming', variants: ['data-analyst'] },
  { name: 'TypeScript', category: 'Programming', variants: ['python-developer'] },
  { name: 'JavaScript', category: 'Programming', variants: ['python-developer'] },

  // Data Analysis & Visualization
  { name: 'Pandas', category: 'Data Analysis & Visualization', variants: ALL_VARIANTS },
  { name: 'NumPy', category: 'Data Analysis & Visualization', variants: ['data-analyst', 'data-engineer'] },
  { name: 'Matplotlib', category: 'Data Analysis & Visualization', variants: ['data-analyst', 'data-engineer'] },
  { name: 'Seaborn', category: 'Data Analysis & Visualization', variants: ['data-analyst'] },
  { name: 'Tableau', category: 'Data Analysis & Visualization', variants: ['data-analyst'] },
  { name: 'Power BI', category: 'Data Analysis & Visualization', variants: ['data-analyst'] },
  { name: 'Panel / Bokeh', category: 'Data Analysis & Visualization', variants: ['python-developer', 'data-analyst'] },
  { name: 'Recharts', category: 'Data Analysis & Visualization', variants: ['python-developer'] },

  // Machine Learning
  { name: 'Scikit-learn', category: 'Machine Learning', variants: ['data-analyst', 'data-engineer'] },
  { name: 'TensorFlow', category: 'Machine Learning', variants: ['data-analyst', 'data-engineer'] },

  // Databases
  { name: 'PostgreSQL', category: 'Databases', variants: ALL_VARIANTS },
  { name: 'Azure SQL', category: 'Databases', variants: ['data-engineer', 'python-developer'] },
  { name: 'MySQL', category: 'Databases', variants: ['data-engineer', 'data-analyst'] },
  { name: 'Snowflake', category: 'Databases', variants: ['data-engineer', 'data-analyst'] },
  { name: 'SQLite', category: 'Databases', variants: ['data-analyst', 'python-developer'] },

  // Cloud & Infrastructure
  { name: 'Azure Storage', category: 'Cloud & Infrastructure', variants: ['data-engineer', 'python-developer'] },
  { name: 'Azure Blob', category: 'Cloud & Infrastructure', variants: ['data-engineer', 'python-developer'] },
  { name: 'BCP / Bulk Loading', category: 'Cloud & Infrastructure', variants: ['data-engineer'] },
  { name: 'Looker', category: 'Cloud & Infrastructure', variants: ['data-engineer', 'data-analyst'] },
  { name: 'GitHub Actions', category: 'Cloud & Infrastructure', variants: ['data-engineer', 'python-developer'] },
  { name: 'Vercel', category: 'Cloud & Infrastructure', variants: ['python-developer'] },

  // Tools
  { name: 'Jupyter', category: 'Tools', variants: ['data-analyst', 'data-engineer'] },
  { name: 'Git', category: 'Tools', variants: ALL_VARIANTS },
  { name: 'Excel', category: 'Tools', variants: ['data-analyst'] },
  { name: 'PyArrow', category: 'Tools', variants: ['data-engineer'] },
  { name: 'XlsxWriter', category: 'Tools', variants: ['data-engineer', 'data-analyst'] },
  { name: 'Selenium', category: 'Tools', variants: ['python-developer'] },
  { name: 'Botpress', category: 'Tools', variants: ['python-developer'] },

  // Data Standards & Terminologies
  { name: 'SNOMED CT', category: 'Data Standards', variants: ['data-engineer', 'data-analyst'] },
  { name: 'LOINC', category: 'Data Standards', variants: ['data-engineer', 'data-analyst'] },
  { name: 'RxNorm', category: 'Data Standards', variants: ['data-engineer', 'data-analyst'] },
  { name: 'OMOP CDM', category: 'Data Standards', variants: ['data-engineer', 'data-analyst'] },

  // Data Modeling & Integration
  { name: 'ETL / ELT', category: 'Data Modeling & Integration', variants: ['data-engineer', 'data-analyst'] },
  { name: 'Data Modeling', category: 'Data Modeling & Integration', variants: ['data-engineer'] },
  { name: 'Data Dictionaries', category: 'Data Modeling & Integration', variants: ['data-engineer', 'data-analyst'] },
  { name: 'JSON / XML', category: 'Data Modeling & Integration', variants: ['data-engineer', 'python-developer'] },

  // Frameworks & Web
  { name: 'React', category: 'Frameworks & Web', variants: ['python-developer'] },
  { name: 'Next.js', category: 'Frameworks & Web', variants: ['python-developer'] },
  { name: 'Tailwind CSS', category: 'Frameworks & Web', variants: ['python-developer'] },
  { name: 'REST APIs', category: 'Frameworks & Web', variants: ['python-developer', 'data-engineer'] },
]

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export const projects: Project[] = [
  {
    name: 'Variant Reporting Web Application',
    description:
      'Web-based genomic variant reporting tool built with Panel (Bokeh). Replaced a static local workflow with on-demand report generation backed by Azure SQL pipelines and BCP bulk loading.',
    tech: ['Python', 'Panel', 'Azure SQL', 'PyODBC', 'BCP', 'Pandas'],
    variants: ['python-developer', 'data-engineer'],
  },
  {
    name: 'DUA Tracking System',
    description:
      'Python automation tool managing 470+ user agreements for a research data portal. Tracks interactions, generates committee blurbs, monitors renewal deadlines, and saves approximately 15 hours per week.',
    tech: ['Python', 'Pandas', 'Azure Blob Storage', 'XlsxWriter'],
    variants: ALL_VARIANTS,
  },
  {
    name: 'Data Access Workflow Portal',
    description:
      'Full-stack application managing data access requests with role-based workflows, automated email notifications, and audit logging.',
    tech: ['Next.js', 'TypeScript', 'PostgreSQL', 'Tailwind CSS', 'Resend'],
    variants: ['python-developer', 'data-engineer'],
    url: '/demos/data-access-portal',
  },
  {
    name: 'Gym Data Tracker',
    description:
      'Interactive fitness analytics dashboard with data entry, trend visualization, and an AI-powered chat assistant for workout insights.',
    tech: ['React', 'PostgreSQL', 'Recharts', 'OpenAI API'],
    variants: ['python-developer', 'data-analyst', 'data-engineer'],
    url: '/demos/gym-dashboard',
  },
  {
    name: 'Data Cleaner Tool',
    description:
      'Browser-based data cleaning utility for spreadsheet files with column mapping, null normalization, date formatting, and automated transformations.',
    tech: ['Next.js', 'TypeScript', 'ExcelJS', 'Tailwind CSS'],
    variants: ['data-engineer', 'python-developer'],
    url: '/demos/dillons-data-cleaner',
  },
  {
    name: 'Materials Inventory Dashboard',
    description:
      'Real-time inventory tracking dashboard with filtering, sorting, and visual analytics for materials management.',
    tech: ['React', 'TypeScript', 'Next.js', 'Tailwind CSS'],
    variants: ['python-developer', 'data-analyst'],
    url: '/demos/materials-dashboard',
  },
  {
    name: '2022 SAIPE Estimates Analysis',
    description:
      'Analyzed and visualized Small Area Income and Poverty Estimates (SAIPE) data to uncover insights on poverty rates and median income across U.S. counties.',
    tech: ['Python', 'Pandas', 'Matplotlib', 'Seaborn'],
    variants: ['data-analyst'],
  },
  {
    name: 'Chronic Condition Drug Utilization Analysis',
    description:
      'State-by-state analysis of drug utilization patterns and costs, providing policy implications for healthcare strategies.',
    tech: ['Python', 'Pandas', 'SQLite', 'Matplotlib', 'Seaborn'],
    variants: ['data-analyst']
  },
]

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

export function getVariantMeta(slug: ResumeVariant): VariantMeta | undefined {
  return variantMeta.find((v) => v.slug === slug)
}

export function getAllVariantMeta(): VariantMeta[] {
  return variantMeta
}

const MIN_EXPERIENCE_BULLETS = 2

const FALLBACK_PRIORITY: Record<ResumeVariant, ResumeVariant[]> = {
  'data-engineer': ['data-analyst', 'python-developer'],
  'data-analyst': ['data-engineer', 'python-developer'],
  'python-developer': ['data-engineer', 'data-analyst'],
}

export function getResumeData(variant: ResumeVariant) {
  const meta = getVariantMeta(variant)
  if (!meta) return null

  const filteredExperiences = experiences
    .map((exp) => {
      const primaryBullets = exp.bullets.filter((b) => b.variants.includes(variant))

      if (primaryBullets.length >= MIN_EXPERIENCE_BULLETS) {
        return { ...exp, bullets: primaryBullets }
      }

      const fallbackBullets: ExperienceBullet[] = []
      const secondaryBullets = exp.bullets.filter((b) => !primaryBullets.includes(b))

      for (const fallbackVariant of FALLBACK_PRIORITY[variant]) {
        for (const bullet of secondaryBullets) {
          if (bullet.variants.includes(fallbackVariant) && !fallbackBullets.includes(bullet)) {
            fallbackBullets.push(bullet)
          }
        }
      }

      return {
        ...exp,
        bullets: [...primaryBullets, ...fallbackBullets].slice(0, MIN_EXPERIENCE_BULLETS),
      }
    })
    .filter((exp) => exp.bullets.length > 0)

  const filteredSkills = skills.filter((s) => s.variants.includes(variant))

  const skillsByCategory: Record<string, string[]> = {}
  for (const skill of filteredSkills) {
    if (!skillsByCategory[skill.category]) {
      skillsByCategory[skill.category] = []
    }
    skillsByCategory[skill.category].push(skill.name)
  }

  const filteredProjects = projects.filter((p) => p.variants.includes(variant))
  const filteredCertifications = certifications.filter((c) => c.variants.includes(variant))

  return {
    contact: contactInfo,
    meta,
    experiences: filteredExperiences,
    education,
    certifications: filteredCertifications,
    skillsByCategory,
    projects: filteredProjects,
  }
}

export function isValidVariant(slug: string): slug is ResumeVariant {
  return ALL_VARIANTS.includes(slug as ResumeVariant)
}
