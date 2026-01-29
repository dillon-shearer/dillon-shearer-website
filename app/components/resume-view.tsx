import type {
  ContactInfo,
  VariantContent,
  Experience,
  Education,
  Project,
  Certification,
} from '@/lib/resume-data'

interface ResumeViewProps {
  contact: ContactInfo
  meta: VariantContent
  experiences: Experience[]
  education: Education[]
  certifications: Certification[]
  skillsSpotlight: string[]
  projects: Project[]
}

export default function ResumeView({
  contact,
  meta,
  experiences,
  education,
  certifications,
  skillsSpotlight,
  projects,
}: ResumeViewProps) {
  return (
    <div className="resume-content print:text-[11px] print:leading-snug">
      {/* Header */}
      <header className="mb-6 border-b border-white/10 pb-5 print:border-gray-300 print:mb-3 print:pb-2">
        <h1 className="text-3xl font-bold text-white print:text-black print:text-2xl">
          {contact.name}
        </h1>
        <p className="text-lg mt-1 print:text-sm print:mt-0.5" style={{ color: meta.accentColor }}>
          {meta.headline}
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-sm text-white/60 print:text-gray-600 print:text-[10px] print:mt-1 print:gap-x-3">
          {contact.email && <span>{contact.email}</span>}
          {contact.linkedin && <span>{contact.linkedin}</span>}
          {contact.github && <span>{contact.github}</span>}
          {contact.website && <span>{contact.website}</span>}
          {contact.location && <span>{contact.location}</span>}
        </div>
      </header>

      {/* Summary */}
      <section className="mb-6 print:mb-3">
        <p className="text-white/80 leading-relaxed print:text-gray-800 text-sm print:text-[11px] print:leading-normal">
          {meta.summary}
        </p>
      </section>

      {/* Skills Spotlight */}
      {skillsSpotlight.length > 0 && (
        <section className="mb-6 print:mb-3">
          <h2 className="text-xs uppercase tracking-[0.3em] text-white/50 mb-3 print:text-gray-500 print:font-semibold print:text-[9px] print:mb-1.5">
            Technical Skills
          </h2>
          <div className="flex flex-wrap gap-2 print:gap-1">
            {skillsSpotlight.map((skill) => (
              <span
                key={skill}
                className="px-2.5 py-1 text-xs bg-white/5 text-white/70 rounded-full border border-white/10 print:bg-gray-100 print:text-gray-700 print:border-gray-200 print:text-[10px] print:px-1.5 print:py-0.5"
              >
                {skill}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Experience */}
      {experiences.length > 0 && (
        <section className="mb-6 print:mb-3">
          <h2 className="text-xs uppercase tracking-[0.3em] text-white/50 mb-4 print:text-gray-500 print:font-semibold print:text-[9px] print:mb-2">
            Experience
          </h2>
          <div className="space-y-5 print:space-y-2">
            {experiences.map((exp) => (
              <div key={exp.id}>
                <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 print:gap-0">
                  <div>
                    <h3 className="text-base font-semibold text-white print:text-black print:text-sm">
                      {exp.role}
                    </h3>
                    <p className="text-sm text-white/60 print:text-gray-600 print:text-[10px]">
                      {exp.company}
                      {exp.location ? ` - ${exp.location}` : ''}
                    </p>
                  </div>
                  <p className="text-xs text-white/40 print:text-gray-500 shrink-0 print:text-[10px]">
                    {exp.startDate} - {exp.endDate}
                  </p>
                </div>
                <ul className="mt-2 space-y-1.5 print:mt-1 print:space-y-0.5">
                  {exp.bullets.map((bullet) => (
                    <li
                      key={bullet.id}
                      className="text-sm text-white/70 leading-relaxed pl-4 relative before:content-['*'] before:absolute before:left-0 before:text-white/30 print:text-gray-700 print:before:text-gray-400 print:text-[10px] print:leading-normal print:pl-3"
                    >
                      {bullet.text}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Key Projects */}
      {projects.length > 0 && (
        <section className="mb-6 print:mb-3">
          <h2 className="text-xs uppercase tracking-[0.3em] text-white/50 mb-4 print:text-gray-500 print:font-semibold print:text-[9px] print:mb-2">
            Key Projects
          </h2>
          <div className="space-y-4 print:space-y-1.5">
            {projects.map((project) => (
              <div key={project.id}>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-sm font-semibold text-white print:text-black print:text-[11px]">
                    {project.name}
                  </h3>
                  {project.url && (
                    <a
                      href={project.url}
                      className="text-xs hover:underline print:text-[9px]"
                      style={{ color: meta.accentColor }}
                    >
                      View Demo
                    </a>
                  )}
                </div>
                <p className="text-sm text-white/70 mt-1 print:text-gray-700 print:text-[10px] print:mt-0.5 print:leading-normal">
                  {project.description}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2 print:mt-1 print:gap-1">
                  {project.tech.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 text-xs bg-white/5 text-white/50 rounded-full border border-white/5 print:bg-gray-100 print:text-gray-600 print:border-gray-200 print:text-[9px] print:px-1 print:py-0"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Education */}
      {education.length > 0 && (
        <section className={certifications.length > 0 ? 'mb-6 print:mb-3' : undefined}>
          <h2 className="text-xs uppercase tracking-[0.3em] text-white/50 mb-3 print:text-gray-500 print:font-semibold print:text-[9px] print:mb-1.5">
            Education
          </h2>
          <div className="space-y-2 print:space-y-1">
            {education.map((edu) => (
              <div
                key={`${edu.school}-${edu.degree}`}
                className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 print:gap-0"
              >
                <div>
                  <h3 className="text-sm font-semibold text-white print:text-black print:text-[11px]">
                    {edu.degree}, {edu.field}
                  </h3>
                  <p className="text-xs text-white/60 print:text-gray-600 print:text-[10px]">
                    {edu.school}
                  </p>
                </div>
                <p className="text-xs text-white/40 print:text-gray-500 shrink-0 print:text-[10px]">
                  {edu.year}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Certifications */}
      {certifications.length > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-[0.3em] text-white/50 mb-3 print:text-gray-500 print:font-semibold print:text-[9px] print:mb-1.5">
            Certifications
          </h2>
          <div className="space-y-2 print:space-y-1">
            {certifications.map((cert) => (
              <div
                key={`${cert.name}-${cert.issuer}`}
                className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 print:gap-0"
              >
                <div>
                  <h3 className="text-sm font-semibold text-white print:text-black print:text-[11px]">
                    {cert.name}
                  </h3>
                  <p className="text-xs text-white/60 print:text-gray-600 print:text-[10px]">
                    {cert.issuer}
                    {cert.credentialId ? ` | ID: ${cert.credentialId}` : ''}
                  </p>
                </div>
                <p className="text-xs text-white/40 print:text-gray-500 shrink-0 print:text-[10px]">
                  {cert.date}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
