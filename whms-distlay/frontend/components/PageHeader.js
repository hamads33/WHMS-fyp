'use client';

import { ChevronRight } from 'lucide-react';

export function PageHeader({ title, breadcrumbs, requestId }) {
  return (
    <div className="mb-6">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          {breadcrumbs.map((crumb, i) => (
            <div key={i} className="flex items-center gap-2">
              <span>{crumb}</span>
              {i < breadcrumbs.length - 1 && <ChevronRight className="h-4 w-4" />}
            </div>
          ))}
        </div>
      )}
      <h1 className="text-3xl font-bold text-foreground">{title}</h1>
      {requestId && (
        <p className="text-xs text-muted-foreground mt-2">Request ID: {requestId}</p>
      )}
    </div>
  );
}
