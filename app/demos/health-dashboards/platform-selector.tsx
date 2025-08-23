'use client'

import { useState } from 'react'

interface Platform {
  id: string
  name: string
  description: string
  perspective: string
  stakeholder: string
  status: 'live' | 'coming-soon'
  features: string[]
}

const platforms: Platform[] = [
  {
    id: 'power-bi',
    name: 'Power BI',
    description: 'Executive health outcomes dashboard with key performance indicators and regional comparisons',
    perspective: 'Executive Leadership',
    stakeholder: 'C-Suite, Board Members',
    status: 'live',
    features: [
      'High-level health outcome KPIs',
      'Geographic performance mapping',
      'Year-over-year trend analysis',
      'Executive summary cards'
    ]
  },
  {
    id: 'tableau',
    name: 'Tableau',
    description: 'Interactive analytical deep-dive into demographic correlations and health disparities',
    perspective: 'Data Analytics',
    stakeholder: 'Analysts, Researchers',
    status: 'coming-soon',
    features: [
      'Interactive correlation analysis',
      'Demographic breakdowns',
      'Advanced filtering capabilities',
      'Statistical trend visualization'
    ]
  },
  {
    id: 'looker',
    name: 'Looker Studio',
    description: 'Operational dashboard for resource allocation and targeted intervention planning',
    perspective: 'Operations Management',
    stakeholder: 'Program Managers, Operations',
    status: 'coming-soon',
    features: [
      'Resource allocation insights',
      'Program performance tracking',
      'Geographic intervention mapping',
      'Operational efficiency metrics'
    ]
  },
  {
    id: 'quicksight',
    name: 'QuickSight',
    description: 'Cost analysis and budget optimization for health programs and interventions',
    perspective: 'Financial Analysis',
    stakeholder: 'Finance, Budget Planners',
    status: 'coming-soon',
    features: [
      'Cost-per-outcome analysis',
      'Budget vs. results tracking',
      'ROI calculations',
      'Financial forecasting'
    ]
  }
]

export default function PlatformSelector() {
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null)

  const handlePlatformClick = (platformId: string, status: string) => {
    // Navigate to the platform page regardless of status
    window.location.href = `/demos/health-dashboards/${platformId}`
  }

  return (
    <div className="max-w-7xl mx-auto px-6">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-white mb-4">Choose Your Business Perspective</h2>
        <p className="text-xl text-gray-400 max-w-3xl mx-auto">
          Each platform tells the same health story from a different stakeholder viewpoint. 
          Explore how the same CDC data answers different business questions.
        </p>
      </div>

      {/* Platform Cards - Horizontal Layout */}
      <div className="space-y-6 mb-12">
        {platforms.map((platform, index) => (
          <div
            key={platform.id}
            className={`group relative bg-gray-800 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-700 hover:border-gray-500 overflow-hidden cursor-pointer ${
              selectedPlatform === platform.id ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => handlePlatformClick(platform.id, platform.status)}
          >
            {/* Gradient overlay - different for each platform */}
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
              index === 0 ? 'bg-gradient-to-r from-purple-500/10 to-blue-500/10' :
              index === 1 ? 'bg-gradient-to-r from-blue-500/10 to-cyan-500/10' :
              index === 2 ? 'bg-gradient-to-r from-green-500/10 to-teal-500/10' :
              'bg-gradient-to-r from-orange-500/10 to-red-500/10'
            }`}></div>
            
            <div className="relative p-5">
              <div className="flex flex-col lg:flex-row lg:items-center gap-5">
                {/* Left side - Main Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                    <div>
                      <h3 className="text-2xl font-bold text-white group-hover:text-blue-400 transition-colors duration-300">
                        {platform.name}
                      </h3>
                      <p className="text-gray-400 font-medium mt-1">{platform.perspective}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`px-3 py-1.5 text-xs font-semibold rounded-full ${
                        platform.status === 'live' 
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}>
                        {platform.status === 'live' ? '✓ Live' : '⏳ Coming Soon'}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-gray-300 text-base leading-relaxed mb-3">
                    {platform.description}
                  </p>

                  <div className="text-sm text-gray-400">
                    <span className="font-medium">Target Audience:</span> {platform.stakeholder}
                  </div>
                </div>

                {/* Right side - Features & Action */}
                <div className="lg:w-80 flex-shrink-0">
                  <div className="bg-gray-700/50 rounded-lg p-3 mb-3">
                    <h4 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">
                      Key Features
                    </h4>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      {platform.features.map((feature, featureIndex) => (
                        <div key={featureIndex} className="flex items-start gap-2 text-sm text-gray-300">
                          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-2 ${
                            index === 0 ? 'bg-purple-400' :
                            index === 1 ? 'bg-blue-400' :
                            index === 2 ? 'bg-green-400' :
                            'bg-orange-400'
                          }`}></div>
                          <span className="leading-relaxed">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Button */}
                  {platform.status === 'live' ? (
                    <button className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 px-6 rounded-lg font-semibold transition-all duration-200 transform hover:scale-[1.02] hover:shadow-lg">
                      View Dashboard →
                    </button>
                  ) : (
                    <div className="w-full bg-gray-600/50 text-gray-400 text-center py-3 px-6 rounded-lg font-medium cursor-default border border-gray-600/50 flex items-center justify-center">
                      Dashboard Coming Soon
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Info Box */}
      <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-6 text-center">
        <h4 className="font-medium text-blue-400 mb-2">Development Progress</h4>
        <p className="text-blue-300 text-sm">
          Currently building the first dashboard in Tableau Public. All four platforms will use 
          identical CDC PLACES data but present it through different business lenses - 
          demonstrating how the same dataset can serve multiple stakeholder needs.
        </p>
      </div>
    </div>
  )
}