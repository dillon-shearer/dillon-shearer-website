'use client'

import { useEffect, useRef, useState } from 'react'

interface MagneticStyle {
  transform: string
}

export function useMagneticHover(strength: number = 0.3) {
  const ref = useRef<HTMLElement>(null)
  const [style, setStyle] = useState<MagneticStyle>({ transform: 'translate(0px, 0px)' })

  useEffect(() => {
    const element = ref.current
    if (!element) return

    // Check for prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) {
      return
    }

    const handleMouseMove = (e: MouseEvent) => {
      const rect = element.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2

      const deltaX = (e.clientX - centerX) * strength
      const deltaY = (e.clientY - centerY) * strength

      setStyle({ transform: `translate(${deltaX}px, ${deltaY}px)` })
    }

    const handleMouseLeave = () => {
      setStyle({ transform: 'translate(0px, 0px)' })
    }

    element.addEventListener('mousemove', handleMouseMove)
    element.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      element.removeEventListener('mousemove', handleMouseMove)
      element.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [strength])

  return { ref, style }
}
