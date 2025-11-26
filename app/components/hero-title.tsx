export default function HeroTitle() {
  return (
    <div className="relative inline-flex flex-col items-center w-full max-w-3xl mx-auto py-4">
      <h1 className="text-4xl sm:text-5xl font-bold leading-tight tracking-tight text-white">
        Dillon Shearer
      </h1>
      <div className="hero-title" data-replace="Data With Dillon" aria-label="Data With Dillon">
        <span>Data With Dillon</span>
      </div>
    </div>
  )
}
