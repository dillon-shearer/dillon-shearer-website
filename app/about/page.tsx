import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About | DWD',
  description: 'Learn about my journey in healthcare data science and analytics.',
  openGraph: {
    title: 'About | Data With Dillon',
    description: 'Learn about my journey in healthcare data science and analytics.',
    type: 'website',
  },
}

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">
            About Me
          </h1>
          <p className="text-xl max-w-3xl mx-auto">
            Healthcare data scientist passionate about turning complex datasets into 
            actionable insights that impact real lives.
          </p>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          <div className="prose prose-lg prose-gray dark:prose-invert mx-auto">
            <p>
              After graduating with my MIS degree from UWG, I wasn't sure which direction 
              to take my career. An internship as a QA/BA at a rare disease data platform 
              opened my eyes to the impact that clean, well-structured data can have on real lives.
            </p>
            
            <p>
              That experience led me to my current role as a data scientist at Answer ALS, 
              where I've been learning and growing ever since. What I love most about this 
              work is the variety – healthcare data challenges don't fit into neat categories, 
              so I've embraced everything from building AI agents to creating executive 
              dashboards to implementing data transformation tools.
            </p>

            <h2>What I Do</h2>
            <p>
              As a full-stack data professional, my work spans the entire data lifecycle:
            </p>
            
            <ul>
              <li><strong>Data visualization</strong> – Creating compelling stories from complex datasets</li>
              <li><strong>Analytics & reporting</strong> – Building dashboards and automated reports</li>
              <li><strong>Data transformation</strong> – Cleaning, structuring, and pipeline development</li>
              <li><strong>AI implementation</strong> – Developing agents and intelligent solutions</li>
              <li><strong>Data management</strong> – Ensuring quality, accessibility, and governance</li>
            </ul>

            <h2>My Approach</h2>
            <p>
              I believe that the best data work happens when you combine technical rigor 
              with genuine curiosity about the problems you're solving. In healthcare, 
              this means understanding that behind every data point is a patient, a family, 
              or a researcher working toward better treatments.
            </p>
            
            <p>
              I'm always learning something new – whether that's mastering a new tool, 
              diving deeper into a domain area, or finding better ways to communicate 
              complex insights to diverse stakeholders.
            </p>
          </div>

          {/* Call to Action - Now constrained to prose width */}
          <div className="text-center mt-16 p-8 bg-gray-50 dark:bg-gray-800 rounded-xl prose prose-lg prose-gray dark:prose-invert mx-auto">
            <h2 className="text-2xl font-bold mb-4">
              Let's Connect
            </h2>
            <p className="mb-6">
              I'm always interested in discussing data challenges, especially in healthcare 
              and life sciences. Whether you're looking for collaboration or just want to chat 
              about data science, feel free to reach out.
            </p>
            <a
              href="/contact"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Get in Touch
              <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}