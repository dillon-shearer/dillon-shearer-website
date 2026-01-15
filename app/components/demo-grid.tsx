'use client'

import { useState } from 'react'
import DemoCard from './demo-card'
import DemoModal from './demo-modal'
import { Demo } from '@/types/demo'

interface DemoGridProps {
  demos: Demo[]
}

export default function DemoGrid({ demos }: DemoGridProps) {
  const [selectedDemo, setSelectedDemo] = useState<Demo | null>(null)

  return (
    <>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8 xl:grid-cols-3">
        {demos.map((demo, index) => (
          <DemoCard
            key={demo.slug}
            demo={demo}
            onSeeMore={() => setSelectedDemo(demo)}
            index={index}
          />
        ))}
      </div>

      {selectedDemo && (
        <DemoModal
          demo={selectedDemo}
          onClose={() => setSelectedDemo(null)}
        />
      )}
    </>
  )
}
