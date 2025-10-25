// app/demos/mobile-warning/page.tsx
export default function MobileWarningPage() {
  return (
    <main className="fixed inset-0 z-[9999] bg-black text-white">
      <section className="min-h-dvh flex flex-col items-center justify-center text-center px-6">
        {/* Signature Warning Glyph */}
        <div className="relative mb-8" aria-hidden="true">
          {/* Soft aura */}
          <div className="absolute inset-0 blur-2xl opacity-30 rounded-full bg-white/10 animate-pulse" />
          {/* SVG */}
          <svg
            width="112"
            height="112"
            viewBox="0 0 112 112"
            className="relative drop-shadow-[0_0_12px_rgba(255,255,255,0.2)]"
          >
            {/* Outer subtle ring */}
            <circle cx="56" cy="56" r="50" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
            {/* Rotating segmented arc */}
            <g className="origin-center animate-rotate-slow">
              <circle
                cx="56"
                cy="56"
                r="40"
                fill="none"
                stroke="rgba(255,255,255,0.45)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="60 45"
                pathLength="100"
              />
            </g>
            {/* Core hex (stable, engineered vibe) */}
            <path
              d="M56 34l16 9.25v18.5L56 71l-16-9.25v-18.5L56 34z"
              fill="none"
              stroke="white"
              strokeOpacity="0.9"
              strokeWidth="2.5"
            />
            {/* Inner pulse */}
            <circle cx="56" cy="56" r="6.5" className="fill-white/90 animate-ping-soft" />
            {/* Orbiting node */}
            <g className="origin-center animate-orbit">
              <circle cx="56" cy="16" r="4" className="fill-white" />
            </g>
          </svg>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight mb-3">
          Dashboards not designed for mobile
        </h1>
        <p className="text-base opacity-80 max-w-md">
          For the best experience, please view this demo on a desktop or larger screen.
        </p>

        {/* Actions */}
        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <a
            href="/demos/gym-dashboard/form"
            className="inline-flex items-center justify-center rounded-lg px-5 py-3 bg-white text-black font-medium hover:bg-neutral-200 transition"
          >
            Open mobile data-entry form
          </a>
          <a
            href="/demos"
            className="inline-flex items-center justify-center rounded-lg px-5 py-3 border border-white/30 hover:border-white/60 transition"
          >
            Back to demos
          </a>
        </div>

        <p className="mt-10 text-xs opacity-50">© {new Date().getFullYear()} Data With Dillon</p>
      </section>

      {/* Local keyframes (no Tailwind config needed) */}
      <style jsx>{`
        @keyframes rotate-slow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes orbit {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes ping-soft {
          0% { transform: scale(1); opacity: 0.9; }
          70% { transform: scale(1.6); opacity: 0; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        .animate-rotate-slow { animation: rotate-slow 7s linear infinite; }
        .animate-orbit { animation: orbit 4.6s linear infinite; }
        .animate-ping-soft { animation: ping-soft 2.2s ease-out infinite; transform-origin: center; }
      `}</style>
    </main>
  )
}
