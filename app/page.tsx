// app/page.tsx
'use client'

import { useRef, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import GitHubWidget from '@/app/components/github-widget'
import HiddenSnakeButton from '@/app/components/snake-game'
// (Imported but not currently used; keep if you plan to render posts later)
// import { BlogPosts } from '@/app/components/posts'

export default function Page() {
  const router = useRouter()

  // --- Triple-tap on avatar to open hidden page ---
  const tapCountRef = useRef(0)
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [tapArmed, setTapArmed] = useState(false) // avoids accidental taps on load

  useEffect(() => {
    // arm after a short delay so initial layout taps don't count
    const t = setTimeout(() => setTapArmed(true), 800)
    return () => clearTimeout(t)
  }, [])

  const handleSecretTap = () => {
    if (!tapArmed) return

    tapCountRef.current += 1

    // reset window: all taps must occur within this window
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current)
    resetTimerRef.current = setTimeout(() => {
      tapCountRef.current = 0
    }, 900) // 900ms rolling window feels good on mobile

    if (tapCountRef.current >= 3) {
      // optional subtle haptic on supported devices
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        // @ts-ignore
        navigator.vibrate?.(30)
      }
      tapCountRef.current = 0
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current)
        resetTimerRef.current = null
      }
      router.push('/demos/gym-dashboard/form')
    }
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-16">
        {/* Header Section */}
        <div className="text-center mb-16">
          <div className="flex flex-col items-center mb-8">
            <img
              src="ds.jpg"
              alt="Dillon Shearer"
              className="w-40 h-40 rounded-full mb-6 select-none"
              onClick={handleSecretTap}
              onDoubleClick={(e) => e.preventDefault()} // reduce accidental desktop nav
              draggable={false}
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
