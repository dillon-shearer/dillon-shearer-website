'use client'

import { useState } from 'react'

interface Card {
  label: string
  title: string
  subtitle?: string
  description: string
  skills: string[]
  accentColor?: string
}

interface AnimatedCardStackProps {
  cards: Card[]
}

export default function AnimatedCardStack({ cards }: AnimatedCardStackProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  return (
    <div className="relative space-y-3">
      {cards.map((card, index) => {
        const isHovered = hoveredIndex === index
        const isOther = hoveredIndex !== null && hoveredIndex !== index
        const accentColor = card.accentColor || '#54b3d6'

        // Calculate z-index and transforms
        const zIndex = isHovered ? 50 : cards.length - index
        const scale = isHovered ? 1.02 : isOther ? 0.98 : 1
        const translateY = isHovered ? -4 : isOther ? 2 : 0

        return (
          <div
            key={index}
            className="relative group"
            style={{
              zIndex,
              opacity: 0,
              animation: `card-stack-enter 0.6s cubic-bezier(0.4, 0, 0.2, 1) ${index * 0.1}s forwards`,
            }}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <div
              className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-6 lg:p-8 transition-all duration-300 ease-smooth"
              style={{
                transform: `scale(${scale}) translateY(${translateY}px)`,
                willChange: isHovered || isOther ? 'transform' : 'auto',
                boxShadow: isHovered
                  ? `8px 8px 0px ${accentColor}33`
                  : `4px 4px 0px ${accentColor}22`,
                borderColor: isHovered ? `${accentColor}40` : 'rgba(255, 255, 255, 0.1)',
              }}
            >
              {/* Accent glow orb for featured cards */}
              {index === 0 && (
                <div
                  className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl opacity-50 group-hover:opacity-70 transition-opacity duration-500 pointer-events-none"
                  style={{ backgroundColor: `${accentColor}33` }}
                />
              )}

              <div className="relative z-10">
                <p
                  className="text-xs uppercase tracking-[0.3em] font-medium"
                  style={{ color: index === 0 ? accentColor : 'rgba(255, 255, 255, 0.5)' }}
                >
                  {card.label}
                </p>

                <h3 className="mt-2 text-2xl lg:text-3xl font-semibold text-white">
                  {card.title}
                </h3>

                {card.subtitle && (
                  <p className="mt-1 text-sm text-white/50">{card.subtitle}</p>
                )}

                <p className="mt-3 text-base text-white/80 leading-relaxed">
                  {card.description}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {card.skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-3 py-1.5 text-xs font-medium bg-white/5 text-white/60 rounded-full border border-white/5 transition-all duration-200 hover:bg-white/10 hover:text-white/80 hover:border-white/10"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
