'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LayoutTemplate, Plus, ArrowRight, Mail } from 'lucide-react';

const SUGGESTIONS = [
  {
    icon: '👋',
    title: 'Welcome Email',
    description: 'Great for onboarding new users',
    templateId: 'welcome-email',
  },
  {
    icon: '🔐',
    title: 'Password Reset',
    description: 'Help users recover their account',
    templateId: 'password-reset',
  },
  {
    icon: '✅',
    title: 'Confirmation Email',
    description: 'Confirm important user actions',
    templateId: 'order-confirmation',
  },
  {
    icon: '💰',
    title: 'Invoice',
    description: 'Send billing and payment details',
    templateId: null,
  },
];

export function EmptyState({ hasFilters, onCreateNew }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      {/* Icon */}
      <div className="relative mb-6">
        <div className="rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 p-6">
          <LayoutTemplate className="h-10 w-10 text-blue-500/60" />
        </div>
        <div className="absolute -bottom-1 -right-1 rounded-full bg-background border-2 border-background">
          <div className="rounded-full bg-muted p-1.5">
            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* Message */}
      <div className="text-center mb-8 max-w-md space-y-2">
        <h2 className="text-2xl font-bold text-foreground tracking-tight">
          {hasFilters ? 'No templates found' : 'No templates yet'}
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {hasFilters
            ? 'Try adjusting your search or filters to find what you need.'
            : 'Create your first email template to get started. Choose from a starter template or build from scratch.'}
        </p>
      </div>

      {/* Action Buttons */}
      {!hasFilters && (
        <div className="flex gap-3 mb-10">
          <Link href="/admin/email-builder/new">
            <Button size="lg" className="gap-2 shadow-sm">
              <Plus className="h-4 w-4" />
              Create Template
            </Button>
          </Link>
        </div>
      )}

      {/* Suggestions */}
      {!hasFilters && (
        <div className="w-full max-w-2xl space-y-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">
            Or start with a template
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SUGGESTIONS.map((item, idx) => (
              <Link
                key={idx}
                href={item.templateId ? `/admin/email-builder/new?template=${item.templateId}` : '/admin/email-builder/new'}
              >
                <div className="group rounded-xl border border-border bg-card p-5 hover:border-foreground/20 hover:shadow-md transition-all duration-200 cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="text-3xl shrink-0 group-hover:scale-110 transition-transform duration-200">{item.icon}</div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm text-foreground">{item.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
