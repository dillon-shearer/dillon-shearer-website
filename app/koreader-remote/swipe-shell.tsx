'use client'

import { useRef } from 'react'
import { KoreaderRemotePanel } from './remote-panel'

export function SwipeShell() {
  const swipeRef = useRef<{ startX: number; width: number } | null>(null)

  function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    if (!event.touches[0]) return
    swipeRef.current = {
      startX: event.touches[0].clientX,
      width: event.currentTarget.clientWidth,
    }
  }

  function handleTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    const swipe = swipeRef.current
    swipeRef.current = null
    if (!swipe || !event.changedTouches[0]) return
    const deltaX = event.changedTouches[0].clientX - swipe.startX
    if (Math.abs(deltaX) < 40) return
    const startArea = swipe.startX < swipe.width / 2 ? 'left' : 'right'
    const action =
      startArea === 'left' && deltaX > 0 ? 'prev' : startArea === 'right' && deltaX < 0 ? 'next' : null
    if (!action) return
    document.dispatchEvent(new CustomEvent('koreader-swipe', { detail: { action } }))
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black px-4 text-white overscroll-none touch-pan-y"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="w-full max-w-4xl">
        <KoreaderRemotePanel />
      </div>
    </div>
  )
}
