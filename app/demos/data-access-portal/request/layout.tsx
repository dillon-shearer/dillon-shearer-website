import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Request Data Access | DWD',
  description:
    'Submit the Gym Dataset intake form with collaborators, project timeline, and requested scopes.',
};

export default function RequestLayout({ children }: { children: ReactNode }) {
  return children;
}
