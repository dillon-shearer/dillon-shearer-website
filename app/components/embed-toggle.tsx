'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

const HIDE_CHROME_ROUTES = ['/koreader-remote']

export default function EmbedToggle() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const isEmbed = searchParams.get('embed') === '1'
  const isChromeHiddenRoute = HIDE_CHROME_ROUTES.some((route) => {
    if (!pathname) return false
    return pathname === route || pathname.startsWith(`${route}/`)
  })
  const shouldHideChrome = isEmbed || isChromeHiddenRoute

  useEffect(() => {
    if (shouldHideChrome) {
      document.body.dataset.embedPreview = 'true'
    } else {
      delete document.body.dataset.embedPreview
    }
  }, [shouldHideChrome])

  return null
}
