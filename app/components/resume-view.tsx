import type { ContactInfo, VariantMeta, Experience, Education, Project, Certification } from '@/lib/resume-data'

interface ResumeViewProps {
  contact: ContactInfo
  meta: VariantMeta
  experiences: Experience[]
  education: Education[]
  certifications: Certification[]
  skillsByCategory: Record<string, string[]>
  projects: Project[]
}

export default function ResumeView({
  contact,
  meta,
  experiences,
  education,
  certifications,
  skillsByCategory,
  projects,
}: ResumeViewProps) {
  return (
    <div className="resume-content">
      {/* ---------------------------------------------------------------- */}
      {/* Header */}
      {/* ---------------------------------------------------------------- */}
      <header className="mb-8 border-b border-white/10 pb-6 print:border-gray-300 print:mb-5 print:pb-4">
        <h1 className="text-3xl font-bold text-white print:text-black">
          {contact.name}
        </h1>
        <p className="text-lg mt-1" style={{ color: meta.accentColor }}>
          {meta.headline}
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-sm text-white/60 print:text-gray-600">
          {contact.email && <span>{contact.email}</span>}
          {contact.linkedin && <span>{contact.linkedin}</span>}
          {contact.github && <span>{contact.github}</span>}
          {contact.website && <span>{contact.website}</span>}
          {contact.location && <span>{contact.location}</span>}
        </div>
      </header>

      {/* ---------------------------------------------------------------- */}
      {/* Summary */}
      {/* ---------------------------------------------------------------- */}
      <section className="mb-8 print:mb-5">
        <h2 className="text-xs uppercase tracking-[0.3em] text-white/50 mb-3 print:text-gray-500 print:font-semibold">
          Summary
        </h2>
        <p className="text-white/80 leading-relaxed print:text-gray-800">
          {meta.summary}
        </p>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Experience */}
      {/* ---------------------------------------------------------------- */}
      {experiences.length > 0 && (
        <section className="mb-8 print:mb-5">
          <h2 className="text-xs uppercase tracking-[0.3em] text-white/50 mb-4 print:text-gray-500 print:font-semibold">
            Experience
          </h2>
          <div className="space-y-6 print:space-y-4">
            {experiences.map((exp) => (
              <div key={`${exp.company}-${exp.role}`} className="print-avoid-break">
                <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
                  <div>
                    <h3 className="text-lg font-semibold text-white print:text-black">
                      {exp.role}
                    </h3>
                    <p className="text-white/60 print:text-gray-600">
                      {exp.company}{exp.location ? `, ${exp.location}` : ''}
                    </p>
                  </div>
                  <p className="text-sm text-white/40 print:text-gray-500 shrink-0">
                    {exp.startDate} - {exp.endDate}
                  </p>
                </div>
                <ul className="mt-3 space-y-2 print:mt-2 print:space-y-1">
                  {exp.bullets.map((bullet, i) => (
                    <li
                      key={i}
                      className="text-sm text-white/70 leading-relaxed pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-white/30 print:text-gray-700 print:before:text-gray-400"
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

      {/* ---------------------------------------------------------------- */}
      {/* Skills */}
      {/* ---------------------------------------------------------------- */}
      {Object.keys(skillsByCategory).length > 0 && (
        <section className="mb-8 print:mb-5">
          <h2 className="text-xs uppercase tracking-[0.3em] text-white/50 mb-4 print:text-gray-500 print:font-semibold">
            Skills
          </h2>
          <div className="space-y-3 print:space-y-2">
            {Object.entries(skillsByCategory).map(([category, categorySkills]) => (
              <div key={category} className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
                <span className="text-sm font-medium text-white/60 print:text-gray-600 shrink-0 sm:w-40">
                  {category}
                </span>
                <div className="flex flex-wrap gap-2">
                  {categorySkills.map((skill) => (
                    <span
                      key={skill}
                      className="px-2.5 py-1 text-xs bg-white/5 text-white/60 rounded-full border border-white/5 print:bg-gray-100 print:text-gray-700 print:border-gray-200 print:text-[10px]"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Projects */}
      {/* ---------------------------------------------------------------- */}
      {projects.length > 0 && (
        <section className="mb-8 print:mb-5">
          <h2 className="text-xs uppercase tracking-[0.3em] text-white/50 mb-4 print:text-gray-500 print:font-semibold">
            Projects
          </h2>
          <div className="space-y-4 print:space-y-3">
            {projects.map((project) => (
              <div key={project.name} className="print-avoid-break">
                <div className="flex items-baseline gap-2">
                  <h3 className="text-base font-semibold text-white print:text-black">
                    {project.name}
                  </h3>
                  {project.url && (
                    <a
                      href={project.url}
                      className="text-xs text-[#54b3d6] hover:underline print:text-blue-600"
                    >
                      View
                    </a>
                  )}
                </div>
                <p className="text-sm text-white/70 mt-1 print:text-gray-700">
                  {project.description}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2 print:mt-1.5">
                  {project.tech.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 text-xs bg-white/5 text-white/50 rounded-full border border-white/5 print:bg-gray-100 print:text-gray-600 print:border-gray-200"
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

      {/* ---------------------------------------------------------------- */}
      {/* Education */}
      {/* ---------------------------------------------------------------- */}
      {education.length > 0 && (
        <section className={certifications.length > 0 ? 'mb-8 print:mb-5' : undefined}>
          <h2 className="text-xs uppercase tracking-[0.3em] text-white/50 mb-4 print:text-gray-500 print:font-semibold">
            Education
          </h2>
          <div className="space-y-3 print:space-y-2">
            {education.map((edu) => (
              <div key={`${edu.school}-${edu.degree}`} className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
                <div>
                  <h3 className="text-base font-semibold text-white print:text-black">
                    {edu.degree}, {edu.field}
                  </h3>
                  <p className="text-sm text-white/60 print:text-gray-600">
                    {edu.school}
                  </p>
                </div>
                <p className="text-sm text-white/40 print:text-gray-500 shrink-0">
                  {edu.year}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Certifications */}
      {/* ---------------------------------------------------------------- */}
      {certifications.length > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-[0.3em] text-white/50 mb-4 print:text-gray-500 print:font-semibold">
            Certifications
          </h2>
          <div className="space-y-3 print:space-y-2">
            {certifications.map((cert) => (
              <div
                key={`${cert.name}-${cert.issuer}`}
                className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 print-avoid-break"
              >
                <div>
                  <h3 className="text-base font-semibold text-white print:text-black">
                    {cert.name}
                  </h3>
                  <p className="text-sm text-white/60 print:text-gray-600">
                    {cert.issuer}
                    {cert.credentialId ? `, Credential ID ${cert.credentialId}` : ''}
                  </p>
                </div>
                <p className="text-sm text-white/40 print:text-gray-500 shrink-0">
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
