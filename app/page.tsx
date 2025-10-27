// app/page.tsx
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import GitHubWidget from '@/app/components/github-widget'
import HiddenSnakeButton from '@/app/components/snake-game'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

function Typewriter({
  lines,
  onDone,
  cps = 40,
}: {
  lines: string[]
  onDone?: () => void
  cps?: number
}) {
  // Build the complete text output
  const fullText = useMemo(() => {
    return lines.join('\n')
  }, [lines])

  const [displayText, setDisplayText] = useState('')
  const [showCursor, setShowCursor] = useState(true)
  const [isComplete, setIsComplete] = useState(false)
  const indexRef = useRef(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Typewriter effect
  useEffect(() => {
    if (!fullText || isComplete) {
      return
    }

    const msPerChar = 1000 / cps
    indexRef.current = 0
    setDisplayText('')

    const typeNextChar = () => {
      if (indexRef.current < fullText.length) {
        setDisplayText(fullText.substring(0, indexRef.current + 1))
        indexRef.current++
      } else {
        // Typing complete
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
        setIsComplete(true)
        setTimeout(() => onDone?.(), 100)
      }
    }

    // Start typing
    intervalRef.current = setInterval(typeNextChar, msPerChar)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [fullText, cps, isComplete]) // Added isComplete to prevent re-runs

  // Cursor blink
  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev)
    }, 500)
    return () => clearInterval(cursorInterval)
  }, [])

  return (
    <div>
      <pre className="whitespace-pre-wrap font-mono">
        {displayText}
        <span className={`inline-block w-[8px] ${showCursor ? 'opacity-100' : 'opacity-0'}`}>
          ▌
        </span>
      </pre>
    </div>
  )
}

export default function SplashPage() {
  const [ready, setReady] = useState(false)
  const [showSite, setShowSite] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [clickCount, setClickCount] = useState(0)
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
    // Check if splash was seen before
    try {
      if (typeof window !== 'undefined' && sessionStorage.getItem('splashSeen') === 'true') {
        setShowSite(true)
      }
    } catch (e) {
      console.error('Session storage error:', e)
    }
  }, [])

  // Handle triple-click on profile picture
  const handleProfileClick = () => {
    // Clear any existing timeout
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current)
    }

    // Increment click count
    const newClickCount = clickCount + 1
    setClickCount(newClickCount)

    // Check if we've reached 3 clicks
    if (newClickCount === 3) {
      // Triple-click detected! Navigate to gym form
      window.location.href = '/demos/gym-dashboard/form'
      // Or if you prefer using Next.js router:
      // router.push('/demos/gym-dashboard/form')
      setClickCount(0)
    } else {
      // Reset click count after 500ms if no more clicks
      clickTimeoutRef.current = setTimeout(() => {
        setClickCount(0)
      }, 500)
    }
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current)
      }
    }
  }, [])

  if (!mounted) {
    return <div className="min-h-screen bg-black" />
  }

  const proceedHome = () => {
    try {
      sessionStorage.setItem('splashSeen', 'true')
    } catch (e) {
      console.error('Session storage error:', e)
    }
    setShowSite(true)
  }

  const lines = [
    '>>> import data-with-dillon as dwd',
    '',
    ">>> print('enjoy my portfolio website - much love')",
    '',
    ">>> print('dillon shearer')",
    ''
  ]

  if (showSite) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="max-w-7xl mx-auto px-6 pt-10 pb-16">
          {/* Header Section */}
          <div className="text-center mb-16">
            <div className="flex flex-col items-center mb-8">
              <div className="h-40 w-40 mt-2 mb-6">
                <Image
                  src="/ds.jpg"
                  alt="Dillon Shearer"
                  width={160}
                  height={160}
                  priority
                  className="w-40 h-40 rounded-full select-none"
                  draggable={false}
                  onClick={handleProfileClick}
                  style={{ userSelect: 'none' }}
                />
              </div>
              {/* Title (mobile + desktop reserved heights to avoid shifts) */}
              <div className="mt-4 mb-4 w-full">
                <div className="sm:hidden h-[44px] relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <h1 className="text-2xl font-bold leading-tight text-center">
                      Dillon Shearer | Data Science &amp; Analytics
                    </h1>
                  </div>
                </div>
                <div className="hidden sm:block h-[56px] relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <h1 className="text-4xl font-bold whitespace-nowrap">
                      Dillon Shearer | Data Science &amp; Analytics
                    </h1>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-4xl mx-auto">
            <div>
              {/* About Me Section */}
              <div className="mb-8">
                <h2 className="text-lg font-medium">About Me:</h2>
                <p className="mb-4">
                  I am a dedicated data science and analytics professional focused on healthcare. I leverage advanced statistical techniques, machine learning, and data visualization to extract meaningful insights from complex health data. My goal is to transform raw data into strategic decisions that improve patient outcomes and optimize healthcare operations.
                </p>
              </div>

              {/* Skills & Technologies */}
              <div className="mb-8">
                <h2 className="text-lg font-medium">Skills &amp; Technologies:</h2>
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
                    <p className="font-semibold">Database &amp; Integration:</p>
                    <ul className="list-disc ml-5">
                      <li>MySQL</li>
                      <li>PostgreSQL</li>
                      <li>SnowSQL</li>
                      <li>ETL Processes</li>
                      <li>Relational &amp; Graph DBs</li>
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
                    <p className="font-semibold">Standards &amp; Formats:</p>
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
            </div>

            {/* GitHub Widget */}
            <GitHubWidget />

            {/* Hidden Snake Game Easter Egg */}
            <div className="mt-6">
              <HiddenSnakeButton />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black text-white flex items-center justify-center">
      <div className="w-full max-w-2xl mx-6 rounded-2xl border border-white/10 bg-black/70 shadow-2xl">
        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
          <span className="inline-block w-3 h-3 rounded-full bg-red-500/80" />
          <span className="inline-block w-3 h-3 rounded-full bg-yellow-500/80" />
          <span className="inline-block w-3 h-3 rounded-full bg-green-500/80" />
          <span className="ml-3 text-sm text-white/70 font-mono">python</span>
        </div>
        
        {/* Terminal body */}
        <div className="px-6 py-8">
          <Typewriter
            lines={lines}
            cps={35}
            onDone={() => setReady(true)}
          />
          
          {/* Show button after typing completes */}
          {ready && (
            <div className="mt-6 animate-fadeIn">
              <pre className="whitespace-pre-wrap font-mono text-emerald-400 mb-4">
                {'>>> '}proceed?
              </pre>
              <button
                onClick={proceedHome}
                className="w-full px-4 py-3 rounded-lg border border-white/20 bg-white/5 text-white font-mono hover:bg-white/10 transition-all duration-200"
              >
                {'>>> '}enter
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}