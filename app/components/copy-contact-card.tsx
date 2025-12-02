'use client'

import { useState } from 'react'

type CopyContactCardProps = {
  label: string
  helper: string
  value: string
  displayValue?: string
  analyticsId?: string
}

export function CopyContactCard({
  label,
  helper,
  value,
  displayValue,
  analyticsId,
}: CopyContactCardProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt('Copy this number', value)
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      data-analytics-id={analyticsId}
      className="group w-full rounded-2xl border border-white/10 bg-transparent px-4 py-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-white/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    >
      <div className="flex items-center justify-between">
        <span className="text-base font-semibold">
          {copied ? 'Number copied' : label}
        </span>
        <span
          aria-hidden
          className="text-lg transition-transform duration-200 group-hover:translate-x-1"
        >
          {copied ? '✓' : '⧉'}
        </span>
      </div>
      <p className="mt-1 text-sm text-white/70">{helper}</p>
      <p className="mt-2 font-mono text-sm text-white/90">
        {displayValue ?? value}
      </p>
    </button>
  )
}
