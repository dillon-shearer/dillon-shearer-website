import { Metadata } from 'next'
import DillonsDataCleanerClient from './client'

export const metadata: Metadata = {
  title: "Dillon's Data Cleaner | DWD",
  description: 'Drop in CSV or XLSX files and standardize null values plus column headers before the data hits your warehouse or notebook.',
  openGraph: {
    title: "Dillon's Data Cleaner | Data With Dillon",
    description:
      'Upload spreadsheet files, normalize nulls, adjust headers, and download a clean version—everything runs locally in your browser.',
    type: 'website',
  },
}

export default function DillonsDataCleanerPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="border-b border-black bg-black">
        <div className="max-w-4xl mx-auto px-6 py-14 text-center lg:py-16">
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Demo — Data ergonomics</p>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Dillon's Data Cleaner
          </h1>
          <p className="mt-4 text-base text-white/80 sm:text-lg">
            Drop in CSV or XLSX files, normalize null-like cells, and fix column headers before data ever
            reaches your warehouse or notebook.
          </p>
          <p className="mt-2 text-sm text-white/70">
            Everything runs locally in your browser—perfect for quick sanity checks before the data hits a warehouse or notebook.
          </p>
        </div>
      </div>

      <div className="bg-black pb-12 pt-4">
        <div className="mx-auto max-w-7xl px-4 sm:px-8 lg:px-12">
          <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6 sm:p-8">
            <DillonsDataCleanerClient />
          </div>
        </div>
      </div>
    </div>
  )
}
