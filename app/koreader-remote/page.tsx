import type { Metadata } from 'next'
import { SwipeShell } from './swipe-shell'

export const metadata: Metadata = {
  title: 'KOReader Remote | DWD',
  description:
    'Send KOReader page turns over local Wi-Fi from any browser. Configure your Kindle endpoint and tap Page Up or Page Down.',
  openGraph: {
    title: 'KOReader Remote | Data With Dillon',
    description:
      'Control KOReader page turns from your browser after configuring your Kindle IP & port.',
    type: 'website',
  },
}

export default function KoreaderRemotePage() {
  return <SwipeShell />
}
