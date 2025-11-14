import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'API Key Room | DWD',
  description:
    'Unlock the approved gym datasets by entering the scoped API key you received from the admin flow.',
};

export default function DataDownloadLayout({ children }: { children: ReactNode }) {
  return children;
}
