// app/page.tsx

import { BlogPosts } from '@/app/components/posts'
import GitHubWidget from '@/app/components/github-widget'
import HiddenSnakeButton from '@/app/components/snake-game'

export default function Page() {
  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-16">
        {/* Header Section */}
        <div className="text-center mb-16">
          <div className="flex flex-col items-center mb-8">
            <img 
              src="ds.jpg" 
              alt="Dillon Shearer" 
              className="w-40 h-40 rounded-full mb-6" 
            />
            <h1 className="text-4xl font-bold mb-4">
              Dillon Shearer | Data Science & Analytics
            </h1>
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
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
          {/* GitHub Widget */}
          <GitHubWidget />

          {/* Hidden Snake Game Easter Egg */}
          <HiddenSnakeButton />
        </div>
      </div>
    </div>
  )
}