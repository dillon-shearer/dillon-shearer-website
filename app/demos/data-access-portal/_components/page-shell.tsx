'use client';

import type { ReactNode } from 'react';

type PortalPageShellProps = {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  maxWidthClassName?: string;
  children: ReactNode;
};

export function PortalPageShell({
  eyebrow,
  title,
  description,
  actions,
  maxWidthClassName = 'max-w-7xl',
  children,
}: PortalPageShellProps) {
  const containerClass = [
    'mx-auto flex w-full flex-col gap-10 px-6 py-16 sm:px-8 lg:px-10',
    maxWidthClassName,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="min-h-screen bg-black text-zinc-50">
      <div className={containerClass}>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl space-y-4">
            {eyebrow ? (
              <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">{eyebrow}</p>
            ) : null}
            <div>
              <h1 className="text-4xl font-semibold tracking-tight text-zinc-50 sm:text-5xl">
                {title}
              </h1>
              {description ? (
                <div className="mt-4 text-base leading-relaxed text-zinc-300">
                  {typeof description === 'string' ? <p>{description}</p> : description}
                </div>
              ) : null}
            </div>
          </div>
          {actions ? (
            <div className="flex flex-shrink-0 flex-col items-start gap-3 text-sm text-zinc-300 lg:items-end">
              {actions}
            </div>
          ) : null}
        </div>
        {children}
      </div>
    </div>
  );
}
