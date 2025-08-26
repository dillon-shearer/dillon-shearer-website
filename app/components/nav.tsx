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

  const entries = Object.entries(navItems)

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
              {entries.map(([path, { name }]) => (
                <Link
                  key={path}
                  href={path}
                  className="transition-all hover:text-neutral-800 dark:hover:text-neutral-200 flex align-middle relative py-1 px-2 m-1 text-sm md:text-base"
                >
                  {name}
                </Link>
              ))}
            </div>
          </nav>

          {/* Mobile Navigation */}
          <div className="md:hidden">
            {/* Animated Hamburger/X Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="relative mx-auto block w-10 h-10 group focus:outline-none"
              aria-label="Toggle menu"
            >
              {/* Top line */}
              <span
                className={`
                  block absolute left-1/2 -translate-x-1/2 h-0.5 w-6 bg-current transform transition-all duration-300 ease-in-out
                  ${mobileMenuOpen ? 'rotate-45 translate-y-0' : '-translate-y-2'}
                `}
              />
              
              {/* Middle line */}
              <span
                className={`
                  block absolute left-1/2 -translate-x-1/2 h-0.5 w-6 bg-current transform transition-all duration-300 ease-in-out
                  ${mobileMenuOpen ? 'opacity-0 scale-0' : 'opacity-100 scale-100'}
                `}
              />
              
              {/* Bottom line */}
              <span
                className={`
                  block absolute left-1/2 -translate-x-1/2 h-0.5 w-6 bg-current transform transition-all duration-300 ease-in-out
                  ${mobileMenuOpen ? '-rotate-45 translate-y-0' : 'translate-y-2'}
                `}
              />

              {/* Subtle hover effect circle */}
              <div className="absolute inset-0 rounded-full bg-gray-200 dark:bg-gray-700 scale-0 group-hover:scale-100 transition-transform duration-200 ease-out -z-10 opacity-20" />
            </button>

            {/* Mobile Menu with slide animation */}
            <div
              className={`
                relative overflow-hidden transition-all duration-300 ease-in-out mx-auto w-full max-w-md
                rounded-lg border border-gray-200 dark:border-gray-700
                ring-1 ring-blue-200/60 dark:ring-blue-500/30
                ${mobileMenuOpen ? 'max-h-80 opacity-100 mt-4' : 'max-h-0 opacity-0 mt-0'}
              `}
            >
              {/* Keep content borderless so outline isn't clipped */}
              <nav className="py-4 bg-white dark:bg-black shadow-lg backdrop-blur-sm">
                <div className="flex flex-col space-y-1">
                  {entries.map(([path, { name }], index) => (
                    <Link
                      key={path}
                      href={path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`
                        transition-all hover:text-neutral-800 dark:hover:text-neutral-200 
                        hover:bg-gray-50 dark:hover:bg-gray-800 px-4 py-3 text-base
                        transform transition-all duration-300
                        ${mobileMenuOpen ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'}
                        ${index === entries.length - 1 ? 'mb-2' : ''}  /* extra bottom buffer for Contact */
                      `}
                      style={{
                        transitionDelay: mobileMenuOpen ? `${index * 50}ms` : '0ms'
                      }}
                    >
                      {name}
                    </Link>
                  ))}
                </div>
              </nav>
            </div>
          </div>
        </div>
      </aside>
    </div>
  )
}
