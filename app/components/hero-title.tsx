'use client'

export default function HeroTitle() {
  const title = "Data With Dillon"
  const subtitle = "Data Engineer · Data Analyst · Full-Stack Python Developer"

  return (
    <div className="relative inline-flex flex-col items-center w-full max-w-3xl mx-auto py-4">
      <h1
        className="text-4xl sm:text-5xl font-bold leading-tight tracking-tight text-white transition-all duration-300 hover:text-[#54b3d6] cursor-default"
        style={{
          animation: 'scroll-reveal 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        }}
      >
        Dillon Shearer
      </h1>

      <div className="hero-title" data-replace={title} aria-label={title}>
        <span style={{ display: 'inline-flex' }}>
          {title.split('').map((char, index) => (
            <span
              key={index}
              style={{
                opacity: 0,
                animation: `char-reveal 0.4s cubic-bezier(0.4, 0, 0.2, 1) ${index * 0.03}s forwards`,
                display: 'inline-block',
                whiteSpace: char === ' ' ? 'pre' : 'normal',
              }}
            >
              {char}
            </span>
          ))}
        </span>
      </div>

      <p
        className="mt-3 text-sm text-white/40 tracking-wide"
        style={{
          opacity: 0,
          animation: 'scroll-reveal 0.8s cubic-bezier(0.4, 0, 0.2, 1) 0.3s forwards',
        }}
      >
        {subtitle}
      </p>
    </div>
  )
}
