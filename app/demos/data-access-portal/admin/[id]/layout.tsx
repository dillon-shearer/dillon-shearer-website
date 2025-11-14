import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Review Request | DWD',
  description:
    'Inspect intake details, edit dataset scopes, and finalize approvals or denials for this data access request.',
};

export default function AdminRequestLayout({ children }: { children: ReactNode }) {
  return children;
}
