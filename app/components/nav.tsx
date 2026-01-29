'use client'

import Link from 'next/link'
import { useState, useRef } from 'react'

interface NavItem {
  path: string
  name: string
  children?: { path: string; name: string }[]
}

const navItems: NavItem[] = [
  { path: '/', name: 'Home' },
  { path: '/resumes', name: 'Resumes' },
  { path: '/about', name: 'About' },
  {
    path: '/demos',
    name: 'Demos',
    children: [
      { path: '/demos', name: 'Demos' },
      { path: '/jupyter', name: 'Notebooks' },
    ],
  },
  { path: '/blog', name: 'Blog' },
  { path: '/contact', name: 'Contact' },
]

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileSubmenuOpen, setMobileSubmenuOpen] = useState(false)
  const dropdownTimeout = useRef<NodeJS.Timeout | null>(null)
  const [desktopDropdownOpen, setDesktopDropdownOpen] = useState(false)

  function handleDropdownEnter() {
    if (dropdownTimeout.current) clearTimeout(dropdownTimeout.current)
    setDesktopDropdownOpen(true)
  }

  function handleDropdownLeave() {
    dropdownTimeout.current = setTimeout(() => setDesktopDropdownOpen(false), 150)
  }

  return (
    <div className="max-w-7xl mx-auto px-6">
      <aside className="mb-1 tracking-tight text-center">
        <div className="lg:sticky lg:top-20">
          {/* Desktop Navigation */}
          <nav
            className="hidden md:flex flex-row items-center justify-center relative px-0 pb-0 fade"
            id="nav"
          >
            <div className="flex flex-row space-x-0 justify-center w-full">
              {navItems.map((item) =>
                item.children ? (
                  <div
                    key={item.path}
                    className="relative"
                    onMouseEnter={handleDropdownEnter}
                    onMouseLeave={handleDropdownLeave}
                  >
                    <Link
                      href={item.path}
                      className="transition-all hover:text-neutral-800 dark:hover:text-neutral-200 flex align-middle relative py-1 px-2 m-1 text-sm md:text-base"
                    >
                      {item.name}
                      <svg
                        className={`ml-1 w-3 h-3 mt-1.5 transition-transform duration-200 ${desktopDropdownOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </Link>
                    <div
                      className={`absolute top-full left-1/2 -translate-x-1/2 mt-1 py-2 w-40 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg transition-all duration-200 z-50 ${
                        desktopDropdownOpen
                          ? 'opacity-100 translate-y-0 pointer-events-auto'
                          : 'opacity-0 -translate-y-1 pointer-events-none'
                      }`}
                    >
                      {item.children.map((child) => (
                        <Link
                          key={child.path}
                          href={child.path}
                          className="block px-4 py-2 text-sm text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          {child.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Link
                    key={item.path}
                    href={item.path}
                    className="transition-all hover:text-neutral-800 dark:hover:text-neutral-200 flex align-middle relative py-1 px-2 m-1 text-sm md:text-base"
                  >
                    {item.name}
                  </Link>
                )
              )}
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
                relative overflow-hidden transition-all duration-300 ease-in-out mx-auto w-fit max-w-full
                rounded-2xl border border-gray-200 dark:border-gray-700
                ring-1 ring-blue-200/60 dark:ring-blue-500/30 px-2
                ${mobileMenuOpen ? 'max-h-[90vh] opacity-100 mt-6' : 'max-h-0 opacity-0 mt-0'}
              `}
            >
              {/* Even top/bottom spacing via spacers */}
              <nav className="inline-flex flex-col items-center px-2">
                <div className="flex flex-col items-center">
                  {/* Equal top spacer */}
                  <div className="h-6" />

                  {/* Menu items */}
                  <div className="flex flex-col space-y-4">
                    {navItems.map((item, index) =>
                      item.children ? (
                        <div key={item.path} className="flex flex-col items-center">
                          <button
                            onClick={() => setMobileSubmenuOpen(!mobileSubmenuOpen)}
                            className={`
                              transition-all hover:text-neutral-800 dark:hover:text-neutral-200
                              hover:bg-gray-50 dark:hover:bg-gray-800 px-6 py-2.5 text-base text-center rounded-full
                              transform transition-all duration-300 inline-flex items-center justify-center gap-1
                              ${mobileMenuOpen ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'}
                            `}
                            style={{ transitionDelay: mobileMenuOpen ? `${index * 50}ms` : '0ms' }}
                          >
                            {item.name}
                            <svg
                              className={`w-3 h-3 transition-transform duration-200 ${mobileSubmenuOpen ? 'rotate-180' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          <div
                            className={`overflow-hidden transition-all duration-200 ${
                              mobileSubmenuOpen ? 'max-h-40 opacity-100 mt-2' : 'max-h-0 opacity-0 mt-0'
                            }`}
                          >
                            <div className="flex flex-col space-y-2 pl-4">
                              {item.children.map((child) => (
                                <Link
                                  key={child.path}
                                  href={child.path}
                                  onClick={() => {
                                    setMobileMenuOpen(false)
                                    setMobileSubmenuOpen(false)
                                  }}
                                  className="text-sm text-neutral-400 hover:text-white px-4 py-1.5 rounded-full hover:bg-gray-800 transition-colors text-center"
                                >
                                  {child.name}
                                </Link>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <Link
                          key={item.path}
                          href={item.path}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`
                            transition-all hover:text-neutral-800 dark:hover:text-neutral-200
                            hover:bg-gray-50 dark:hover:bg-gray-800 px-6 py-2.5 text-base text-center rounded-full
                            transform transition-all duration-300 inline-flex justify-center
                            ${mobileMenuOpen ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'}
                          `}
                          style={{ transitionDelay: mobileMenuOpen ? `${index * 50}ms` : '0ms' }}
                        >
                          {item.name}
                        </Link>
                      )
                    )}
                  </div>

                  {/* Equal bottom spacer */}
                  <div className="h-6" />
                </div>
              </nav>
            </div>
          </div>
        </div>
      </aside>
    </div>
  )
}
