'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import DemoCard from './demo-card'
import { Demo } from '@/types/demo'

interface DemoGridProps {
  demos: Demo[]
}

export default function DemoGrid({ demos }: DemoGridProps) {
  const [activeSlug, setActiveSlug] = useState<string | null>(null)
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const handleToggle = (slug: string) => {
    setActiveSlug((prev) => (prev === slug ? null : slug))
  }

  const orderedDemos = useMemo(() => {
    if (!activeSlug) return demos
    const activeDemo = demos.find((demo) => demo.slug === activeSlug)
    const rest = demos.filter((demo) => demo.slug !== activeSlug)
    return activeDemo ? [activeDemo, ...rest] : demos
  }, [demos, activeSlug])

  useEffect(() => {
    if (activeSlug && cardRefs.current[activeSlug]) {
      cardRefs.current[activeSlug]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [activeSlug])

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8 xl:grid-cols-3">
      {orderedDemos.map((demo) => {
        const isExpanded = activeSlug === demo.slug
        return (
          <div
            key={demo.slug}
            ref={(node) => {
              cardRefs.current[demo.slug] = node
            }}
            className={`${isExpanded ? 'col-span-full' : ''}`}
          >
            <DemoCard demo={demo} isExpanded={isExpanded} onToggle={() => handleToggle(demo.slug)} />
          </div>
        )
      })}
    </div>
  )
}
