import Link from 'next/link'

const navItems = {
  '/': {
    name: 'Home',
  },
  '/about': {
    name: 'About Me',
  },
  '/blog': {
    name: 'Blog',
  },
  '/demos': {
    name: 'Demos',
  },
  '/contact': {
    name: 'Contact',
  },
}

export function Navbar() {
  return (
    <div className="max-w-7xl mx-auto px-6">
      <aside className="mb-8 tracking-tight text-center">
        <div className="lg:sticky lg:top-20">
          <nav
            className="flex flex-row items-center justify-center relative px-0 pb-0 fade"
            id="nav"
          >
            <div className="flex flex-row space-x-0 justify-center w-full">
              {Object.entries(navItems).map(([path, { name }]) => {
                return (
                  <Link
                    key={path}
                    href={path}
                    className="transition-all hover:text-neutral-800 dark:hover:text-neutral-200 flex align-middle relative py-1 px-2 m-1 text-sm md:text-base"
                  >
                    {name}
                  </Link>
                )
              })}
            </div>
          </nav>
        </div>
      </aside>
    </div>
  )
}