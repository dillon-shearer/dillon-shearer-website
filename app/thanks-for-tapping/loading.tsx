export default function Loading() {
  return (
    <div className="bg-black text-white">
      <article
        className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-5 pb-12 pt-8 animate-pulse"
        style={{
          paddingTop: 'max(2rem, env(safe-area-inset-top))',
          paddingBottom: 'max(3rem, env(safe-area-inset-bottom))',
        }}
      >
        {/* Header Skeleton */}
        <section className="text-center">
          <div className="mx-auto h-10 w-64 rounded-lg bg-white/10"></div>
          <div className="mx-auto mt-3 h-12 w-full max-w-md rounded-lg bg-white/10"></div>

          {/* Quick Facts Skeleton */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="mx-auto h-3 w-16 rounded bg-white/10"></div>
              <div className="mx-auto mt-2 h-4 w-32 rounded bg-white/10"></div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="mx-auto h-3 w-16 rounded bg-white/10"></div>
              <div className="mx-auto mt-2 h-4 w-32 rounded bg-white/10"></div>
            </div>
            <div className="col-span-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="mx-auto h-3 w-16 rounded bg-white/10"></div>
              <div className="mx-auto mt-2 h-4 w-24 rounded bg-white/10"></div>
            </div>
          </div>
        </section>

        {/* Contact Options Skeleton */}
        <section>
          <div className="mx-auto mb-5 h-3 w-40 rounded bg-white/10"></div>
          <div className="grid gap-4">
            {[1, 2, 3, 4].map(i => (
              <div
                key={i}
                className="flex min-h-[140px] flex-col rounded-xl border border-white/10 bg-white/5 p-5"
              >
                <div className="mx-auto h-6 w-32 rounded bg-white/10"></div>
                <div className="mx-auto mt-2 h-10 w-48 rounded bg-white/10"></div>
                <div className="mx-auto mt-4 h-9 w-28 rounded-lg bg-white/10"></div>
              </div>
            ))}
          </div>
        </section>

        {/* Additional Resources Skeleton */}
        <section className="rounded-xl border border-white/10 bg-white/5 p-5">
          <div className="mx-auto mb-4 h-3 w-40 rounded bg-white/10"></div>
          <div className="grid gap-3">
            {[1, 2].map(i => (
              <div key={i} className="rounded-xl border border-white/10 bg-transparent px-4 py-3.5">
                <div className="mx-auto h-5 w-32 rounded bg-white/10"></div>
                <div className="mx-auto mt-1 h-4 w-48 rounded bg-white/10"></div>
              </div>
            ))}
          </div>
        </section>
      </article>
    </div>
  )
}
