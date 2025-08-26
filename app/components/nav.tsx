'use client'

import Link from 'next/link'
import { useState } from 'react'

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
  '/jupyter': {
    name: 'Notebooks',
  },
  '/contact': {
    name: 'Contact',
  },
}

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="max-w-7xl mx-auto px-6">
      <aside className="mb-8 tracking-tight text-center">
        <div className="lg:sticky lg:top-20">
          {/* Desktop Navigation */}
          <nav
            className="hidden md:flex flex-row items-center justify-center relative px-0 pb-0 fade"
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

          {/* Mobile Navigation */}
          <div className="md:hidden">
            {/* Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex flex-col items-center justify-center w-8 h-8 space-y-1"
              aria-label="Toggle menu"
            >
              <span className={`w-6 h-0.5 bg-current transition-all duration-300 ${mobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`} />
              <span className={`w-6 h-0.5 bg-current transition-all duration-300 ${mobileMenuOpen ? 'opacity-0' : ''}`} />
              <span className={`w-6 h-0.5 bg-current transition-all duration-300 ${mobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
            </button>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
              <nav className="mt-4 py-4 bg-white dark:bg-black border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                <div className="flex flex-col space-y-1">
                  {Object.entries(navItems).map(([path, { name }]) => {
                    return (
                      <Link
                        key={path}
                        href={path}
                        onClick={() => setMobileMenuOpen(false)}
                        className="transition-all hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-gray-50 dark:hover:bg-gray-800 px-4 py-3 text-base"
                      >
                        {name}
                      </Link>
                    )
                  })}
                </div>
              </nav>
            )}
          </div>
        </div>
      </aside>
    </div>
  )
}