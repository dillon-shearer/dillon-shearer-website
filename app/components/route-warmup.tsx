'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

const dashboardRoutes = [
  '/demos',
  '/demos/data-access-portal',
  '/demos/data-access-portal/admin',
  '/demos/gym-dashboard',
  '/koreader-remote',
]

let warmed = false
const isProduction = process.env.NODE_ENV === 'production'

export default function RouteWarmup() {
  if (!isProduction) return null

  const router = useRouter()
  const warmedRef = useRef(false)

  useEffect(() => {
    if (warmed || warmedRef.current) return
    warmed = true
    warmedRef.current = true

    dashboardRoutes.forEach(path => {
      try {
        router.prefetch(path)
      } catch (err) {
        console.error('Warmup prefetch failed', err)
      }
    })
  }, [router])

  return null
}
