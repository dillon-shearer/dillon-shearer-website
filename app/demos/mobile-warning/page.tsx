'use client'

import { useState } from 'react'
import Typewriter from '@/app/components/Typewriter'

export default function MobileWarningPage() {
  const [ready, setReady] = useState(false)

  const lines = [
    '>>> print("my dashboards arent optimized for mobile")',
    '',
    '>>> print("sorry about that - dillon")',
  ]

  return (
    <main className="fixed inset-0 bg-black text-white flex items-center justify-center">
      <div className="w-full max-w-md mx-6 rounded-2xl border border-white/10 bg-black/70 shadow-2xl">
        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
          <span className="inline-block w-3 h-3 rounded-full bg-red-500/80" />
          <span className="inline-block w-3 h-3 rounded-full bg-yellow-500/80" />
          <span className="inline-block w-3 h-3 rounded-full bg-green-500/80" />
          <span className="ml-3 text-sm text-white/70 font-mono">python</span>
        </div>

        {/* Terminal body */}
        <div className="px-6 py-8">
          <Typewriter lines={lines} cps={35} onDone={() => setReady(true)} />

          {ready && (
            <div className="mt-6">
              <pre className="whitespace-pre-wrap font-mono text-emerald-400 mb-4">
                {'>>> '}proceed?
              </pre>
              <a
                href="/"
                className="block w-full px-4 py-3 rounded-lg border border-white/20 bg-white/5 text-white font-mono text-center hover:bg-white/10 transition-all duration-200"
              >
                {'>>> '}home
              </a>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
