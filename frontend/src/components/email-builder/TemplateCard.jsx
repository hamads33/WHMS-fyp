'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { Edit3, Copy, Trash2, Loader2, MoreVertical, Clock } from 'lucide-react';

const CATEGORY_CONFIG = {
  account: { label: 'Account', color: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800' },
  billing: { label: 'Billing', color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' },
  orders: { label: 'Orders', color: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800' },
  support: { label: 'Support', color: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800' },
  security: { label: 'Security', color: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800' },
  marketing: { label: 'Marketing', color: 'bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-200 dark:border-pink-800' },
  notifications: { label: 'Notifications', color: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800' },
  general: { label: 'General', color: 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-800' },
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
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function EmailPreview({ category }) {
  const accentColors = {
    account: '#3b82f6',
    billing: '#10b981',
    orders: '#f59e0b',
    support: '#a855f7',
    security: '#ef4444',
    marketing: '#ec4899',
    notifications: '#06b6d4',
    general: '#6b7280',
  };
  const accent = accentColors[category] || accentColors.general;

  return (
    <div className="h-44 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-zinc-800 dark:to-zinc-900 flex flex-col justify-between overflow-hidden p-5 relative">
      {/* Accent bar */}
      <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: accent }} />

      {/* Simulated email header */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full" style={{ backgroundColor: `${accent}30` }}>
            <div className="h-full w-full rounded-full flex items-center justify-center">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: `${accent}60` }} />
            </div>
          </div>
          <div className="space-y-1 flex-1">
            <div className="h-2.5 bg-slate-300 dark:bg-zinc-600 rounded w-24" />
            <div className="h-2 bg-slate-200 dark:bg-zinc-700 rounded w-16" />
          </div>
        </div>
        {/* Subject line */}
        <div className="space-y-1.5 pl-9">
          <div className="h-3 bg-slate-400/70 dark:bg-zinc-500 rounded w-3/4" />
          <div className="h-2.5 bg-slate-300 dark:bg-zinc-600 rounded w-1/2" />
        </div>
      </div>

      {/* Simulated email body */}
      <div className="space-y-1.5 pl-9">
        <div className="h-2 bg-slate-200 dark:bg-zinc-700 rounded w-full" />
        <div className="h-2 bg-slate-200 dark:bg-zinc-700 rounded w-5/6" />
        <div className="h-2 bg-slate-200 dark:bg-zinc-700 rounded w-3/4" />
      </div>

      {/* Button preview */}
      <div className="pl-9">
        <div className="h-6 w-20 rounded" style={{ backgroundColor: `${accent}25`, border: `1px solid ${accent}40` }} />
      </div>
    </div>
  );
}

export function TemplateCard({ template, onDuplicate, onDelete, inferType }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [duplicating, setDuplicating] = useState(false);

  const templateType = inferType ? inferType(template) : 'General Template';
  const catConfig = CATEGORY_CONFIG[template.category] || CATEGORY_CONFIG.general;
  const isActive = template.status !== 'inactive';
  const lastModified = formatRelativeDate(template.updatedAt);

  const handleEdit = (e) => {
    e.stopPropagation();
    router.push(`/admin/email-builder/${template.id}`);
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!confirm(`Delete "${template.displayName}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await onDelete(template.id);
    } finally {
      setDeleting(false);
    }
  };

  const handleDuplicate = async (e) => {
    e.stopPropagation();
    setDuplicating(true);
    try {
      await onDuplicate(template.id);
    } finally {
      setDuplicating(false);
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className="group relative rounded-xl border border-border bg-card overflow-hidden hover:shadow-lg hover:border-foreground/20 transition-all duration-200 cursor-pointer flex flex-col h-full"
        onClick={handleEdit}
      >
        {/* Email Preview */}
        <EmailPreview category={template.category} />

        {/* Content */}
        <div className="flex-1 flex flex-col p-4 space-y-3">
          {/* Title row */}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-sm text-foreground truncate flex-1">{template.displayName}</h3>
              {/* Status dot */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${isActive ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {isActive ? 'Active' : 'Inactive'}
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{template.subject || 'No subject line'}</p>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-1.5 items-center">
            <Badge variant="outline" className={`text-[10px] font-medium px-2 py-0 border ${catConfig.color}`}>
              {catConfig.label}
            </Badge>
            <Badge variant="outline" className="text-[10px] font-medium px-2 py-0 bg-foreground/5">
              {templateType}
            </Badge>
            {template.isSystem && (
              <Badge variant="secondary" className="text-[10px] px-2 py-0">System</Badge>
            )}
          </div>

          {/* Footer: timestamp + version */}
          <div className="flex items-center justify-between pt-1 border-t border-border/50">
            {lastModified && (
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground/70">
                <Clock className="h-3 w-3" />
                {lastModified}
              </div>
            )}
            {template.version && (
              <div className="text-[10px] text-muted-foreground/50 font-mono">
                v{template.version}
              </div>
            )}
          </div>
        </div>

        {/* Hover Actions - cleaner overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex flex-col items-center justify-center gap-2">
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="secondary" className="h-9 w-9 p-0" onClick={handleEdit}>
                  <Edit3 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">Edit</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="secondary" className="h-9 w-9 p-0" onClick={handleDuplicate} disabled={duplicating}>
                  {duplicating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">Duplicate</TooltipContent>
            </Tooltip>

            {!template.isSystem && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="destructive" className="h-9 w-9 p-0" onClick={handleDelete} disabled={deleting}>
                    {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">Delete</TooltipContent>
              </Tooltip>
            )}
          </div>
          <span className="text-xs text-white/70 font-medium">Click to edit</span>
        </div>

        {/* Touch dropdown fallback */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity lg:hidden z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-7 w-7 bg-white/90 hover:bg-white dark:bg-zinc-800/90 dark:hover:bg-zinc-800">
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem className="text-xs gap-2 cursor-pointer" onClick={handleEdit}>
                <Edit3 className="h-3.5 w-3.5" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem className="text-xs gap-2 cursor-pointer" onClick={handleDuplicate} disabled={duplicating}>
                {duplicating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
                Duplicate
              </DropdownMenuItem>
              {!template.isSystem && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-xs gap-2 text-destructive focus:text-destructive cursor-pointer"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </TooltipProvider>
  );
}
