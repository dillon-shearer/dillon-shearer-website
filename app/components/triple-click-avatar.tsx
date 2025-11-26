'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  redirectPath: string
  className?: string
}

export default function TripleClickAvatar({ redirectPath, className }: Props) {
  const router = useRouter()
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [clickCount, setClickCount] = useState(0)

  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current)
      }
    }
  }, [])

  const handleClick = () => {
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current)
    }
    const newCount = clickCount + 1
    setClickCount(newCount)

    if (newCount === 3) {
      router.push(redirectPath)
      setClickCount(0)
    } else {
      clickTimeoutRef.current = setTimeout(() => {
        setClickCount(0)
      }, 500)
    }
  }

  return (
    <Image
      src="/ds.jpg"
      alt="Dillon Shearer"
      width={160}
      height={160}
      priority
      className={className ? `${className} cursor-default` : 'cursor-default'}
      draggable={false}
      style={{ userSelect: 'none', cursor: 'default' }}
      onClick={handleClick}
    />
  )
}
