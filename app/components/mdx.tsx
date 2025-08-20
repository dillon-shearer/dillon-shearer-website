import Link from 'next/link'
import Image from 'next/image'
import { MDXRemote } from 'next-mdx-remote/rsc'
import React from 'react'

// Add proper types
type TableData = {
  headers: string[]
  rows: string[][]
}

function Table({ data }: { data: TableData }) {
  let headers = data.headers.map((header, index) => (
    <th key={index}>{header}</th>
  ))
  let rows = data.rows.map((row, index) => (
    <tr key={index}>
      {row.map((cell, cellIndex) => (
        <td key={cellIndex}>{cell}</td>
      ))}
    </tr>
  ))

  return (
    <table>
      <thead>
        <tr>{headers}</tr>
      </thead>
      <tbody>{rows}</tbody>
    </table>
  )
}

// Add proper types for CustomLink
type CustomLinkProps = {
  href: string
  children: React.ReactNode
  [key: string]: any
}

function CustomLink({ href, children, ...props }: CustomLinkProps) {
  if (href.startsWith('/')) {
    return (
      <Link href={href} {...props}>
        {children}
      </Link>
    )
  }

  if (href.startsWith('#')) {
    return <a href={href} {...props}>{children}</a>
  }

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
      {children}
    </a>
  )
}

// Add proper types for RoundedImage
type RoundedImageProps = {
  alt: string
  src: string
  width?: number
  height?: number
}

function RoundedImage({ alt, src, width, height }: RoundedImageProps) {
  return <Image alt={alt} src={src} width={width || 500} height={height || 300} className="rounded-lg" />
}

// Add proper types for Callout
type CalloutProps = {
  emoji: string
  children: React.ReactNode
}

function Callout({ emoji, children }: CalloutProps) {
  return (
    <div className="px-4 py-3 border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 rounded p-1 text-sm flex items-center text-neutral-900 dark:text-neutral-100 mb-8">
      <div className="flex items-center w-4 mr-4">{emoji}</div>
      <div className="w-full callout">{children}</div>
    </div>
  )
}

// Add proper types for ProsCard
type ProsCardProps = {
  title: string
  pros: string[]
}

function ProsCard({ title, pros }: ProsCardProps) {
  return (
    <div className="border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-900/20 rounded p-6 my-4 w-full">
      <span>{`You might use ${title} if...`}</span>
      <div className="mt-4">
        {pros.map((pro) => (
          <div key={pro} className="flex font-medium items-baseline mb-2">
            <div className="h-4 w-4 mr-2">
              <svg className="h-4 w-4 text-emerald-500" viewBox="0 0 24 24">
                <g
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                  <path d="M22 4L12 14.01l-3-3" />
                </g>
              </svg>
            </div>
            <span>{pro}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Add proper types for ConsCard
type ConsCardProps = {
  title: string
  cons: string[]
}

function ConsCard({ title, cons }: ConsCardProps) {
  return (
    <div className="border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 rounded p-6 my-4 w-full">
      <span>{`You might not use ${title} if...`}</span>
      <div className="mt-4">
        {cons.map((con) => (
          <div key={con} className="flex font-medium items-baseline mb-2">
            <div className="h-4 w-4 mr-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4 text-red-500"
              >
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </div>
            <span>{con}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Fix the components object typing
let components = {
  h1: (props: React.HTMLAttributes<HTMLHeadingElement>) => <h1 className="title font-semibold text-2xl tracking-tighter" {...props} />,
  h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => <h2 className="font-semibold text-xl tracking-tighter" {...props} />,
  h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => <h3 className="font-semibold text-lg tracking-tighter" {...props} />,
  Image: RoundedImage,
  a: CustomLink,
  Callout,
  ProsCard,
  ConsCard,
  Table,
} as any // Add this to bypass strict typing

// Add proper types for CustomMDX
type CustomMDXProps = {
  source: string
  [key: string]: any
}

export function CustomMDX({ source, ...props }: CustomMDXProps) {
  return (
    <MDXRemote
      source={source}
      options={{
        mdxOptions: {
          remarkPlugins: [],
          rehypePlugins: [],
        },
      }}
      components={components}
      {...props}
    />
  )
}