import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Link,
} from '@react-pdf/renderer'
import type {
  ContactInfo,
  VariantContent,
  Experience,
  Education,
  Project,
  Certification,
} from '@/lib/resume-data'

// Using built-in Helvetica font family for reliable PDF rendering

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    paddingTop: 36,
    paddingBottom: 36,
    paddingHorizontal: 40,
    backgroundColor: '#ffffff',
    color: '#1a1a1a',
  },
  header: {
    marginBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#e5e5e5',
    paddingBottom: 12,
  },
  name: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    color: '#111111',
    marginBottom: 2,
  },
  headline: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#111111',
    marginBottom: 8,
  },
  contactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    fontSize: 9,
    color: '#4a4a4a',
  },
  contactItem: {
    marginRight: 16,
  },
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    color: '#333333',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 4,
  },
  summary: {
    fontSize: 10,
    lineHeight: 1.5,
    color: '#333333',
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  skillTag: {
    fontSize: 9,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#f5f5f5',
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    color: '#333333',
  },
  experienceItem: {
    marginBottom: 12,
  },
  experienceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 2,
  },
  experienceTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#111111',
  },
  experienceCompany: {
    fontSize: 10,
    color: '#4a4a4a',
    marginBottom: 4,
  },
  experienceDate: {
    fontSize: 9,
    color: '#666666',
  },
  bulletList: {
    marginTop: 4,
  },
  bulletItem: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  bulletPoint: {
    width: 12,
    fontSize: 10,
    color: '#666666',
  },
  bulletText: {
    flex: 1,
    fontSize: 9.5,
    lineHeight: 1.4,
    color: '#333333',
  },
  projectItem: {
    marginBottom: 10,
  },
  projectHeader: {
    marginBottom: 2,
  },
  projectName: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#111111',
  },
  projectLink: {
    fontSize: 8,
    color: '#111111',
    textDecoration: 'underline',
    marginTop: 1,
  },
  projectDescription: {
    fontSize: 9,
    lineHeight: 1.4,
    color: '#333333',
    marginBottom: 4,
  },
  techContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  techTag: {
    fontSize: 8,
    paddingHorizontal: 5,
    paddingVertical: 2,
    backgroundColor: '#fafafa',
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    color: '#555555',
  },
  educationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  educationDegree: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#111111',
  },
  educationSchool: {
    fontSize: 9,
    color: '#4a4a4a',
  },
  educationYear: {
    fontSize: 9,
    color: '#666666',
  },
  certItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  certName: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#111111',
  },
  certIssuer: {
    fontSize: 9,
    color: '#4a4a4a',
  },
  certDate: {
    fontSize: 9,
    color: '#666666',
  },
})

interface ResumePDFProps {
  contact: ContactInfo
  meta: VariantContent
  experiences: Experience[]
  education: Education[]
  certifications: Certification[]
  skillsSpotlight: string[]
  projects: Project[]
}

export default function ResumePDF({
  contact,
  meta,
  experiences,
  education,
  certifications,
  skillsSpotlight,
  projects,
}: ResumePDFProps) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.name}>{contact.name}</Text>
          <Text style={styles.headline}>
            {meta.headline}
          </Text>
          <View style={styles.contactRow}>
            {contact.email && <Text style={styles.contactItem}>{contact.email}</Text>}
            {contact.linkedin && <Text style={styles.contactItem}>{contact.linkedin}</Text>}
            {contact.github && <Text style={styles.contactItem}>{contact.github}</Text>}
            {contact.website && <Text style={styles.contactItem}>{contact.website}</Text>}
            {contact.location && <Text style={styles.contactItem}>{contact.location}</Text>}
          </View>
        </View>

        {/* Summary */}
        <View style={styles.section}>
          <Text style={styles.summary}>{meta.summary}</Text>
        </View>

        {/* Technical Skills */}
        {skillsSpotlight.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Technical Skills</Text>
            <View style={styles.skillsContainer}>
              {skillsSpotlight.map((skill) => (
                <Text key={skill} style={styles.skillTag}>
                  {skill}
                </Text>
              ))}
            </View>
          </View>
        )}

        {/* Experience */}
        {experiences.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Experience</Text>
            {experiences.map((exp) => (
              <View key={exp.id} style={styles.experienceItem}>
                <View style={styles.experienceHeader}>
                  <View>
                    <Text style={styles.experienceTitle}>{exp.role}</Text>
                    <Text style={styles.experienceCompany}>
                      {exp.company}
                      {exp.location ? ` - ${exp.location}` : ''}
                    </Text>
                  </View>
                  <Text style={styles.experienceDate}>
                    {exp.startDate} - {exp.endDate}
                  </Text>
                </View>
                <View style={styles.bulletList}>
                  {exp.bullets.map((bullet) => (
                    <View key={bullet.id} style={styles.bulletItem}>
                      <Text style={styles.bulletPoint}>•</Text>
                      <Text style={styles.bulletText}>{bullet.text}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Key Projects */}
        {projects.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Key Projects</Text>
            {projects.map((project) => (
              <View key={project.id} style={styles.projectItem}>
                <View style={styles.projectHeader}>
                  <Text style={styles.projectName}>{project.name}</Text>
                  {project.url && (
                    <Link src={`https://datawithdillon.com${project.url}`} style={styles.projectLink}>
                      datawithdillon.com{project.url}
                    </Link>
                  )}
                </View>
                <Text style={styles.projectDescription}>{project.description}</Text>
                <View style={styles.techContainer}>
                  {project.tech.map((t) => (
                    <Text key={t} style={styles.techTag}>
                      {t}
                    </Text>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Education */}
        {education.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Education</Text>
            {education.map((edu) => (
              <View key={`${edu.school}-${edu.degree}`} style={styles.educationItem}>
                <View>
                  <Text style={styles.educationDegree}>
                    {edu.degree}, {edu.field}
                  </Text>
                  <Text style={styles.educationSchool}>{edu.school}</Text>
                </View>
                <Text style={styles.educationYear}>{edu.year}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Certifications */}
        {certifications.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Certifications</Text>
            {certifications.map((cert) => (
              <View key={`${cert.name}-${cert.issuer}`} style={styles.certItem}>
                <View>
                  <Text style={styles.certName}>{cert.name}</Text>
                  <Text style={styles.certIssuer}>
                    {cert.issuer}
                    {cert.credentialId ? ` | ID: ${cert.credentialId}` : ''}
                  </Text>
                </View>
                <Text style={styles.certDate}>{cert.date}</Text>
              </View>
            ))}
          </View>
        )}
      </Page>
    </Document>
  )
}
