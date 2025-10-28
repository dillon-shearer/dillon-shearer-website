'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

export default function Typewriter({
  lines,
  onDone,
  cps = 40,
}: {
  lines: string[]
  onDone?: () => void
  cps?: number
}) {
  const fullText = useMemo(() => lines.join('\n'), [lines])
  const [displayText, setDisplayText] = useState('')
  const [showCursor, setShowCursor] = useState(true)
  const [isComplete, setIsComplete] = useState(false)
  const indexRef = useRef(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!fullText || isComplete) return
    const msPerChar = 1000 / cps
    indexRef.current = 0
    setDisplayText('')
    intervalRef.current = setInterval(() => {
      if (indexRef.current < fullText.length) {
        setDisplayText(fullText.substring(0, indexRef.current + 1))
        indexRef.current++
      } else {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
        setIsComplete(true)
        setTimeout(() => onDone?.(), 100)
      }
    }, msPerChar)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [fullText, cps, isComplete])

  useEffect(() => {
    const cursorInterval = setInterval(() => setShowCursor(prev => !prev), 500)
    return () => clearInterval(cursorInterval)
  }, [])

  return (
    <div>
      <pre className="whitespace-pre-wrap font-mono">
        {displayText}
        <span className={`inline-block w-[8px] ${showCursor ? 'opacity-100' : 'opacity-0'}`}>▌</span>
      </pre>
    </div>
  )
}
