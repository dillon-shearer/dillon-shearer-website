import { BlogPosts } from '@/app/components/posts'

const projects = [
  {
    name: 'State-by-State Analysis of Chronic Condition Drug Utilization and Costs',
    link: 'https://github.com/dillon-shearer/portfolio/tree/main/ChronicConditions_PrescriptionDrugs_Project'
  },
  {
    name: '2022 Census SAIPE Poverty Data Analysis and Visualization',
    link: 'https://github.com/dillon-shearer/portfolio/tree/main/census_Poverty'
  },
  {
    name: 'Reddit TikTok Script',
    link: 'https://github.com/dillon-shearer/portfolio/tree/main/reddit-tiktok-script'
  }
]

export default function Page() {
  return (
    <div className="max-w-4xl mx-auto">
      <section>
        <div className="flex flex-col items-center mb-8 text-center">
          <img 
            src="ds.jpg" 
            alt="Dillon Shearer" 
            className="w-24 h-24 rounded-full mb-4" 
          />
          <h1 className="text-xl font-semibold tracking-tighter">
            Dillon Shearer | Data Science & Analytics
          </h1>
        </div>

        {/* About Me Section */}
        <div className="mb-8">
          <h2 className="text-lg font-medium">About Me:</h2>
          <p className="mb-4">
            {`I am a dedicated data science and analytics professional focused on healthcare. I leverage advanced statistical techniques, machine learning, and data visualization to extract meaningful insights from complex health data. My goal is to transform raw data into strategic decisions that improve patient outcomes and optimize healthcare operations.`}
          </p>
        </div>

        {/* Condensed Skills & Technologies Section */}
        <div className="mb-8">
          <h2 className="text-lg font-medium">Skills & Technologies:</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
            <div>
              <p className="font-semibold">Programming:</p>
              <ul className="list-disc ml-5">
                <li>Python</li>
                <li>SQL</li>
                <li>R</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold">Analytics:</p>
              <ul className="list-disc ml-5">
                <li>Pandas</li>
                <li>Matplotlib</li>
                <li>Seaborn</li>
                <li>Tableau</li>
                <li>Power BI</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold">Machine Learning:</p>
              <ul className="list-disc ml-5">
                <li>Scikit-learn</li>
                <li>TensorFlow</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold">Database & Integration:</p>
              <ul className="list-disc ml-5">
                <li>MySQL</li>
                <li>PostgreSQL</li>
                <li>SnowSQL</li>
                <li>ETL Processes</li>
                <li>Relational & Graph DBs</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold">Tools:</p>
              <ul className="list-disc ml-5">
                <li>Jupyter</li>
                <li>Git</li>
                <li>Excel</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold">Standards & Formats:</p>
              <ul className="list-disc ml-5">
                <li>SNOMED CT</li>
                <li>LOINC</li>
                <li>RxNorm</li>
                <li>XML</li>
                <li>JSON</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Projects Section */}
        <div className="my-8">
          <h2 className="text-lg font-medium">Projects:</h2>
          <ul className="list-disc ml-5 mt-4">
            {projects.map((project) => (
              <li key={project.name}>
                <a 
                  href={project.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  {project.name}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact Section */}
        <div className="my-8">
          <h2 className="text-lg font-medium">Contact:</h2>
          <p>
            Email: <b>dillon@datawithdillon.com</b>
          </p>
        </div>
      </section>
    </div>
  )
}