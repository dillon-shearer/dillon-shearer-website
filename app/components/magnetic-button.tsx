'use client'

import { useMagneticHover } from './hooks/useMagneticHover'

interface MagneticButtonProps {
  href: string
  className?: string
  children: React.ReactNode
}

export default function MagneticButton({ href, className, children }: MagneticButtonProps) {
  const { ref, style } = useMagneticHover(0.3)

  return (
    <a
      ref={ref as React.RefObject<HTMLAnchorElement>}
      href={href}
      className={`${className} magnetic`}
      style={style}
    >
      {children}
    </a>
  )
}
