'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Plus, Mail, Loader2,
} from 'lucide-react';
import { EmailTemplatesAPI } from '@/lib/api/email-templates';
import { TemplateSection } from '@/components/email-builder/TemplateSection';
import { EmptyState } from '@/components/email-builder/EmptyState';
import { QuickActionsBar } from '@/components/email-builder/QuickActionsBar';

const STARTER_TEMPLATES = [
  {
    id: 'welcome-email',
    displayName: 'Welcome Email',
    description: 'Send a warm welcome to new users',
    icon: '👋',
    category: 'account',
    type: 'Welcome Email',
  },
  {
    id: 'password-reset',
    displayName: 'Password Reset',
    description: 'Secure password recovery email',
    icon: '🔐',
    category: 'security',
    type: 'Password Reset',
  },
  {
    id: 'order-confirmation',
    displayName: 'Order Confirmation',
    description: 'Confirm customer purchases',
    icon: '✅',
    category: 'orders',
    type: 'Order Confirmation',
  },
  {
    id: 'newsletter',
    displayName: 'Newsletter',
    description: 'Monthly product updates and news',
    icon: '📰',
    category: 'marketing',
    type: 'Newsletter',
  },
];

const TEMPLATE_TYPE_MAP = {
  welcome: 'Welcome Email',
  confirm: 'Confirmation',
  reset: 'Password Reset',
  invoice: 'Invoice',
  receipt: 'Receipt',
  notification: 'Notification',
  marketing: 'Campaign',
  newsletter: 'Newsletter',
  promotion: 'Promotion',
};

function inferTemplateType(template) {
  const nameLower = template.displayName?.toLowerCase() || '';
  const subjectLower = (template.subject || '').toLowerCase();
  const searchStr = `${nameLower} ${subjectLower}`;

  for (const [key, label] of Object.entries(TEMPLATE_TYPE_MAP)) {
    if (searchStr.includes(key)) return label;
  }

  return 'General Template';
}

function sortTemplates(templates, sortBy) {
  const sorted = [...templates];
  switch (sortBy) {
    case 'newest':
      return sorted.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    case 'oldest':
      return sorted.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    case 'name-asc':
      return sorted.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));
    case 'name-desc':
      return sorted.sort((a, b) => (b.displayName || '').localeCompare(a.displayName || ''));
    case 'recently-modified':
      return sorted.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
    default:
      return sorted;
  }
}

export default function EmailBuilderListPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('grid');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (category) params.category = category;
      const res = await EmailTemplatesAPI.list(params);
      setTemplates(res.templates || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, category]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDuplicate = async (id) => {
    await EmailTemplatesAPI.duplicate(id);
    load();
  };

  const handleDelete = async (id) => {
    await EmailTemplatesAPI.remove(id);
    load();
  };

  const systemTemplates = useMemo(
    () => sortTemplates(templates.filter(t => t.isSystem), sortBy),
    [templates, sortBy]
  );
  const userTemplates = useMemo(
    () => sortTemplates(templates.filter(t => !t.isSystem), sortBy),
    [templates, sortBy]
  );

  const categories = [...new Set(templates.map(t => t.category))].sort();
  const hasFilters = search || category;

  const filteredSystem = systemTemplates.filter(t =>
    (!search || t.displayName.toLowerCase().includes(search.toLowerCase()) || (t.subject || '').toLowerCase().includes(search.toLowerCase())) &&
    (!category || t.category === category)
  );
  const filteredUser = userTemplates.filter(t =>
    (!search || t.displayName.toLowerCase().includes(search.toLowerCase()) || (t.subject || '').toLowerCase().includes(search.toLowerCase())) &&
    (!category || t.category === category)
  );

  const totalFiltered = filteredSystem.length + filteredUser.length;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex-none border-b border-border bg-background px-6 py-5">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20">
              <Mail className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">Email Templates</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {templates.length} template{templates.length !== 1 ? 's' : ''}
                {hasFilters && totalFiltered !== templates.length && (
                  <span className="text-foreground font-medium"> &middot; {totalFiltered} shown</span>
                )}
              </p>
            </div>
          </div>

          {/* New Template */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="lg" className="gap-2 shadow-sm">
                <Plus className="h-4 w-4" />
                New Template
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem className="gap-3 cursor-pointer py-2.5" onClick={() => router.push('/admin/email-builder/new')}>
                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-sm">📄</div>
                <div>
                  <div className="font-medium text-sm">Blank Template</div>
                  <div className="text-xs text-muted-foreground">Start from scratch</div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {STARTER_TEMPLATES.map(tpl => (
                <DropdownMenuItem
                  key={tpl.id}
                  className="gap-3 cursor-pointer py-2.5"
                  onClick={() => router.push(`/admin/email-builder/new?template=${tpl.id}`)}
                >
                  <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-sm">{tpl.icon}</div>
                  <div>
                    <div className="font-medium text-sm">{tpl.displayName}</div>
                    <div className="text-xs text-muted-foreground">{tpl.description}</div>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Quick Actions Bar */}
      <QuickActionsBar
        search={search}
        onSearchChange={setSearch}
        category={category}
        onCategoryChange={setCategory}
        categories={categories}
        sortBy={sortBy}
        onSortChange={setSortBy}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Main Content */}
      <ScrollArea className="flex-1">
        <div className="px-6 py-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading templates...</p>
            </div>
          ) : filteredSystem.length === 0 && filteredUser.length === 0 ? (
            <EmptyState
              hasFilters={hasFilters}
              onCreateNew={() => router.push('/admin/email-builder/new')}
            />
          ) : (
            <div className="space-y-10">
              {/* System Templates */}
              {filteredSystem.length > 0 && (
                <TemplateSection
                  title="System Templates"
                  description="Default email templates maintained by your system"
                  templates={filteredSystem}
                  onDuplicate={handleDuplicate}
                  onDelete={handleDelete}
                  inferType={inferTemplateType}
                  viewMode={viewMode}
                />
              )}

              {/* User Templates */}
              {filteredUser.length > 0 && (
                <TemplateSection
                  title={hasFilters ? 'Results' : 'Your Templates'}
                  description={hasFilters ? `Found ${filteredUser.length} matching template${filteredUser.length !== 1 ? 's' : ''}` : 'Custom templates you have created'}
                  templates={filteredUser}
                  onDuplicate={handleDuplicate}
                  onDelete={handleDelete}
                  inferType={inferTemplateType}
                  viewMode={viewMode}
                />
              )}

              {/* Starter Templates */}
              {!hasFilters && userTemplates.length === 0 && systemTemplates.length === 0 && (
                <TemplateSection
                  title="Starter Templates"
                  description="Pre-built templates to help you get started"
                  templates={STARTER_TEMPLATES}
                  isStarters={true}
                  viewMode={viewMode}
                />
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
