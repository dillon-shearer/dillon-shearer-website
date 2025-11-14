import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Data Access Admin | DWD',
  description:
    'Monitor every data access request, filter by status, and make decisions in the admin console.',
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return children;
}
