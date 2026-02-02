'use client'

import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import MagneticButton from './magnetic-button'

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
]

const socialLinks = [
  {
    href: 'https://github.com/dillon-shearer',
    label: 'GitHub',
    icon: GitHubIcon
  },
  {
    href: 'https://www.linkedin.com/in/dillonshearer/',
    label: 'LinkedIn',
    icon: LinkedInIcon
  },
  {
    href: 'mailto:contact@dillonshearer.com',
    label: 'Email',
    icon: MailIcon
  },
]

// Simple className utility
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

// Hook for scroll behavior
function useScrollDirection() {
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(null)
  const [isAtTop, setIsAtTop] = useState(true)
  const lastScrollY = useRef(0)
  const ticking = useRef(false)

  useEffect(() => {
    const updateScrollDirection = () => {
      const scrollY = window.scrollY

      if (scrollY < 10) {
        setIsAtTop(true)
        setScrollDirection(null)
      } else {
        setIsAtTop(false)
        if (Math.abs(scrollY - lastScrollY.current) < 10) {
          ticking.current = false
          return
        }
        setScrollDirection(scrollY > lastScrollY.current ? 'down' : 'up')
      }

      lastScrollY.current = scrollY
      ticking.current = false
    }

    const onScroll = () => {
      if (!ticking.current) {
        window.requestAnimationFrame(updateScrollDirection)
        ticking.current = true
      }
    }

    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return { scrollDirection, isAtTop }
}

// Icon Components
function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  )
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
    </svg>
  )
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  )
}

function MailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  )
}

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileSubmenuOpen, setMobileSubmenuOpen] = useState<string | null>(null)
  const dropdownTimeout = useRef<NodeJS.Timeout | null>(null)
  const [desktopDropdownOpen, setDesktopDropdownOpen] = useState(false)
  const pathname = usePathname()
  const { scrollDirection, isAtTop } = useScrollDirection()

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [mobileMenuOpen])

  // Close mobile menu on ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false)
        setMobileSubmenuOpen(null)
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [mobileMenuOpen])

  function handleDropdownEnter() {
    if (dropdownTimeout.current) clearTimeout(dropdownTimeout.current)
    setDesktopDropdownOpen(true)
  }

  function handleDropdownLeave() {
    dropdownTimeout.current = setTimeout(() => setDesktopDropdownOpen(false), 150)
  }

  const headerVisible = isAtTop || scrollDirection === 'up' || mobileMenuOpen

  return (
    <>
      {/* Desktop & Mobile Header */}
      <header
        className={cn(
          'fixed top-0 left-0 right-0 z-40 w-full backdrop-blur-xl bg-black/90 border-b border-white/10',
          'transition-transform duration-300 ease-in-out',
          headerVisible ? 'translate-y-0' : '-translate-y-full'
        )}
      >
        {/* Subtle top accent line */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#54b3d6]/40 to-transparent" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5">
          <div className="flex items-center justify-between">
            {/* Logo/Brand */}
            <Link href="/" className="flex items-center gap-2.5 group relative z-50">
              <div className="font-mono text-lg sm:text-xl font-bold tracking-wide text-[#54b3d6] transition-all duration-300 group-hover:tracking-wider">
                DWD
              </div>
              <div className="hidden sm:block text-xs text-white/30 font-light tracking-wide">
                | Data With Dillon
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-0.5">
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
                      className={cn(
                        'relative px-3.5 py-2 text-sm font-medium transition-all duration-200 flex items-center gap-1',
                        'hover:text-[#54b3d6] group',
                        pathname === item.path || item.children.some(child => pathname === child.path)
                          ? 'text-white'
                          : 'text-white/60'
                      )}
                    >
                      {item.name}
                      <ChevronDownIcon className={cn(
                        'w-3 h-3 transition-transform duration-200',
                        desktopDropdownOpen && 'rotate-180'
                      )} />

                      {/* Active page indicator */}
                      {(pathname === item.path || item.children.some(child => pathname === child.path)) && (
                        <span className="absolute bottom-0 left-0 right-0 h-[1px] bg-[#54b3d6]" />
                      )}

                      {/* Hover background effect */}
                      <span className="absolute inset-0 rounded-md bg-white/[0.03] scale-95 opacity-0 transition-all duration-200 group-hover:scale-100 group-hover:opacity-100 -z-10" />
                    </Link>

                    {/* Enhanced Dropdown */}
                    <div
                      className={cn(
                        'absolute top-full left-1/2 -translate-x-1/2 mt-1.5 w-44',
                        'rounded-lg border border-white/10 bg-black/95 backdrop-blur-xl',
                        'shadow-[0_8px_32px_rgba(0,0,0,0.5)]',
                        'transition-all duration-200',
                        desktopDropdownOpen
                          ? 'opacity-100 translate-y-0 pointer-events-auto'
                          : 'opacity-0 -translate-y-1 pointer-events-none'
                      )}
                    >
                      <div className="p-1.5 space-y-0.5">
                        {item.children.map((child) => (
                          <Link
                            key={child.path}
                            href={child.path}
                            className="block px-3 py-2 text-sm text-white/60 hover:text-white hover:bg-white/[0.05] rounded-md transition-all"
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
                    className={cn(
                      'relative px-3.5 py-2 text-sm font-medium transition-all duration-200 group',
                      'hover:text-[#54b3d6]',
                      pathname === item.path ? 'text-white' : 'text-white/60'
                    )}
                  >
                    {item.name}

                    {/* Active page indicator */}
                    {pathname === item.path && (
                      <span className="absolute bottom-0 left-0 right-0 h-[1px] bg-[#54b3d6]" />
                    )}

                    {/* Hover background effect */}
                    <span className="absolute inset-0 rounded-md bg-white/[0.03] scale-95 opacity-0 transition-all duration-200 group-hover:scale-100 group-hover:opacity-100 -z-10" />
                  </Link>
                )
              )}
            </nav>

            {/* Desktop CTA Button */}
            <div className="hidden md:block">
              <MagneticButton
                href="/contact"
                className="px-4 py-1.5 rounded-md bg-[#54b3d6]/10 border border-[#54b3d6]/20 text-[#54b3d6] font-medium text-sm hover:bg-[#54b3d6]/20 hover:border-[#54b3d6]/40 transition-all"
              >
                Contact
              </MagneticButton>
            </div>

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="relative w-10 h-10 md:hidden group z-50"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
            >
              <div className="relative w-5 h-5 mx-auto">
                <span
                  className={cn(
                    'absolute left-0 w-full h-[2px] transition-all duration-300 rounded-full',
                    mobileMenuOpen
                      ? 'top-1/2 -translate-y-1/2 rotate-45 bg-[#54b3d6]'
                      : 'top-[15%] bg-white/80'
                  )}
                />
                <span
                  className={cn(
                    'absolute left-0 top-1/2 -translate-y-1/2 w-full h-[2px] bg-white/80 transition-all duration-300 rounded-full',
                    mobileMenuOpen && 'opacity-0 scale-0'
                  )}
                />
                <span
                  className={cn(
                    'absolute left-0 w-full h-[2px] transition-all duration-300 rounded-full',
                    mobileMenuOpen
                      ? 'top-1/2 -translate-y-1/2 -rotate-45 bg-[#54b3d6]'
                      : 'top-[85%] bg-white/80'
                  )}
                />
              </div>
              {/* Hover effect */}
              <div className="absolute inset-0 rounded-full bg-white/[0.05] scale-0 group-hover:scale-100 transition-transform duration-200" />
            </button>
          </div>
        </div>
      </header>

      {/* Full-Screen Mobile Overlay Menu */}
      <div
        className={cn(
          'fixed inset-0 z-30 bg-black/98 backdrop-blur-2xl transition-all duration-300 md:hidden',
          mobileMenuOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        )}
        aria-hidden={!mobileMenuOpen}
        onClick={() => {
          setMobileMenuOpen(false)
          setMobileSubmenuOpen(null)
        }}
      >
        {/* Subtle grid background pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(84,179,214,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(84,179,214,0.02)_1px,transparent_1px)] bg-[size:40px_40px]" />

        {/* Radial gradient overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.3)_100%)]" />

        {/* Close Button - Top Right */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            setMobileMenuOpen(false)
            setMobileSubmenuOpen(null)
          }}
          className={cn(
            'absolute top-4 right-4 w-12 h-12 flex items-center justify-center rounded-full',
            'bg-white/5 border border-white/10 text-white/60 hover:text-[#54b3d6] hover:bg-white/10 hover:border-[#54b3d6]/30',
            'transition-all duration-300 group z-50',
            mobileMenuOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
          )}
          style={{ transitionDelay: mobileMenuOpen ? '200ms' : '0ms' }}
          aria-label="Close menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div
          className="relative h-full flex flex-col items-center justify-center px-6"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Navigation Items with Staggered Animation */}
          <nav className="space-y-2 w-full max-w-xs" role="navigation">
            {navItems.map((item, index) =>
              item.children ? (
                <div key={item.path} className="space-y-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setMobileSubmenuOpen(mobileSubmenuOpen === item.name ? null : item.name)
                    }}
                    className={cn(
                      'w-full flex items-center justify-between px-5 py-3.5 text-base font-medium text-white/60 hover:text-[#54b3d6] hover:bg-white/[0.03] rounded-lg transition-all border border-white/[0.05] hover:border-white/10',
                      'transform transition-all duration-400',
                      mobileMenuOpen
                        ? 'translate-x-0 opacity-100'
                        : 'translate-x-8 opacity-0',
                      mobileSubmenuOpen === item.name && 'bg-white/[0.03] border-white/10'
                    )}
                    style={{ transitionDelay: `${index * 60 + 100}ms` }}
                    aria-expanded={mobileSubmenuOpen === item.name}
                  >
                    {item.name}
                    <ChevronDownIcon
                      className={cn(
                        'w-4 h-4 transition-transform duration-200',
                        mobileSubmenuOpen === item.name && 'rotate-180 text-[#54b3d6]'
                      )}
                    />
                  </button>

                  {/* Submenu accordion */}
                  <div
                    className={cn(
                      'overflow-hidden transition-all duration-200 pl-3 space-y-1',
                      mobileSubmenuOpen === item.name ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                    )}
                  >
                    {item.children.map((child) => (
                      <Link
                        key={child.path}
                        href={child.path}
                        onClick={() => {
                          setMobileMenuOpen(false)
                          setMobileSubmenuOpen(null)
                        }}
                        className="block px-5 py-2.5 text-sm text-white/50 hover:text-white hover:bg-white/[0.03] rounded-md transition-all"
                      >
                        {child.name}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <div
                  key={item.path}
                  className={cn(
                    'transform transition-all duration-400',
                    mobileMenuOpen
                      ? 'translate-x-0 opacity-100'
                      : 'translate-x-8 opacity-0'
                  )}
                  style={{ transitionDelay: `${index * 60 + 100}ms` }}
                >
                  <Link
                    href={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-5 py-3.5 text-base font-medium text-white/60 hover:text-[#54b3d6] hover:bg-white/[0.03] rounded-lg transition-all border border-white/[0.05] hover:border-white/10"
                  >
                    {item.name}
                  </Link>
                </div>
              )
            )}
          </nav>

          {/* Social Icons at Bottom */}
          <div className="mt-10 flex gap-3">
            {socialLinks.map((link, index) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  'w-11 h-11 flex items-center justify-center rounded-full border border-white/10 bg-white/[0.02] text-white/50 hover:text-[#54b3d6] hover:border-[#54b3d6]/40 hover:bg-[#54b3d6]/10 transition-all',
                  'transform transition-all duration-400',
                  mobileMenuOpen
                    ? 'scale-100 opacity-100'
                    : 'scale-50 opacity-0'
                )}
                style={{ transitionDelay: `${(navItems.length + index) * 60 + 100}ms` }}
                aria-label={link.label}
              >
                <link.icon className="w-4.5 h-4.5" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
