/**
 * One-off script to generate a Sage Data Product Engineer resume PDF.
 * Run: npx tsx scripts/generate-sage-resume.tsx
 * Output: Dillon_Shearer_Resume_Data_Product_Engineer.pdf
 */
import React from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Link,
} from '@react-pdf/renderer'
import { writeFileSync } from 'fs'
import { join } from 'path'

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const ACCENT = '#2a2a2a'
const LIGHT = '#555555'
const RULE = '#cccccc'

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    paddingTop: 32,
    paddingBottom: 28,
    paddingHorizontal: 38,
    backgroundColor: '#ffffff',
    color: '#1a1a1a',
  },
  // -- Header --
  header: {
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1.5,
    borderBottomColor: RULE,
  },
  name: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: '#000000',
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  headline: {
    fontSize: 11,
    color: LIGHT,
    marginBottom: 7,
  },
  contactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    fontSize: 9,
    color: LIGHT,
  },
  contactItem: {
    marginRight: 6,
  },
  contactSep: {
    marginRight: 6,
    color: '#bbbbbb',
  },
  // -- Sections --
  section: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: ACCENT,
    marginBottom: 6,
    borderBottomWidth: 0.75,
    borderBottomColor: RULE,
    paddingBottom: 3,
  },
  summary: {
    fontSize: 9.5,
    lineHeight: 1.55,
    color: '#333333',
  },
  // -- Skills --
  skillRow: {
    flexDirection: 'row',
    marginBottom: 2.5,
  },
  skillCategory: {
    fontSize: 9.5,
    fontFamily: 'Helvetica-Bold',
    color: ACCENT,
    width: 115,
  },
  skillList: {
    fontSize: 9.5,
    color: '#333333',
    flex: 1,
  },
  // -- Experience --
  experienceItem: {
    marginBottom: 10,
  },
  experienceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 1,
  },
  experienceTitle: {
    fontSize: 10.5,
    fontFamily: 'Helvetica-Bold',
    color: '#000000',
  },
  experienceCompany: {
    fontSize: 9.5,
    color: LIGHT,
    marginBottom: 3,
  },
  experienceDate: {
    fontSize: 9,
    color: LIGHT,
  },
  bulletList: {
    marginTop: 2,
  },
  bulletItem: {
    flexDirection: 'row',
    marginBottom: 2.5,
  },
  bulletPoint: {
    width: 10,
    fontSize: 9,
    color: LIGHT,
  },
  bulletText: {
    flex: 1,
    fontSize: 9,
    lineHeight: 1.4,
    color: '#333333',
  },
  // -- Projects --
  projectItem: {
    marginBottom: 7,
  },
  projectTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 1,
  },
  projectName: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#000000',
  },
  projectTech: {
    fontSize: 8,
    color: LIGHT,
  },
  projectDescription: {
    fontSize: 8.5,
    lineHeight: 1.4,
    color: '#444444',
  },
  // -- Education / Certs --
  eduRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 3,
  },
  eduDegree: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#000000',
  },
  eduSchool: {
    fontSize: 9,
    color: LIGHT,
  },
  eduYear: {
    fontSize: 9,
    color: LIGHT,
  },
  certRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  certName: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#000000',
  },
  certIssuer: {
    fontSize: 9,
    color: LIGHT,
  },
  certDate: {
    fontSize: 9,
    color: LIGHT,
  },
})

// ---------------------------------------------------------------------------
// Contact separator helper
// ---------------------------------------------------------------------------

function ContactSep() {
  return <Text style={styles.contactSep}>|</Text>
}

// ---------------------------------------------------------------------------
// Resume
// ---------------------------------------------------------------------------

const SageResume = () => (
  <Document>
    <Page size="LETTER" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.name}>DILLON SHEARER</Text>
        <Text style={styles.headline}>Data Product Engineer</Text>
        <View style={styles.contactRow}>
          <Text style={styles.contactItem}>dillshearer@outlook.com</Text>
          <ContactSep />
          <Text style={styles.contactItem}>linkedin.com/in/dillonshearer</Text>
          <ContactSep />
          <Text style={styles.contactItem}>github.com/dillon-shearer</Text>
          <ContactSep />
          <Text style={styles.contactItem}>datawithdillon.com</Text>
          <ContactSep />
          <Text style={styles.contactItem}>Newnan, Georgia</Text>
        </View>
      </View>

      {/* Summary */}
      <View style={styles.section}>
        <Text style={styles.summary}>
          Data product engineer with 4+ years turning data into interactive software products. Built production ETL workflows processing millions of clinical and genomic records, shipped full-stack web applications serving 470+ users with React and TypeScript frontends backed by Python APIs, and integrated AI models into production tools handling 300+ interactions monthly. Core stack: Python, TypeScript, React, SQL, and cloud services (AWS, Azure) with hands-on Snowflake, PostgreSQL, and dbt experience. Equally comfortable writing data pipelines, deploying cloud resources, developing REST APIs, and spinning up rapid prototypes in short sprints.
        </Text>
      </View>

      {/* Technical Skills */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Technical Skills</Text>
        <View style={styles.skillRow}>
          <Text style={styles.skillCategory}>Languages</Text>
          <Text style={styles.skillList}>Python, JavaScript, TypeScript, SQL, R</Text>
        </View>
        <View style={styles.skillRow}>
          <Text style={styles.skillCategory}>Frontend</Text>
          <Text style={styles.skillList}>React, Next.js, Vite, Tailwind CSS, Recharts, Three.js</Text>
        </View>
        <View style={styles.skillRow}>
          <Text style={styles.skillCategory}>Backend / APIs</Text>
          <Text style={styles.skillList}>FastAPI, Flask, REST APIs, GraphQL, Node.js</Text>
        </View>
        <View style={styles.skillRow}>
          <Text style={styles.skillCategory}>Cloud / Infra</Text>
          <Text style={styles.skillList}>AWS (S3, Lambda, API Gateway, Glue, Bedrock), Azure, Terraform</Text>
        </View>
        <View style={styles.skillRow}>
          <Text style={styles.skillCategory}>Data Engineering</Text>
          <Text style={styles.skillList}>Snowflake, PostgreSQL, ETL/ELT, dbt, Pandas, NumPy, Data Modeling</Text>
        </View>
        <View style={styles.skillRow}>
          <Text style={styles.skillCategory}>AI / ML</Text>
          <Text style={styles.skillList}>LLM Agents, RAG, Prompt Engineering, AWS Bedrock, Claude API</Text>
        </View>
        <View style={styles.skillRow}>
          <Text style={styles.skillCategory}>Visualization</Text>
          <Text style={styles.skillList}>Tableau, Power BI, Looker, Matplotlib, Seaborn</Text>
        </View>
        <View style={styles.skillRow}>
          <Text style={styles.skillCategory}>DevOps / Tools</Text>
          <Text style={styles.skillList}>Git, GitHub, CI/CD, Docker</Text>
        </View>
      </View>

      {/* Experience */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Experience</Text>

        {/* Answer ALS */}
        <View style={styles.experienceItem}>
          <View style={styles.experienceHeader}>
            <View>
              <Text style={styles.experienceTitle}>Data Scientist</Text>
              <Text style={styles.experienceCompany}>Answer ALS | Remote</Text>
            </View>
            <Text style={styles.experienceDate}>Feb 2022 - Present</Text>
          </View>
          <View style={styles.bulletList}>
            {[
              'Architected data ingestion and processing pipelines in Python handling 1,200+ participant records from 9 disparate clinical sources, automating ETL workflows that unify raw data into a standardized research data layer',
              'Built and shipped full-stack internal web applications using React, Next.js, and TypeScript with Python API backends and PostgreSQL, serving 470+ researchers with self-service data access and analytics dashboards',
              'Developed and deployed conversational AI agent integrating LLM capabilities into production workflows, handling 300+ monthly researcher interactions for onboarding, data access support, and FAQ resolution',
              'Designed cloud data infrastructure including storage organization, automated file inventory systems, and cross-source validation pipelines supporting data releases across 9 source systems',
              'Built automated data operations pipeline running 3x weekly, eliminating 15+ hours of manual processing through Python scripts managing agreement tracking, renewal monitoring, and compliance reporting',
              'Engineered OMOP Common Data Model transformations mapping raw clinical data to SNOMED CT, LOINC, and RxNorm, enabling cross-institutional research compatibility',
              'Created Looker semantic layer with dbt-style intermediate tables standardizing dataset curation, reducing analyst onboarding time and ensuring consistent metric definitions',
              'Led technical requirements for platform features in short sprint cycles, writing specifications, defining acceptance criteria, and validating implementations against research team needs',
            ].map((text, i) => (
              <View key={i} style={styles.bulletItem}>
                <Text style={styles.bulletPoint}>-</Text>
                <Text style={styles.bulletText}>{text}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Equity Quotient */}
        <View style={styles.experienceItem}>
          <View style={styles.experienceHeader}>
            <View>
              <Text style={styles.experienceTitle}>Data Analyst</Text>
              <Text style={styles.experienceCompany}>Equity Quotient | Remote</Text>
            </View>
            <Text style={styles.experienceDate}>Sep 2022 - Apr 2023</Text>
          </View>
          <View style={styles.bulletList}>
            {[
              'Designed and built Snowflake data models ingesting 12 datasets with 150+ standardized fields, delivering sub-second query performance powering 7 client dashboards and 30 KPI widgets',
              'Engineered Python data pipelines processing 15M+ rows of U.S. Census and HMDA data, creating pre-aggregated tables and crosswalks that reduced front-end dashboard load times by 35%',
              'Rapidly prototyped and delivered 7 interactive client dashboards visualizing equity metrics, iterating through short development sprints based on stakeholder feedback',
              'Built SQL views, staging tables, and reusable Python transformation utilities with documented logic, establishing patterns adopted by the data engineering team for production workflows',
            ].map((text, i) => (
              <View key={i} style={styles.bulletItem}>
                <Text style={styles.bulletPoint}>-</Text>
                <Text style={styles.bulletText}>{text}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* RARE-X */}
        <View style={styles.experienceItem}>
          <View style={styles.experienceHeader}>
            <View>
              <Text style={styles.experienceTitle}>Data Standards Intern</Text>
              <Text style={styles.experienceCompany}>RARE-X | Remote</Text>
            </View>
            <Text style={styles.experienceDate}>Jun 2021 - Feb 2022</Text>
          </View>
          <View style={styles.bulletList}>
            {[
              'Built JSON schemas defining field types, validation rules, and entity relationships for the Data Collection Platform REST API, enforcing data quality at the ingestion layer',
              'Mapped internal data structures to standardized health terminologies, enabling interoperability across datasets and external research platforms',
            ].map((text, i) => (
              <View key={i} style={styles.bulletItem}>
                <Text style={styles.bulletPoint}>-</Text>
                <Text style={styles.bulletText}>{text}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Across Healthcare */}
        <View style={styles.experienceItem}>
          <View style={styles.experienceHeader}>
            <View>
              <Text style={styles.experienceTitle}>Software Developer Intern</Text>
              <Text style={styles.experienceCompany}>Across Healthcare | Atlanta, GA</Text>
            </View>
            <Text style={styles.experienceDate}>May 2021 - Feb 2022</Text>
          </View>
          <View style={styles.bulletList}>
            {[
              'Built reusable front-end components for clinical data collection and integrated response data into backend database systems with migration scripts and validation logic',
              'Developed Selenium test automation framework reducing manual QA effort by 70%, improving deployment confidence through consistent regression coverage',
            ].map((text, i) => (
              <View key={i} style={styles.bulletItem}>
                <Text style={styles.bulletPoint}>-</Text>
                <Text style={styles.bulletText}>{text}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Key Projects */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Key Projects</Text>

        <View style={styles.projectItem}>
          <View style={styles.projectTitleRow}>
            <Text style={styles.projectName}>Data Access Portal</Text>
            <Text style={styles.projectTech}>Next.js, TypeScript, React, PostgreSQL, REST API</Text>
          </View>
          <Text style={styles.projectDescription}>
            Full-stack web application managing research data access requests with role-based workflows, automated email notifications, and audit logging. Serves 470+ researchers. datawithdillon.com/demos/data-access-portal
          </Text>
        </View>

        <View style={styles.projectItem}>
          <View style={styles.projectTitleRow}>
            <Text style={styles.projectName}>Fitness Analytics Dashboard</Text>
            <Text style={styles.projectTech}>React, Next.js, PostgreSQL, Recharts, AI/LLM</Text>
          </View>
          <Text style={styles.projectDescription}>
            Interactive data visualization app with AI-powered conversational analytics and natural language to SQL generation using Claude API. datawithdillon.com/demos/gym-dashboard
          </Text>
        </View>

        <View style={styles.projectItem}>
          <View style={styles.projectTitleRow}>
            <Text style={styles.projectName}>Variant Reporting Application</Text>
            <Text style={styles.projectTech}>Python, Panel/Bokeh, Azure SQL, Pandas</Text>
          </View>
          <Text style={styles.projectDescription}>
            Production genomic data processing tool. Processes 50K+ variants across 939 participants with millions of genome calls, replacing manual workflows with on-demand report generation.
          </Text>
        </View>
      </View>

      {/* Education */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Education</Text>
        <View style={styles.eduRow}>
          <View>
            <Text style={styles.eduDegree}>Bachelor of Business Administration, Management Information Systems</Text>
            <Text style={styles.eduSchool}>University of West Georgia</Text>
          </View>
          <Text style={styles.eduYear}>2022</Text>
        </View>
      </View>

      {/* Certifications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Certifications</Text>
        <View style={styles.certRow}>
          <View>
            <Text style={styles.certName}>Protecting Human Research Participants</Text>
            <Text style={styles.certIssuer}>PHRP Online Training, Inc. | ID: 3004648</Text>
          </View>
          <Text style={styles.certDate}>Apr 2025</Text>
        </View>
      </View>
    </Page>
  </Document>
)

// ---------------------------------------------------------------------------
// Generate PDF
// ---------------------------------------------------------------------------

async function main() {
  console.log('Generating Sage Data Product Engineer resume PDF...')
  const buffer = await renderToBuffer(<SageResume />)
  const outPath = join(process.cwd(), 'Dillon_Shearer_Resume_Data_Product_Engineer.pdf')
  writeFileSync(outPath, buffer)
  console.log(`Done! Saved to: ${outPath}`)
}

main().catch(console.error)
