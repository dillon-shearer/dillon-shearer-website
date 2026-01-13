'use client'

import { useState } from 'react'

type CopyContactCardProps = {
  label: string
  helper: string
  value: string
  displayValue?: string
  analyticsId?: string
  variant?: 'default' | 'inline'
}

export function CopyContactCard({
  label,
  helper,
  value,
  displayValue,
  analyticsId,
  variant = 'default',
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

  // Inline variant - simpler, no phone display
  if (variant === 'inline') {
    return (
      <button
        type="button"
        onClick={handleCopy}
        data-analytics-id={analyticsId}
        className={`group w-full rounded-xl px-4 py-2.5 text-center text-sm font-medium transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
          copied
            ? 'border-green-500/30 bg-green-500/10 text-green-300'
            : 'border-white/20 bg-white/10 hover:bg-white/15 hover:border-white/30'
        }`}
      >
        <span>{copied ? '✓ Copied' : label}</span>
      </button>
    )
  }

  // Default variant - full card with phone number
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
