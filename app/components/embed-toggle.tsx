'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export default function EmbedToggle() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const isEmbed = searchParams.get('embed') === '1'

  useEffect(() => {
    if (isEmbed) {
      document.body.dataset.embedPreview = 'true'
    } else {
      delete document.body.dataset.embedPreview
    }
  }, [isEmbed, pathname])

  return null
}
