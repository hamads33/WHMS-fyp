'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Search, X, ArrowUpDown, LayoutGrid, List, Check } from 'lucide-react';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'name-asc', label: 'Name A-Z' },
  { value: 'name-desc', label: 'Name Z-A' },
  { value: 'recently-modified', label: 'Recently modified' },
];

export function QuickActionsBar({
  search,
  onSearchChange,
  category,
  onCategoryChange,
  categories,
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
}) {
  const hasActiveFilters = search || category;
  const currentSort = SORT_OPTIONS.find(s => s.value === sortBy) || SORT_OPTIONS[0];

  return (
    <div className="flex-none border-b border-border bg-muted/30 px-6 py-3">
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-9 pl-9 pr-8 text-sm rounded-lg border-border bg-background focus:bg-background transition-colors"
          />
          {search && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => onCategoryChange('')}
            className={`h-8 px-3 rounded-full text-xs font-medium transition-all ${
              category === ''
                ? 'bg-foreground text-background shadow-sm'
                : 'bg-background border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
            }`}
          >
            All
          </button>
          {categories.map(c => (
            <button
              key={c}
              onClick={() => onCategoryChange(category === c ? '' : c)}
              className={`h-8 px-3 rounded-full text-xs font-medium capitalize transition-all ${
                category === c
                  ? 'bg-foreground text-background shadow-sm'
                  : 'bg-background border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Sort */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
              <ArrowUpDown className="h-3.5 w-3.5" />
              {currentSort.label}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="text-xs">Sort by</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {SORT_OPTIONS.map(opt => (
              <DropdownMenuItem
                key={opt.value}
                className="text-xs gap-2 cursor-pointer"
                onClick={() => onSortChange(opt.value)}
              >
                <Check className={`h-3.5 w-3.5 ${sortBy === opt.value ? 'opacity-100' : 'opacity-0'}`} />
                {opt.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* View Toggle */}
        <div className="flex bg-muted rounded-lg p-0.5">
          <button
            onClick={() => onViewModeChange('grid')}
            className={`p-1.5 rounded-md transition-all ${
              viewMode === 'grid'
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => onViewModeChange('list')}
            className={`p-1.5 rounded-md transition-all ${
              viewMode === 'list'
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={() => {
              onSearchChange('');
              onCategoryChange('');
            }}
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
