'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Clock, Edit3 } from 'lucide-react';
import { TemplateCard } from './TemplateCard';

const CATEGORY_CONFIG = {
  account: { color: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800' },
  billing: { color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' },
  orders: { color: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800' },
  support: { color: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800' },
  security: { color: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800' },
  marketing: { color: 'bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-200 dark:border-pink-800' },
  notifications: { color: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800' },
  general: { color: 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-800' },
};

function formatRelativeDate(dateStr) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function TemplateListRow({ template, onDuplicate, onDelete, inferType }) {
  const router = useRouter();
  const templateType = inferType ? inferType(template) : 'General Template';
  const catConfig = CATEGORY_CONFIG[template.category] || CATEGORY_CONFIG.general;
  const isActive = template.status !== 'inactive';
  const lastModified = formatRelativeDate(template.updatedAt);

  return (
    <div
      className="group flex items-center gap-4 px-4 py-3 rounded-lg border border-border bg-card hover:border-foreground/20 hover:shadow-sm transition-all cursor-pointer"
      onClick={() => router.push(`/admin/email-builder/${template.id}`)}
    >
      {/* Status dot */}
      <div className={`h-2 w-2 rounded-full shrink-0 ${isActive ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`} />

      {/* Name & subject */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium text-foreground truncate">{template.displayName}</h3>
        <p className="text-xs text-muted-foreground truncate">{template.subject || 'No subject line'}</p>
      </div>

      {/* Badges */}
      <div className="hidden sm:flex items-center gap-1.5">
        <Badge variant="outline" className={`text-[10px] px-2 py-0 border ${catConfig.color}`}>
          {template.category}
        </Badge>
        <Badge variant="outline" className="text-[10px] px-2 py-0 bg-foreground/5">
          {templateType}
        </Badge>
        {template.isSystem && (
          <Badge variant="secondary" className="text-[10px] px-2 py-0">System</Badge>
        )}
      </div>

      {/* Version */}
      {template.version && (
        <span className="hidden md:block text-[10px] text-muted-foreground/50 font-mono w-8 text-right">
          v{template.version}
        </span>
      )}

      {/* Last modified */}
      {lastModified && (
        <div className="hidden md:flex items-center gap-1 text-[11px] text-muted-foreground/60 w-20 justify-end">
          <Clock className="h-3 w-3" />
          {lastModified}
        </div>
      )}

      {/* Edit button on hover */}
      <Button
        size="sm"
        variant="ghost"
        className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        onClick={(e) => { e.stopPropagation(); router.push(`/admin/email-builder/${template.id}`); }}
      >
        <Edit3 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export function TemplateSection({
  title,
  description,
  templates,
  onDuplicate,
  onDelete,
  inferType,
  isStarters = false,
  viewMode = 'grid',
}) {
  if (templates.length === 0) return null;

  return (
    <section className="space-y-4">
      {/* Section Header */}
      <div className="flex items-end justify-between">
        <div className="space-y-0.5">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <span className="text-xs text-muted-foreground/60 font-medium">
          {templates.length} template{templates.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Grid or List view */}
      {viewMode === 'list' && !isStarters ? (
        <div className="space-y-2">
          {templates.map(tpl => (
            <TemplateListRow
              key={tpl.id}
              template={tpl}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
              inferType={inferType}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {isStarters ? (
            templates.map(tpl => (
              <Link key={tpl.id} href={`/admin/email-builder/new?template=${tpl.id}`}>
                <div className="group relative rounded-xl border border-border bg-card overflow-hidden hover:shadow-lg hover:border-foreground/20 transition-all duration-200 cursor-pointer h-full">
                  <div className="h-44 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-zinc-800 dark:to-zinc-900 flex flex-col items-center justify-center gap-3 p-6">
                    <div className="text-5xl group-hover:scale-110 transition-transform duration-200">{tpl.icon}</div>
                  </div>
                  <div className="p-4 space-y-3">
                    <div>
                      <h3 className="font-semibold text-sm text-foreground">{tpl.displayName}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{tpl.description}</p>
                    </div>
                    <Button size="sm" variant="outline" className="w-full group-hover:bg-foreground group-hover:text-background transition-colors">
                      <Plus className="h-3.5 w-3.5 mr-1.5" />
                      Use Template
                    </Button>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            templates.map(tpl => (
              <TemplateCard
                key={tpl.id}
                template={tpl}
                onDuplicate={onDuplicate}
                onDelete={onDelete}
                inferType={inferType}
              />
            ))
          )}
        </div>
      )}
    </section>
  );
}
