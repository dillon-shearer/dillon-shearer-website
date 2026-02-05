'use client'

import Link from 'next/link'
import { useScrollReveal } from './hooks/useScrollReveal'

// Simple className utility
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

// Icon Components
function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
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

function RSSIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7m-6 0a1 1 0 11-2 0 1 1 0 012 0z" />
    </svg>
  )
}

const navigationLinks = [
  { path: '/', name: 'Home' },
  { path: '/about', name: 'About' },
  { path: '/demos', name: 'Demos' },
  { path: '/blog', name: 'Blog' },
  { path: '/contact', name: 'Contact' },
]

const resourceLinks = [
  { path: '/resumes', name: 'Resumes' },
  { path: '/jupyter', name: 'Notebooks' },
  { path: '/analytics', name: 'Analytics' },
  { path: '/certifications', name: 'Certifications' },
  { path: '/rss', name: 'RSS Feed' },
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

export default function Footer() {
  const { ref, isVisible } = useScrollReveal()

  return (
    <footer
      ref={ref}
      className={cn('mt-20 border-t reveal-on-scroll', isVisible && 'is-visible')}
      style={{ borderColor: 'var(--border-primary)' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        {/* 4-Column Grid - Centered on mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10 mb-8">
          {/* Column 1: Brand */}
          <div className="space-y-3.5 text-center sm:text-left">
            <div className="font-mono text-lg font-bold tracking-wide" style={{ color: 'var(--brand-cyan)' }}>DWD</div>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Data-centric software engineer building analytics, pipelines, and AI tooling.
            </p>
          </div>

          {/* Column 2: Navigation */}
          <div className="space-y-3.5 text-center sm:text-left">
            <h3 className="text-label" style={{ color: 'var(--text-secondary)' }}>
              Navigate
            </h3>
            <ul className="space-y-2.5">
              {navigationLinks.map((link) => (
                <li key={link.path}>
                  <Link
                    href={link.path}
                    className="text-sm transition-colors inline-block hover:text-[--brand-cyan]"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Resources */}
          <div className="space-y-3.5 text-center sm:text-left">
            <h3 className="text-label" style={{ color: 'var(--text-secondary)' }}>
              Resources
            </h3>
            <ul className="space-y-2.5">
              {resourceLinks.map((link) => (
                <li key={link.path}>
                  <Link
                    href={link.path}
                    className="text-sm transition-colors inline-block hover:text-[--brand-cyan]"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Connect */}
          <div className="space-y-3.5 text-center sm:text-left">
            <h3 className="text-label" style={{ color: 'var(--text-secondary)' }}>
              Connect
            </h3>
            <div className="space-y-2.5 flex flex-col items-center sm:items-start">
              {socialLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm transition-colors group hover:text-[--brand-cyan]"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <link.icon className="w-4 h-4 flex-shrink-0" />
                  <span>{link.label}</span>
                  <ExternalLinkIcon className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Gradient Divider */}
        <div className="divider mb-6" />

        {/* Bottom Bar - Centered on mobile */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 text-sm text-center sm:text-left" style={{ color: 'var(--text-muted)' }}>
          <p className="text-xs">© {new Date().getFullYear()} Dillon Shearer. MIT Licensed.</p>
          <div className="flex items-center gap-4 text-xs flex-wrap justify-center">
            <a
              href="https://github.com/dillon-shearer/dillon-shearer-website"
              target="_blank"
              rel="noopener noreferrer"
              className="link-primary"
            >
              View Source
            </a>
            <span style={{ color: 'var(--border-primary)' }}>•</span>
            <span className="font-mono">Built with Next.js</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
