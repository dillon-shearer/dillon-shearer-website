import { BlogPosts } from 'app/components/posts'

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
    <section>
      <h1 className="mb-8 text-2xl font-semibold tracking-tighter">
        Dillon Shearer | Data Science & Analytics
      </h1>

      {/* About Me Section */}
      <div className="mb-8">
        <h2 className="text-xl font-medium">About Me:</h2>
        <p className="mb-4">
          {`I am a dedicated data science and analytics professional focused on healthcare. I leverage advanced statistical techniques, machine learning, and data visualization to extract meaningful insights from complex health data. My goal is to transform raw data into strategic decisions that improve patient outcomes and optimize healthcare operations.`}
        </p>
      </div>

      {/* Projects Section */}
      <div className="my-8">
        <h2 className="text-xl font-medium">Projects:</h2>
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
        <h2 className="text-xl font-medium">Contact:</h2>
        <p>
          Email: <b>dillon@datawithdillon.com</b>
        </p>
      </div>
    </section>
  )
}
