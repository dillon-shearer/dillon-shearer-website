'use client'

type ErrorProps = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function NFCHandshakeError({ error, reset }: ErrorProps) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-6 text-center text-white">
      <p className="text-xs uppercase tracking-[0.4em] text-white/50">NFC landing</p>
      <h1 className="mt-3 text-3xl font-semibold">That tap didn&apos;t load correctly.</h1>
      <p className="mt-4 text-white/70">
        {error.message || 'An unexpected error occurred.'} Refresh to retry, or email
        {' '}
        <a href="mailto:dillon@datawithdillon.com" className="underline">
          dillon@datawithdillon.com
        </a>
        {' '}
        and I’ll get you the right link.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-8 inline-flex min-h-[48px] items-center justify-center rounded-2xl border border-white/20 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        Try again
      </button>
    </div>
  )
}
